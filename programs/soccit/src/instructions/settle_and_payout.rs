use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{constants::*, error::SoccitError, state::Match};

#[derive(Accounts)]
pub struct SettleAndPayout<'info> {
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [MATCH_SEED, &match_account.match_id.to_le_bytes()],
        bump = match_account.bump,
        constraint = resolver.key() == match_account.resolver @ SoccitError::UnauthorizedResolver,
    )]
    pub match_account: Account<'info, Match>,

    /// CHECK: PDA authority over the vault, seeds + stored bump verified.
    #[account(
        seeds = [VAULT_SEED, match_account.key().as_ref()],
        bump = match_account.vault_authority_bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        address = match_account.vault @ SoccitError::VaultMismatch,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = winner1_ata.mint == match_account.usdt_mint @ SoccitError::MintMismatch,
    )]
    pub winner1_ata: Option<Box<Account<'info, TokenAccount>>>,

    #[account(
        mut,
        constraint = winner2_ata.mint == match_account.usdt_mint @ SoccitError::MintMismatch,
    )]
    pub winner2_ata: Option<Box<Account<'info, TokenAccount>>>,

    #[account(
        mut,
        constraint = winner3_ata.mint == match_account.usdt_mint @ SoccitError::MintMismatch,
    )]
    pub winner3_ata: Option<Box<Account<'info, TokenAccount>>>,

    #[account(
        mut,
        constraint = platform_ata.mint == match_account.usdt_mint @ SoccitError::MintMismatch,
    )]
    pub platform_ata: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

pub fn settle_and_payout_handler(ctx: Context<SettleAndPayout>) -> Result<()> {
    let m = &ctx.accounts.match_account;
    require!(m.status == STATUS_RESOLVED, SoccitError::MatchNotResolved);
    require!(!m.settled, SoccitError::AlreadySettled);
    require!(
        ctx.accounts.vault.amount >= m.pool_total,
        SoccitError::VaultUnderfunded
    );

    let pool = m.pool_total;
    let match_key = m.key();
    let vault_bump = m.vault_authority_bump;
    let winners = [m.winner1, m.winner2, m.winner3];
    let pcts = [PAY1_PCT, PAY2_PCT, PAY3_PCT];
    let atas = [
        ctx.accounts.winner1_ata.as_ref(),
        ctx.accounts.winner2_ata.as_ref(),
        ctx.accounts.winner3_ata.as_ref(),
    ];

    let bump_seed = [vault_bump];
    let signer_seeds: &[&[u8]] = &[VAULT_SEED, match_key.as_ref(), &bump_seed];
    let signer = &[signer_seeds];

    let mut paid_to_winners: u64 = 0;
    for i in 0..3 {
        if winners[i] == Pubkey::default() {
            continue;
        }
        let ata = atas[i].ok_or(SoccitError::WinnerAccountMismatch)?;
        require!(
            ata.owner == winners[i],
            SoccitError::WinnerAccountMismatch
        );
        let amount = pool
            .checked_mul(pcts[i])
            .ok_or(SoccitError::Overflow)?
            / 100;
        if amount > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ata.to_account_info(),
                        authority: ctx.accounts.vault_authority.to_account_info(),
                    },
                    signer,
                ),
                amount,
            )?;
            paid_to_winners = paid_to_winners
                .checked_add(amount)
                .ok_or(SoccitError::Overflow)?;
        }
    }

    let platform_amount = pool
        .checked_sub(paid_to_winners)
        .ok_or(SoccitError::Overflow)?;
    if platform_amount > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.platform_ata.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer,
            ),
            platform_amount,
        )?;
    }

    let m = &mut ctx.accounts.match_account;
    m.settled = true;
    m.status = STATUS_SETTLED;
    Ok(())
}
