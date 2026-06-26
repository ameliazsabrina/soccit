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
    #[msg("Provided vault account does not match the match vault")]
    VaultMismatch,
    #[msg("Provided USDT mint does not match the match mint")]
    MintMismatch,
    #[msg("Winner token account does not belong to the recorded winner")]
    WinnerAccountMismatch,
    #[msg("Vault token balance does not cover the recorded pool total")]
    VaultUnderfunded,
    #[msg("Arithmetic overflow")]
    Overflow,
}
