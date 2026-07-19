use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    error::SoccitError,
    state::{Entry, Match},
};

/// Enter-once model: a wallet pays the match entry fee exactly once via this
/// instruction, which creates its Entry account. Every later `place_prediction`
/// for the match is free. Anchor's `init` on `entry` naturally rejects a second
/// entry from the same wallet (the API surfaces that as a 409 preflight).
#[derive(Accounts)]
pub struct EnterMatch<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [MATCH_SEED, &match_account.match_id.to_le_bytes()],
        bump = match_account.bump,
    )]
    pub match_account: Account<'info, Match>,

    #[account(
        init,
        payer = user,
        space = 8 + Entry::INIT_SPACE,
        seeds = [ENTRY_SEED, match_account.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub entry: Account<'info, Entry>,

    #[account(
        mut,
        constraint = user_usdc_ata.mint == match_account.usdc_mint @ SoccitError::MintMismatch,
        constraint = user_usdc_ata.owner == user.key(),
    )]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = match_account.vault @ SoccitError::VaultMismatch,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn enter_match_handler(ctx: Context<EnterMatch>) -> Result<()> {
    require!(
        ctx.accounts.match_account.status == STATUS_OPEN,
        SoccitError::MatchNotOpen
    );

    let start_time = ctx.accounts.match_account.start_time;
    let now = Clock::get()?.unix_timestamp;
    if start_time != 0 {
        require!(
            now >= start_time - ENTRY_LEAD_SECS,
            SoccitError::EntryNotOpenYet
        );
    }

    let fee = ctx.accounts.match_account.entry_fee;
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.user_usdc_ata.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        fee,
    )?;

    let match_key = ctx.accounts.match_account.key();

    let m = &mut ctx.accounts.match_account;
    m.pool_total = m.pool_total.checked_add(fee).ok_or(SoccitError::Overflow)?;
    m.participant_count = m
        .participant_count
        .checked_add(1)
        .ok_or(SoccitError::Overflow)?;

    let entry = &mut ctx.accounts.entry;
    entry.owner = ctx.accounts.user.key();
    entry.match_key = match_key;
    entry.side = 0;
    entry.slots_used = 0;
    entry.player_count = 0;
    entry.entered_at = now;
    entry.bump = ctx.bumps.entry;
    Ok(())
}
