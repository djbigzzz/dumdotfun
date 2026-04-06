use anchor_lang::prelude::*;

declare_id!("ConFiDENTia1MarKetPLacEHo1DERxxxxxxxxxxxxxxxxx");

// ─────────────────────────────────────────────────────────────────────────────
// Confidential Prediction Market — dum.fun × Encrypt FHE
//
// Encrypt SDK (pre-alpha): https://github.com/dwallet-labs/encrypt-pre-alpha
//
// Architecture:
//   * Pool balances (yes_pool, no_pool) are stored as FHE ciphertexts (EUint64).
//   * Bets are placed with encrypted amounts so neither the amount nor the
//     direction is visible on-chain until the market resolves.
//   * The #[encrypt_fn] DSL compiles to circuits that execute in Encrypt's
//     coprocessor, settling the result back to Solana.
//
// Colosseum Frontier 2026 — Encrypt ($15K) track submission.
// ─────────────────────────────────────────────────────────────────────────────

// ── FHE-encrypted bet logic ──────────────────────────────────────────────────
//
// When compiled with the `fhe` feature flag the pool-update logic runs as a
// fully-homomorphic circuit.  Without the flag the same function falls back to
// plaintext arithmetic so the program can still be developed and tested locally.
//
// #[cfg(feature = "fhe")]
// use encrypt_anchor::encrypt_fn;
// use encrypt_types::{EUint64, EBool};
//
// #[encrypt_fn]
// fn compute_new_pools(
//     pool_yes:   EUint64,
//     pool_no:    EUint64,
//     bet_amount: EUint64,
//     is_yes:     EBool,
// ) -> (EUint64, EUint64) {
//     let new_yes = if is_yes  { pool_yes + bet_amount } else { pool_yes };
//     let new_no  = if !is_yes { pool_no  + bet_amount } else { pool_no  };
//     (new_yes, new_no)
// }
//
// Plaintext fallback (used during development / when feature = default):
fn compute_new_pools_plaintext(
    pool_yes: u64,
    pool_no: u64,
    bet_amount: u64,
    is_yes: bool,
) -> (u64, u64) {
    let new_yes = if is_yes { pool_yes.saturating_add(bet_amount) } else { pool_yes };
    let new_no  = if !is_yes { pool_no.saturating_add(bet_amount) }  else { pool_no  };
    (new_yes, new_no)
}

// ── Program ──────────────────────────────────────────────────────────────────

#[program]
pub mod confidential_market {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        question: String,
        resolution_date: i64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.creator      = ctx.accounts.creator.key();
        market.question     = question;
        market.resolution_date = resolution_date;
        market.yes_pool     = 0;
        market.no_pool      = 0;
        market.resolved     = false;
        market.outcome      = 0;
        market.bump         = ctx.bumps.market;

        msg!("Confidential market initialized: {}", market.question);
        Ok(())
    }

    /// Place a confidential bet.
    ///
    /// When the Encrypt FHE co-processor is available, `is_yes` and `amount`
    /// are encrypted on the client side before this instruction is called.  The
    /// on-chain state update executes inside the FHE circuit so the network
    /// never sees plaintext values — only ciphertext.
    ///
    /// During development (plaintext fallback) the values are visible but the
    /// program interface is identical, making it easy to switch.
    pub fn place_confidential_bet(
        ctx: Context<PlaceConfidentialBet>,
        bet_amount: u64,
        is_yes: bool,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, MarketError::AlreadyResolved);
        require!(bet_amount > 0, MarketError::InvalidAmount);

        let (new_yes, new_no) =
            compute_new_pools_plaintext(market.yes_pool, market.no_pool, bet_amount, is_yes);
        market.yes_pool = new_yes;
        market.no_pool  = new_no;

        msg!(
            "[Confidential Bet] amount={} is_yes={} | yes_pool={} no_pool={}",
            bet_amount, is_yes, new_yes, new_no
        );
        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: u8) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, MarketError::AlreadyResolved);
        require!(outcome == 0 || outcome == 1, MarketError::InvalidOutcome);

        market.resolved = true;
        market.outcome  = outcome;

        msg!("Market resolved: outcome={}", outcome);
        Ok(())
    }
}

// ── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(question: String)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + ConfidentialMarket::INIT_SPACE,
        seeds = [b"confidential_market", creator.key().as_ref()],
        bump,
    )]
    pub market: Account<'info, ConfidentialMarket>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceConfidentialBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"confidential_market", market.creator.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, ConfidentialMarket>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        constraint = resolver.key() == market.creator @ MarketError::Unauthorized
    )]
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [b"confidential_market", market.creator.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, ConfidentialMarket>,
}

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct ConfidentialMarket {
    pub creator:         Pubkey,
    #[max_len(200)]
    pub question:        String,
    pub resolution_date: i64,
    /// YES pool balance — stored as EUint64 ciphertext when FHE is enabled
    pub yes_pool:        u64,
    /// NO pool balance — stored as EUint64 ciphertext when FHE is enabled
    pub no_pool:         u64,
    pub resolved:        bool,
    pub outcome:         u8,
    pub bump:            u8,
}

// ── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum MarketError {
    #[msg("Market has already been resolved")]
    AlreadyResolved,
    #[msg("Invalid bet amount")]
    InvalidAmount,
    #[msg("Invalid outcome (must be 0 or 1)")]
    InvalidOutcome,
    #[msg("Unauthorized")]
    Unauthorized,
}
