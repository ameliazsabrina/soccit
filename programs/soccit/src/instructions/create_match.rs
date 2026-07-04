use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::*, state::Match};

#[derive(Accounts)]
#[instruction(match_id: u64)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Match::INIT_SPACE,
        seeds = [MATCH_SEED, &match_id.to_le_bytes()],
        bump,
    )]
    pub match_account: Account<'info, Match>,

    pub usdc_mint: Account<'info, Mint>,

    /// CHECK: PDA that owns the vault ATA. No data; seeds + bump verified here.
    #[account(
        seeds = [VAULT_SEED, match_account.key().as_ref()],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_authority,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn create_match_handler(
    ctx: Context<CreateMatch>,
    match_id: u64,
    team1_id: u32,
    team2_id: u32,
    entry_fee: u64,
    resolver: Pubkey,
    start_time: i64,
) -> Result<()> {
    let m = &mut ctx.accounts.match_account;
    m.match_id = match_id;
    m.team1_id = team1_id;
    m.team2_id = team2_id;
    m.entry_fee = entry_fee;
    m.pool_total = 0;
    m.status = STATUS_OPEN;
    m.terminal_phase = 0;
    m.settled = false;
    m.resolver = resolver;
    m.usdc_mint = ctx.accounts.usdc_mint.key();
    m.vault = ctx.accounts.vault.key();
    m.winner1 = Pubkey::default();
    m.winner2 = Pubkey::default();
    m.winner3 = Pubkey::default();
    m.vault_authority_bump = ctx.bumps.vault_authority;
    m.bump = ctx.bumps.match_account;
    m.start_time = start_time;
    Ok(())
}
