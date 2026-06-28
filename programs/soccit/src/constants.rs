use anchor_lang::prelude::*;

#[constant]
pub const MATCH_SEED: &[u8] = b"match";
#[constant]
pub const VAULT_SEED: &[u8] = b"vault";
#[constant]
pub const PRED_SEED: &[u8] = b"pred";
#[constant]
pub const ENTRY_SEED: &[u8] = b"entry";

pub const MAX_SLOTS: u8 = 5;
pub const MAX_PLAYERS: usize = 10;

pub const PAY1_PCT: u64 = 35;
pub const PAY2_PCT: u64 = 25;
pub const PAY3_PCT: u64 = 20;
pub const PAY_SOLO_PCT: u64 = 80;
pub const MIN_PARTICIPANTS_TOP3: u32 = 3;

pub const STATUS_OPEN: u8 = 0;
pub const STATUS_RESOLVED: u8 = 1;
pub const STATUS_SETTLED: u8 = 2;

pub const KIND_OUT: u8 = 0;
pub const KIND_IN: u8 = 1;
pub const KIND_COMBO: u8 = 2;
