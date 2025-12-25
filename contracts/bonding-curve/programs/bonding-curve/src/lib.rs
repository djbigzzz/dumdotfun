use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn},
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000;
pub const BONDING_CURVE_SUPPLY: u64 = 800_000_000_000_000;
pub const GRADUATION_THRESHOLD: u64 = 85_000_000_000;
pub const PLATFORM_FEE_BPS: u64 = 100;
pub const DECIMALS: u8 = 6;

#[program]
pub mod bonding_curve {
    use super::*;

    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        curve.mint = ctx.accounts.mint.key();
        curve.creator = ctx.accounts.creator.key();
        curve.virtual_sol_reserves = 30_000_000_000;
        curve.virtual_token_reserves = BONDING_CURVE_SUPPLY;
        curve.real_sol_reserves = 0;
        curve.real_token_reserves = BONDING_CURVE_SUPPLY;
        curve.total_supply = TOTAL_SUPPLY;
        curve.is_graduated = false;
        curve.created_at = Clock::get()?.unix_timestamp;
        curve.name = name;
        curve.symbol = symbol;
        curve.uri = uri;
        curve.bump = ctx.bumps.bonding_curve;
        curve.vault_bump = ctx.bumps.curve_sol_vault;

        msg!("Token created: {} ({})", curve.name, curve.symbol);
        msg!("Mint: {}", curve.mint);
        
        Ok(())
    }

    pub fn buy(ctx: Context<Buy>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, ErrorCode::AlreadyGraduated);
        require!(sol_amount > 0, ErrorCode::InvalidAmount);

        let fee = sol_amount * PLATFORM_FEE_BPS / 10000;
        let sol_after_fee = sol_amount - fee;

        let tokens_out = calculate_tokens_out(
            sol_after_fee,
            curve.virtual_sol_reserves,
            curve.virtual_token_reserves,
        )?;

        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        require!(tokens_out <= curve.real_token_reserves, ErrorCode::InsufficientLiquidity);

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.curve_sol_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, sol_amount)?;

        let seeds = &[
            b"bonding_curve",
            curve.mint.as_ref(),
            &[curve.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.bonding_curve.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::mint_to(cpi_ctx, tokens_out)?;

        curve.virtual_sol_reserves += sol_after_fee;
        curve.virtual_token_reserves -= tokens_out;
        curve.real_sol_reserves += sol_after_fee;
        curve.real_token_reserves -= tokens_out;

        if curve.real_sol_reserves >= GRADUATION_THRESHOLD {
            curve.is_graduated = true;
            msg!("Token graduated! Ready for DEX migration.");
        }

        msg!("Buy: {} lamports for {} tokens", sol_amount, tokens_out);
        
        Ok(())
    }

    pub fn sell(ctx: Context<Sell>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, ErrorCode::AlreadyGraduated);
        require!(token_amount > 0, ErrorCode::InvalidAmount);

        let sol_out = calculate_sol_out(
            token_amount,
            curve.virtual_sol_reserves,
            curve.virtual_token_reserves,
        )?;

        let fee = sol_out * PLATFORM_FEE_BPS / 10000;
        let sol_after_fee = sol_out - fee;

        require!(sol_after_fee >= min_sol_out, ErrorCode::SlippageExceeded);
        require!(sol_after_fee <= curve.real_sol_reserves, ErrorCode::InsufficientLiquidity);

        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        );
        token::burn(cpi_ctx, token_amount)?;

        **ctx.accounts.curve_sol_vault.to_account_info().try_borrow_mut_lamports()? -= sol_after_fee;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_after_fee;

        curve.virtual_sol_reserves -= sol_out;
        curve.virtual_token_reserves += token_amount;
        curve.real_sol_reserves -= sol_after_fee;
        curve.real_token_reserves += token_amount;

        msg!("Sell: {} tokens for {} lamports", token_amount, sol_after_fee);
        
        Ok(())
    }

    pub fn get_buy_quote(ctx: Context<GetQuote>, sol_amount: u64) -> Result<u64> {
        let curve = &ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, ErrorCode::AlreadyGraduated);

        let fee = sol_amount * PLATFORM_FEE_BPS / 10000;
        let sol_after_fee = sol_amount - fee;

        let tokens_out = calculate_tokens_out(
            sol_after_fee,
            curve.virtual_sol_reserves,
            curve.virtual_token_reserves,
        )?;

        msg!("Buy quote: {} lamports -> {} tokens", sol_amount, tokens_out);
        Ok(tokens_out)
    }

    pub fn get_sell_quote(ctx: Context<GetQuote>, token_amount: u64) -> Result<u64> {
        let curve = &ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, ErrorCode::AlreadyGraduated);

        let sol_out = calculate_sol_out(
            token_amount,
            curve.virtual_sol_reserves,
            curve.virtual_token_reserves,
        )?;

        let fee = sol_out * PLATFORM_FEE_BPS / 10000;
        let sol_after_fee = sol_out - fee;

        msg!("Sell quote: {} tokens -> {} lamports", token_amount, sol_after_fee);
        Ok(sol_after_fee)
    }
}

fn calculate_tokens_out(sol_in: u64, sol_reserves: u64, token_reserves: u64) -> Result<u64> {
    let k = (sol_reserves as u128) * (token_reserves as u128);
    let new_sol_reserves = sol_reserves + sol_in;
    let new_token_reserves = k / (new_sol_reserves as u128);
    let tokens_out = token_reserves - (new_token_reserves as u64);
    Ok(tokens_out)
}

fn calculate_sol_out(tokens_in: u64, sol_reserves: u64, token_reserves: u64) -> Result<u64> {
    let k = (sol_reserves as u128) * (token_reserves as u128);
    let new_token_reserves = token_reserves + tokens_in;
    let new_sol_reserves = k / (new_token_reserves as u128);
    let sol_out = sol_reserves - (new_sol_reserves as u64);
    Ok(sol_out)
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        mint::decimals = DECIMALS,
        mint::authority = bonding_curve,
        mint::freeze_authority = bonding_curve,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [b"curve_vault", mint.key().as_ref()],
        bump,
    )]
    /// CHECK: SOL vault PDA for bonding curve - holds SOL from token purchases
    pub curve_sol_vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        seeds = [b"curve_vault", mint.key().as_ref()],
        bump = bonding_curve.vault_bump,
    )]
    /// CHECK: SOL vault for bonding curve
    pub curve_sol_vault: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        seeds = [b"curve_vault", mint.key().as_ref()],
        bump = bonding_curve.vault_bump,
    )]
    /// CHECK: SOL vault for bonding curve
    pub curve_sol_vault: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetQuote<'info> {
    pub mint: Account<'info, Mint>,

    #[account(
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
}

#[account]
#[derive(InitSpace)]
pub struct BondingCurve {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub total_supply: u64,
    pub is_graduated: bool,
    pub created_at: i64,
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    #[max_len(200)]
    pub uri: String,
    pub bump: u8,
    pub vault_bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Token has already graduated to DEX")]
    AlreadyGraduated,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
}
