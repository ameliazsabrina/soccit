use anchor_lang::prelude::*;

use crate::{constants::*, error::SoccitError, state::Match};

#[derive(Accounts)]
pub struct Resolve<'info> {
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [MATCH_SEED, &match_account.match_id.to_le_bytes()],
        bump = match_account.bump,
        constraint = resolver.key() == match_account.resolver @ SoccitError::UnauthorizedResolver,
    )]
    pub match_account: Account<'info, Match>,
}

pub fn resolve_handler(
    ctx: Context<Resolve>,
    terminal_phase: u8,
    winner1: Pubkey,
    winner2: Pubkey,
    winner3: Pubkey,
) -> Result<()> {
    let m = &mut ctx.accounts.match_account;
    require!(m.status == STATUS_OPEN, SoccitError::MatchNotOpen);

    m.terminal_phase = terminal_phase;
    m.winner1 = winner1;
    m.winner2 = winner2;
    m.winner3 = winner3;
    m.status = STATUS_RESOLVED;
    Ok(())
}
