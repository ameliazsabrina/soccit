pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v");

#[program]
pub mod soccit {
    use super::*;

    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_id: u64,
        team1_id: u32,
        team2_id: u32,
        entry_fee: u64,
        resolver: Pubkey,
    ) -> Result<()> {
        instructions::create_match::create_match_handler(ctx, match_id, team1_id, team2_id, entry_fee, resolver)
    }

    pub fn place_prediction(
        ctx: Context<PlacePrediction>,
        side: u8,
        kind: u8,
        out_id: u32,
        in_id: u32,
        lock_minute: u16,
        nonce: u64,
    ) -> Result<()> {
        instructions::place_prediction::place_prediction_handler(ctx, side, kind, out_id, in_id, lock_minute, nonce)
    }

    pub fn resolve(
        ctx: Context<Resolve>,
        terminal_phase: u8,
        winner1: Pubkey,
        winner2: Pubkey,
        winner3: Pubkey,
    ) -> Result<()> {
        instructions::resolve::resolve_handler(ctx, terminal_phase, winner1, winner2, winner3)
    }

    pub fn settle_and_payout(ctx: Context<SettleAndPayout>) -> Result<()> {
        instructions::settle_and_payout::settle_and_payout_handler(ctx)
    }
}
