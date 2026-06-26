use anchor_lang::prelude::*;

#[constant]
pub const MATCH_SEED: &[u8] = b"match";
#[constant]
pub const VAULT_SEED: &[u8] = b"vault";
#[constant]
pub const PRED_SEED: &[u8] = b"pred";

pub const PAY1_PCT: u64 = 35;
pub const PAY2_PCT: u64 = 25;
pub const PAY3_PCT: u64 = 20;

pub const STATUS_OPEN: u8 = 0;
pub const STATUS_RESOLVED: u8 = 1;
pub const STATUS_SETTLED: u8 = 2;

pub const KIND_OUT: u8 = 0;
pub const KIND_IN: u8 = 1;
pub const KIND_COMBO: u8 = 2;
