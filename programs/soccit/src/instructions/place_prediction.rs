use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    error::SoccitError,
    state::{Entry, Match, Prediction},
};

#[derive(Accounts)]
#[instruction(side: u8, kind: u8, out_id: u32, in_id: u32, lock_minute: u16, slot_index: u8)]
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
        init_if_needed,
        payer = user,
        space = 8 + Entry::INIT_SPACE,
        seeds = [ENTRY_SEED, match_account.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub entry: Account<'info, Entry>,

    #[account(
        init,
        payer = user,
        space = 8 + Prediction::INIT_SPACE,
        seeds = [PRED_SEED, match_account.key().as_ref(), user.key().as_ref(), &[slot_index]],
        bump,
    )]
    pub prediction: Account<'info, Prediction>,

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

pub fn place_prediction_handler(
    ctx: Context<PlacePrediction>,
    side: u8,
    kind: u8,
    out_id: u32,
    in_id: u32,
    lock_minute: u16,
    slot_index: u8,
) -> Result<()> {
    require!(
        ctx.accounts.match_account.status == STATUS_OPEN,
        SoccitError::MatchNotOpen
    );
    
    let start_time = ctx.accounts.match_account.start_time;
    if start_time != 0 {
        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= start_time - ENTRY_LEAD_SECS,
            SoccitError::EntryNotOpenYet
        );
    }

    require!(kind <= KIND_SCORE, SoccitError::InvalidKind);

    let is_score = kind == KIND_SCORE;
    if is_score {
        require!(
            out_id <= MAX_GOALS && in_id <= MAX_GOALS,
            SoccitError::ScoreOutOfRange
        );
    } else {
        require!(side == 1 || side == 2, SoccitError::InvalidSide);
        if kind == KIND_COMBO {
            require!(out_id != 0 && in_id != 0, SoccitError::IncompleteCombo);
            require!(out_id != in_id, SoccitError::SelfSubstitution);
        }
    }

    let entry = &mut ctx.accounts.entry;
    let first_pick = entry.owner == Pubkey::default();

    if first_pick {
        entry.owner = ctx.accounts.user.key();
        entry.match_key = ctx.accounts.match_account.key();
        entry.side = if is_score { 0 } else { side };
        entry.slots_used = 0;
        entry.player_count = 0;
        entry.bump = ctx.bumps.entry;

        let m = &mut ctx.accounts.match_account;
        m.participant_count = m
            .participant_count
            .checked_add(1)
            .ok_or(SoccitError::Overflow)?;
    } else if !is_score {
        if entry.side == 0 {
            entry.side = side;
        } else {
            require!(side == entry.side, SoccitError::SideLocked);
        }
    }

    require!(entry.slots_used < MAX_SLOTS, SoccitError::SlotsFull);
    require!(
        slot_index == entry.slots_used,
        SoccitError::SlotIndexMismatch
    );

    if !is_score {
        let new_players: &[u32] = match kind {
            KIND_OUT => &[out_id],
            KIND_IN => &[in_id],
            _ => &[out_id, in_id],
        };
        let used = entry.player_count as usize;
        for &pid in new_players {
            require!(
                !entry.players[..used].contains(&pid),
                SoccitError::DuplicatePlayer
            );
        }
        for &pid in new_players {
            let idx = entry.player_count as usize;
            entry.players[idx] = pid;
            entry.player_count += 1;
        }
    }
    entry.slots_used += 1;

    // Pay-per-match: the entry fee is charged once, on a wallet's first pick in
    // this match. Later picks (in additional slots) are free.
    let fee = if first_pick {
        ctx.accounts.match_account.entry_fee
    } else {
        0
    };

    if first_pick {
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

        let m = &mut ctx.accounts.match_account;
        m.pool_total = m.pool_total.checked_add(fee).ok_or(SoccitError::Overflow)?;
    }

    let match_key = ctx.accounts.match_account.key();
    let p = &mut ctx.accounts.prediction;
    p.owner = ctx.accounts.user.key();
    p.match_key = match_key;
    p.side = side;
    p.kind = kind;
    p.out_player_id = out_id;
    p.in_player_id = in_id;
    p.lock_minute = lock_minute;
    p.fee_paid = fee;
    p.slot_index = slot_index;
    p.bump = ctx.bumps.prediction;
    Ok(())
}
