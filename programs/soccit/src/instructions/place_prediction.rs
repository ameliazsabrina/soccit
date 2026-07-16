use anchor_lang::prelude::*;

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
        seeds = [MATCH_SEED, &match_account.match_id.to_le_bytes()],
        bump = match_account.bump,
    )]
    pub match_account: Account<'info, Match>,

    // Enter-once: the Entry must already exist (created by `enter_match`). A
    // wallet that has not entered cannot place a prediction.
    #[account(
        mut,
        seeds = [ENTRY_SEED, match_account.key().as_ref(), user.key().as_ref()],
        bump = entry.bump,
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
    // The wallet must have entered the match (paid the fee) before predicting.
    require!(
        entry.owner == ctx.accounts.user.key(),
        SoccitError::MatchNotEntered
    );

    if !is_score {
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

    let match_key = ctx.accounts.match_account.key();
    let p = &mut ctx.accounts.prediction;
    p.owner = ctx.accounts.user.key();
    p.match_key = match_key;
    p.side = side;
    p.kind = kind;
    p.out_player_id = out_id;
    p.in_player_id = in_id;
    p.lock_minute = lock_minute;
    // Enter-once: predictions are always free; the fee is paid in enter_match.
    p.fee_paid = 0;
    p.slot_index = slot_index;
    p.bump = ctx.bumps.prediction;
    Ok(())
}
