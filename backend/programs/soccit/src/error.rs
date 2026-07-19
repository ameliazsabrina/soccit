use anchor_lang::prelude::*;

#[error_code]
pub enum SoccitError {
    #[msg("Only the match resolver may call this instruction")]
    UnauthorizedResolver,
    #[msg("Match is not in the OPEN state")]
    MatchNotOpen,
    #[msg("Match has not been resolved yet")]
    MatchNotResolved,
    #[msg("Match has already been settled")]
    AlreadySettled,
    #[msg("Invalid prediction kind")]
    InvalidKind,
    #[msg("Invalid side")]
    InvalidSide,
    #[msg("COMBO prediction requires both an OUT and an IN player id")]
    IncompleteCombo,
    #[msg("Wallet has already used all of its slots for this match")]
    SlotsFull,
    #[msg("All of a wallet's picks must be for the side chosen on its first pick")]
    SideLocked,
    #[msg("Player id has already been used in another slot")]
    DuplicatePlayer,
    #[msg("Provided slot index does not match the next free slot")]
    SlotIndexMismatch,
    #[msg("COMBO prediction cannot use the same player as both OUT and IN")]
    SelfSubstitution,
    #[msg("Provided vault account does not match the match vault")]
    VaultMismatch,
    #[msg("Provided token mint does not match the match mint")]
    MintMismatch,
    #[msg("Winner token account does not belong to the recorded winner")]
    WinnerAccountMismatch,
    #[msg("Vault token balance does not cover the recorded pool total")]
    VaultUnderfunded,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Predicted score is out of the allowed range")]
    ScoreOutOfRange,
    #[msg("The entry window for this match has not opened yet")]
    EntryNotOpenYet,
    #[msg("Wallet must enter the match (pay the entry fee) before predicting")]
    MatchNotEntered,
}
