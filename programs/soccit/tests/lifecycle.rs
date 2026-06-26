//! End-to-end lifecycle + money-invariant tests for the Soccit program, run on
//! LiteSVM (the Anchor 1.0 default test runner). Covers:
//!   create_match → place_prediction (xN) → resolve → settle_and_payout
//! plus the negative paths (non-resolver resolve/settle, double settle) and the
//! payout math (35/25/20 + remainder, undefined places roll into platform fee).

use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use anchor_lang::solana_program::instruction::Instruction;
use litesvm::LiteSVM;
use litesvm_token::{get_spl_account, spl_token::state::Account as TokenAccountState, CreateAssociatedTokenAccount, CreateMint, MintTo};
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use spl_associated_token_account::get_associated_token_address;

use anchor_lang::prelude::Pubkey;

const ENTRY_FEE: u64 = 10_000_000; // 10 USDT @ 6 decimals
const MATCH_ID: u64 = 42;

fn program_id() -> Pubkey {
    soccit::ID
}

fn match_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"match", &MATCH_ID.to_le_bytes()], &program_id())
}

fn vault_authority_pda(match_key: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"vault", match_key.as_ref()], &program_id())
}

fn pred_pda(match_key: &Pubkey, owner: &Pubkey, nonce: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"pred", match_key.as_ref(), owner.as_ref(), &nonce.to_le_bytes()],
        &program_id(),
    )
}

/// Build a fresh LiteSVM with the program loaded and a funded payer.
fn setup() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../../../target/deploy/soccit.so");
    svm.add_program(program_id(), bytes).unwrap();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 100_000_000_000).unwrap();
    (svm, payer)
}

fn send(svm: &mut LiteSVM, ixs: &[Instruction], payer: &Pubkey, signers: &[&Keypair]) -> Result<(), String> {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(ixs, Some(payer), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers)
        .map_err(|e| format!("sign: {e:?}"))?;
    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{:?}\nLOGS:\n{}", e.err, e.meta.logs.join("\n")))
}

fn token_balance(svm: &LiteSVM, ata: &Pubkey) -> u64 {
    get_spl_account::<TokenAccountState>(svm, ata).expect("token account").amount
}

fn read_match(svm: &LiteSVM, match_key: &Pubkey) -> soccit::Match {
    let acc = svm.get_account(match_key).expect("match exists");
    soccit::Match::try_deserialize(&mut &acc.data[..]).expect("deserialize match")
}

/// Create the match + vault. Returns (match_pda, vault_ata).
fn create_match(
    svm: &mut LiteSVM,
    admin: &Keypair,
    mint: &Pubkey,
    resolver: &Pubkey,
) -> (Pubkey, Pubkey) {
    let (m, _) = match_pda();
    let (vault_auth, _) = vault_authority_pda(&m);
    let vault = get_associated_token_address(&vault_auth, mint);

    let ix = Instruction {
        program_id: program_id(),
        accounts: soccit::accounts::CreateMatch {
            admin: admin.pubkey(),
            match_account: m,
            usdt_mint: *mint,
            vault_authority: vault_auth,
            vault,
            token_program: anchor_spl::token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: soccit::instruction::CreateMatch {
            match_id: MATCH_ID,
            team1_id: 1,
            team2_id: 2,
            entry_fee: ENTRY_FEE,
            resolver: *resolver,
        }
        .data(),
    };
    send(svm, &[ix], &admin.pubkey(), &[admin]).expect("create_match");
    (m, vault)
}

/// Fund a new user with USDT and return (keypair, ata).
fn new_funded_user(svm: &mut LiteSVM, mint_authority: &Keypair, mint: &Pubkey, amount: u64) -> (Keypair, Pubkey) {
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 100_000_000_000).unwrap();
    let ata = CreateAssociatedTokenAccount::new(svm, mint_authority, mint)
        .owner(&user.pubkey())
        .send()
        .unwrap();
    MintTo::new(svm, mint_authority, mint, &ata, amount).send().unwrap();
    (user, ata)
}

fn place_prediction(
    svm: &mut LiteSVM,
    user: &Keypair,
    user_ata: &Pubkey,
    match_key: &Pubkey,
    vault: &Pubkey,
    side: u8,
    kind: u8,
    out_id: u32,
    in_id: u32,
    lock_minute: u16,
    nonce: u64,
) -> Result<(), String> {
    let (pred, _) = pred_pda(match_key, &user.pubkey(), nonce);
    let ix = Instruction {
        program_id: program_id(),
        accounts: soccit::accounts::PlacePrediction {
            user: user.pubkey(),
            match_account: *match_key,
            prediction: pred,
            user_usdt_ata: *user_ata,
            vault: *vault,
            token_program: anchor_spl::token::ID,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: soccit::instruction::PlacePrediction { side, kind, out_id, in_id, lock_minute, nonce }.data(),
    };
    send(svm, &[ix], &user.pubkey(), &[user])
}

fn resolve(
    svm: &mut LiteSVM,
    resolver: &Keypair,
    match_key: &Pubkey,
    winner1: Pubkey,
    winner2: Pubkey,
    winner3: Pubkey,
) -> Result<(), String> {
    let ix = Instruction {
        program_id: program_id(),
        accounts: soccit::accounts::Resolve {
            resolver: resolver.pubkey(),
            match_account: *match_key,
        }
        .to_account_metas(None),
        data: soccit::instruction::Resolve { terminal_phase: 1, winner1, winner2, winner3 }.data(),
    };
    send(svm, &[ix], &resolver.pubkey(), &[resolver])
}

#[allow(clippy::too_many_arguments)]
fn settle(
    svm: &mut LiteSVM,
    resolver: &Keypair,
    match_key: &Pubkey,
    vault: &Pubkey,
    winner1_ata: Option<Pubkey>,
    winner2_ata: Option<Pubkey>,
    winner3_ata: Option<Pubkey>,
    platform_ata: &Pubkey,
) -> Result<(), String> {
    let (vault_auth, _) = vault_authority_pda(match_key);
    let ix = Instruction {
        program_id: program_id(),
        accounts: soccit::accounts::SettleAndPayout {
            resolver: resolver.pubkey(),
            match_account: *match_key,
            vault_authority: vault_auth,
            vault: *vault,
            winner1_ata,
            winner2_ata,
            winner3_ata,
            platform_ata: *platform_ata,
            token_program: anchor_spl::token::ID,
        }
        .to_account_metas(None),
        data: soccit::instruction::SettleAndPayout {}.data(),
    };
    send(svm, &[ix], &resolver.pubkey(), &[resolver])
}

#[test]
fn full_lifecycle_pays_top3_and_drains_vault() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    svm.airdrop(&resolver.pubkey(), 100_000_000_000).unwrap();

    let mint = CreateMint::new(&mut svm, &admin).decimals(6).send().unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());

    // Two users, two picks each → pool = 4 * ENTRY_FEE.
    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);
    let (u2, u2_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);
    let platform = Keypair::new();
    let platform_ata = CreateAssociatedTokenAccount::new(&mut svm, &admin, &mint)
        .owner(&platform.pubkey())
        .send()
        .unwrap();

    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 14, 0, 60, 1).unwrap();
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 2, 14, 7, 64, 2).unwrap();
    place_prediction(&mut svm, &u2, &u2_ata, &m, &vault, 2, 1, 0, 9, 70, 1).unwrap();
    place_prediction(&mut svm, &u2, &u2_ata, &m, &vault, 2, 0, 11, 0, 75, 2).unwrap();

    let pool = 4 * ENTRY_FEE;
    assert_eq!(token_balance(&svm, &vault), pool, "vault holds the whole pool");
    assert_eq!(read_match(&svm, &m).pool_total, pool, "pool_total tracks fees");

    // Backend says: u1 first, u2 second, no eligible third.
    resolve(&mut svm, &resolver, &m, u1.pubkey(), u2.pubkey(), Pubkey::default()).unwrap();
    assert_eq!(read_match(&svm, &m).status, 1);

    settle(
        &mut svm,
        &resolver,
        &m,
        &vault,
        Some(u1_ata),
        Some(u2_ata),
        None,
        &platform_ata,
    )
    .unwrap();

    let pay1 = pool * 35 / 100;
    let pay2 = pool * 25 / 100;
    let platform_amt = pool - pay1 - pay2; // pay3 share rolls into platform
    // Each user paid 2 entry fees before winning.
    assert_eq!(token_balance(&svm, &u1_ata), 100_000_000 - 2 * ENTRY_FEE + pay1, "winner1 paid 35%");
    assert_eq!(token_balance(&svm, &u2_ata), 100_000_000 - 2 * ENTRY_FEE + pay2, "winner2 paid 25%");
    assert_eq!(token_balance(&svm, &platform_ata), platform_amt, "platform gets remainder (40%)");
    assert_eq!(token_balance(&svm, &vault), 0, "vault fully drained, no dust");

    let m_acc = read_match(&svm, &m);
    assert!(m_acc.settled);
    assert_eq!(m_acc.status, 2);
}

#[test]
fn resolve_rejects_non_resolver() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin).decimals(6).send().unwrap();
    let (m, _vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());

    // admin is not the resolver
    let err = resolve(&mut svm, &admin, &m, admin.pubkey(), Pubkey::default(), Pubkey::default());
    assert!(err.is_err(), "non-resolver resolve must fail");
}

#[test]
fn settle_rejects_double_and_non_resolver() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    svm.airdrop(&resolver.pubkey(), 100_000_000_000).unwrap();
    let mint = CreateMint::new(&mut svm, &admin).decimals(6).send().unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());

    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);
    let platform = Keypair::new();
    let platform_ata = CreateAssociatedTokenAccount::new(&mut svm, &admin, &mint)
        .owner(&platform.pubkey())
        .send()
        .unwrap();
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 14, 0, 60, 1).unwrap();
    resolve(&mut svm, &resolver, &m, u1.pubkey(), Pubkey::default(), Pubkey::default()).unwrap();

    // non-resolver cannot settle
    let bad = settle(&mut svm, &admin, &m, &vault, Some(u1_ata), None, None, &platform_ata);
    assert!(bad.is_err(), "non-resolver settle must fail");

    // first settle succeeds
    settle(&mut svm, &resolver, &m, &vault, Some(u1_ata), None, None, &platform_ata).unwrap();
    // second settle must fail (AlreadySettled)
    let dbl = settle(&mut svm, &resolver, &m, &vault, Some(u1_ata), None, None, &platform_ata);
    assert!(dbl.is_err(), "double settle must fail");
}

#[test]
fn place_prediction_rejects_bad_inputs() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin).decimals(6).send().unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());
    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);

    // invalid side (3)
    assert!(place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 3, 0, 14, 0, 60, 1).is_err());
    // COMBO missing a leg
    assert!(place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 2, 14, 0, 60, 2).is_err());
}
