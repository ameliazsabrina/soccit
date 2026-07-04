use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use litesvm_token::{
    get_spl_account, spl_token::state::Account as TokenAccountState, CreateAssociatedTokenAccount,
    CreateMint, MintTo,
};
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use spl_associated_token_account::get_associated_token_address;

use anchor_lang::prelude::Pubkey;

const ENTRY_FEE: u64 = 10_000_000;
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

fn pred_pda(match_key: &Pubkey, owner: &Pubkey, slot_index: u8) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"pred", match_key.as_ref(), owner.as_ref(), &[slot_index]],
        &program_id(),
    )
}

fn entry_pda(match_key: &Pubkey, owner: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"entry", match_key.as_ref(), owner.as_ref()],
        &program_id(),
    )
}

fn setup() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../../../target/deploy/soccit.so");
    svm.add_program(program_id(), bytes).unwrap();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 100_000_000_000).unwrap();
    (svm, payer)
}

fn send(
    svm: &mut LiteSVM,
    ixs: &[Instruction],
    payer: &Pubkey,
    signers: &[&Keypair],
) -> Result<(), String> {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(ixs, Some(payer), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers)
        .map_err(|e| format!("sign: {e:?}"))?;
    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{:?}\nLOGS:\n{}", e.err, e.meta.logs.join("\n")))
}

fn token_balance(svm: &LiteSVM, ata: &Pubkey) -> u64 {
    get_spl_account::<TokenAccountState>(svm, ata)
        .expect("token account")
        .amount
}

fn read_match(svm: &LiteSVM, match_key: &Pubkey) -> soccit::Match {
    let acc = svm.get_account(match_key).expect("match exists");
    soccit::Match::try_deserialize(&mut &acc.data[..]).expect("deserialize match")
}

fn read_prediction(svm: &LiteSVM, pred_key: &Pubkey) -> soccit::Prediction {
    let acc = svm.get_account(pred_key).expect("prediction exists");
    soccit::Prediction::try_deserialize(&mut &acc.data[..]).expect("deserialize prediction")
}

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
            usdc_mint: *mint,
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

fn new_funded_user(
    svm: &mut LiteSVM,
    mint_authority: &Keypair,
    mint: &Pubkey,
    amount: u64,
) -> (Keypair, Pubkey) {
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 100_000_000_000).unwrap();
    let ata = CreateAssociatedTokenAccount::new(svm, mint_authority, mint)
        .owner(&user.pubkey())
        .send()
        .unwrap();
    MintTo::new(svm, mint_authority, mint, &ata, amount)
        .send()
        .unwrap();
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
    slot_index: u8,
) -> Result<(), String> {
    let (pred, _) = pred_pda(match_key, &user.pubkey(), slot_index);
    let (entry, _) = entry_pda(match_key, &user.pubkey());
    let ix = Instruction {
        program_id: program_id(),
        accounts: soccit::accounts::PlacePrediction {
            user: user.pubkey(),
            match_account: *match_key,
            entry,
            prediction: pred,
            user_usdc_ata: *user_ata,
            vault: *vault,
            token_program: anchor_spl::token::ID,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None),
        data: soccit::instruction::PlacePrediction {
            side,
            kind,
            out_id,
            in_id,
            lock_minute,
            slot_index,
        }
        .data(),
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
        data: soccit::instruction::Resolve {
            terminal_phase: 1,
            winner1,
            winner2,
            winner3,
        }
        .data(),
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

    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());

    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);
    let (u2, u2_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);
    let (u3, u3_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);
    let platform = Keypair::new();
    let platform_ata = CreateAssociatedTokenAccount::new(&mut svm, &admin, &mint)
        .owner(&platform.pubkey())
        .send()
        .unwrap();

    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 14, 0, 60, 0).unwrap();
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 2, 3, 7, 64, 1).unwrap();
    place_prediction(&mut svm, &u2, &u2_ata, &m, &vault, 2, 1, 0, 9, 70, 0).unwrap();
    place_prediction(&mut svm, &u2, &u2_ata, &m, &vault, 2, 0, 11, 0, 75, 1).unwrap();
    place_prediction(&mut svm, &u3, &u3_ata, &m, &vault, 1, 0, 21, 0, 80, 0).unwrap();

    // Pay-per-match: three unique wallets each paid one entry fee, regardless of
    // how many slots they filled.
    let pool = 3 * ENTRY_FEE;
    assert_eq!(
        token_balance(&svm, &vault),
        pool,
        "vault holds the whole pool"
    );
    assert_eq!(
        read_match(&svm, &m).pool_total,
        pool,
        "pool_total tracks fees"
    );
    assert_eq!(
        read_match(&svm, &m).participant_count,
        3,
        "three unique wallets"
    );

    resolve(
        &mut svm,
        &resolver,
        &m,
        u1.pubkey(),
        u2.pubkey(),
        Pubkey::default(),
    )
    .unwrap();
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
    let platform_amt = pool - pay1 - pay2;
    assert_eq!(
        token_balance(&svm, &u1_ata),
        100_000_000 - ENTRY_FEE + pay1,
        "winner1 paid 35% (charged one entry fee for two picks)"
    );
    assert_eq!(
        token_balance(&svm, &u2_ata),
        100_000_000 - ENTRY_FEE + pay2,
        "winner2 paid 25% (charged one entry fee for two picks)"
    );
    assert_eq!(
        token_balance(&svm, &platform_ata),
        platform_amt,
        "platform gets remainder (40%)"
    );
    assert_eq!(
        token_balance(&svm, &vault),
        0,
        "vault fully drained, no dust"
    );

    let m_acc = read_match(&svm, &m);
    assert!(m_acc.settled);
    assert_eq!(m_acc.status, 2);
}

#[test]
fn resolve_rejects_non_resolver() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, _vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());

    let err = resolve(
        &mut svm,
        &admin,
        &m,
        admin.pubkey(),
        Pubkey::default(),
        Pubkey::default(),
    );
    assert!(err.is_err(), "non-resolver resolve must fail");
}

#[test]
fn settle_rejects_double_and_non_resolver() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    svm.airdrop(&resolver.pubkey(), 100_000_000_000).unwrap();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());

    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);
    let platform = Keypair::new();
    let platform_ata = CreateAssociatedTokenAccount::new(&mut svm, &admin, &mint)
        .owner(&platform.pubkey())
        .send()
        .unwrap();
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 14, 0, 60, 0).unwrap();
    resolve(
        &mut svm,
        &resolver,
        &m,
        u1.pubkey(),
        Pubkey::default(),
        Pubkey::default(),
    )
    .unwrap();

    let bad = settle(
        &mut svm,
        &admin,
        &m,
        &vault,
        Some(u1_ata),
        None,
        None,
        &platform_ata,
    );
    assert!(bad.is_err(), "non-resolver settle must fail");

    settle(
        &mut svm,
        &resolver,
        &m,
        &vault,
        Some(u1_ata),
        None,
        None,
        &platform_ata,
    )
    .unwrap();
    let dbl = settle(
        &mut svm,
        &resolver,
        &m,
        &vault,
        Some(u1_ata),
        None,
        None,
        &platform_ata,
    );
    assert!(dbl.is_err(), "double settle must fail");
}

#[test]
fn place_prediction_rejects_bad_inputs() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());
    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);

    assert!(place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 3, 0, 14, 0, 60, 0).is_err());
    assert!(place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 2, 14, 0, 60, 0).is_err());
}

#[test]
fn slot_cap_blocks_sixth_pick() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());
    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);

    for slot in 0u8..5 {
        let pid = (slot as u32) + 1;
        place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, pid, 0, 60, slot).unwrap();
    }
    assert_eq!(
        read_match(&svm, &m).participant_count,
        1,
        "one wallet, one entry"
    );

    let sixth = place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 6, 0, 60, 5);
    assert!(sixth.is_err(), "sixth pick must fail");
}

#[test]
fn duplicate_player_blocked() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());
    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);

    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 14, 0, 60, 0).unwrap();
    let dup = place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 14, 0, 64, 1);
    assert!(dup.is_err(), "reusing a player id must fail");
}

#[test]
fn side_locked_after_first_pick() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());
    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);

    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 14, 0, 60, 0).unwrap();
    let flipped = place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 2, 0, 15, 0, 64, 1);
    assert!(flipped.is_err(), "second pick on the other side must fail");
}

#[test]
fn pay_per_match_charges_one_fee_across_slots() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());
    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);

    // Three picks by the same wallet: only the first is charged.
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 14, 0, 60, 0).unwrap();
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 15, 0, 64, 1).unwrap();
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 16, 0, 68, 2).unwrap();

    assert_eq!(
        token_balance(&svm, &vault),
        ENTRY_FEE,
        "vault charged exactly one entry fee for three picks"
    );
    assert_eq!(read_match(&svm, &m).pool_total, ENTRY_FEE, "pool tracks one fee");
    assert_eq!(
        token_balance(&svm, &u1_ata),
        100_000_000 - ENTRY_FEE,
        "wallet debited once"
    );

    // fee_paid is recorded on the first prediction only.
    let (p0, _) = pred_pda(&m, &u1.pubkey(), 0);
    let (p1, _) = pred_pda(&m, &u1.pubkey(), 1);
    assert_eq!(read_prediction(&svm, &p0).fee_paid, ENTRY_FEE);
    assert_eq!(read_prediction(&svm, &p1).fee_paid, 0);
}

#[test]
fn score_prediction_stores_scoreline_and_ignores_side() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());
    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);

    // KIND_SCORE (3): side=0, score1=2 in out_id, score2=1 in in_id.
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 0, 3, 2, 1, 90, 0).unwrap();

    let (p0, _) = pred_pda(&m, &u1.pubkey(), 0);
    let pred = read_prediction(&svm, &p0);
    assert_eq!(pred.kind, 3, "kind is KIND_SCORE");
    assert_eq!(pred.out_player_id, 2, "score1 in out field");
    assert_eq!(pred.in_player_id, 1, "score2 in in field");

    // A score-first entry leaves the side unset, so a later sub can lock either side.
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 2, 0, 21, 0, 70, 1).unwrap();
    let flipped = place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 22, 0, 72, 2);
    assert!(
        flipped.is_err(),
        "once a sub locks side 2, the other side must fail"
    );

    // Score picks are exempt from the side lock even after a sub set it.
    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 0, 3, 0, 0, 90, 2).unwrap();
    assert_eq!(read_match(&svm, &m).participant_count, 1, "one wallet, one entry");
}

#[test]
fn score_out_of_range_rejected() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());
    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);

    // score1 = 100 > MAX_GOALS (99)
    let bad = place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 0, 3, 100, 1, 90, 0);
    assert!(bad.is_err(), "score above MAX_GOALS must fail");
}

#[test]
fn under_three_participants_pays_solo_eighty_percent() {
    let (mut svm, admin) = setup();
    let resolver = Keypair::new();
    svm.airdrop(&resolver.pubkey(), 100_000_000_000).unwrap();
    let mint = CreateMint::new(&mut svm, &admin)
        .decimals(6)
        .send()
        .unwrap();
    let (m, vault) = create_match(&mut svm, &admin, &mint, &resolver.pubkey());

    let (u1, u1_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);
    let (u2, u2_ata) = new_funded_user(&mut svm, &admin, &mint, 100_000_000);
    let platform = Keypair::new();
    let platform_ata = CreateAssociatedTokenAccount::new(&mut svm, &admin, &mint)
        .owner(&platform.pubkey())
        .send()
        .unwrap();

    place_prediction(&mut svm, &u1, &u1_ata, &m, &vault, 1, 0, 14, 0, 60, 0).unwrap();
    place_prediction(&mut svm, &u2, &u2_ata, &m, &vault, 2, 0, 21, 0, 70, 0).unwrap();
    assert_eq!(
        read_match(&svm, &m).participant_count,
        2,
        "two unique wallets"
    );

    let pool = 2 * ENTRY_FEE;
    resolve(
        &mut svm,
        &resolver,
        &m,
        u1.pubkey(),
        u2.pubkey(),
        Pubkey::default(),
    )
    .unwrap();
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

    let pay_solo = pool * 80 / 100;
    let platform_amt = pool - pay_solo;
    assert_eq!(
        token_balance(&svm, &u1_ata),
        100_000_000 - ENTRY_FEE + pay_solo,
        "winner gets 80%"
    );
    assert_eq!(
        token_balance(&svm, &u2_ata),
        100_000_000 - ENTRY_FEE,
        "runner-up not paid"
    );
    assert_eq!(
        token_balance(&svm, &platform_ata),
        platform_amt,
        "platform gets 20%"
    );
    assert_eq!(token_balance(&svm, &vault), 0, "vault fully drained");
}
