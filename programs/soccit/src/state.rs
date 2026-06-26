use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Match {
    pub match_id: u64,
    pub team1_id: u32,
    pub team2_id: u32,
    pub entry_fee: u64,
    pub pool_total: u64,
    pub status: u8,
    pub terminal_phase: u8,
    pub settled: bool,
    pub resolver: Pubkey,
    pub usdt_mint: Pubkey,
    pub vault: Pubkey,
    pub winner1: Pubkey,
    pub winner2: Pubkey,
    pub winner3: Pubkey,
    pub vault_authority_bump: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Prediction {
    pub owner: Pubkey,
    pub match_key: Pubkey,
    pub side: u8,
    pub kind: u8,
    pub out_player_id: u32,
    pub in_player_id: u32,
    pub lock_minute: u16,
    pub fee_paid: u64,
    pub nonce: u64,
    pub bump: u8,
}
