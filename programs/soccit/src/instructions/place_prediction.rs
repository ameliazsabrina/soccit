use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{constants::*, error::SoccitError, state::{Match, Prediction}};

#[derive(Accounts)]
#[instruction(side: u8, kind: u8, out_id: u32, in_id: u32, lock_minute: u16, nonce: u64)]
pub struct PlacePrediction<'info> {
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
        space = 8 + Prediction::INIT_SPACE,
        seeds = [PRED_SEED, match_account.key().as_ref(), user.key().as_ref(), &nonce.to_le_bytes()],
        bump,
    )]
    pub prediction: Account<'info, Prediction>,

    #[account(
        mut,
        constraint = user_usdt_ata.mint == match_account.usdt_mint @ SoccitError::MintMismatch,
        constraint = user_usdt_ata.owner == user.key(),
    )]
    pub user_usdt_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = match_account.vault @ SoccitError::VaultMismatch,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn place_prediction_handler(
    ctx: Context<PlacePrediction>,
    side: u8,
    kind: u8,
    out_id: u32,
    in_id: u32,
    lock_minute: u16,
    nonce: u64,
) -> Result<()> {
    require!(
        ctx.accounts.match_account.status == STATUS_OPEN,
        SoccitError::MatchNotOpen
    );
    require!(side == 1 || side == 2, SoccitError::InvalidSide);
    require!(kind <= KIND_COMBO, SoccitError::InvalidKind);
    if kind == KIND_COMBO {
        require!(out_id != 0 && in_id != 0, SoccitError::IncompleteCombo);
    }

    let fee = ctx.accounts.match_account.entry_fee;

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.user_usdt_ata.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        fee,
    )?;

    let m = &mut ctx.accounts.match_account;
    m.pool_total = m.pool_total.checked_add(fee).ok_or(SoccitError::Overflow)?;

    let p = &mut ctx.accounts.prediction;
    p.owner = ctx.accounts.user.key();
    p.match_key = m.key();
    p.side = side;
    p.kind = kind;
    p.out_player_id = out_id;
    p.in_player_id = in_id;
    p.lock_minute = lock_minute;
    p.fee_paid = fee;
    p.nonce = nonce;
    p.bump = ctx.bumps.prediction;
    Ok(())
}
