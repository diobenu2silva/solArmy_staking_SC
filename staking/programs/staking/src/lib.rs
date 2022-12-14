use anchor_lang::{
    prelude::*,
};
use solana_program::program::{invoke_signed, invoke};
use anchor_spl::{
    token::{self, Token, TokenAccount, Transfer },
};
use metaplex_token_metadata::{
    instruction::{update_metadata_accounts},
    state::{Metadata},
};

pub mod account;
pub mod error;
pub mod constants;

use account::*;
use error::*;
use constants::*;

declare_id!("2RbwYVj8gmYf8TRNukd34fGJgT7X4X4K3t6gLGwJkNQD");

#[program]
pub mod staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, _global_bump: u8) -> Result<()> {
        let global_authority = &mut ctx.accounts.global_authority;
        global_authority.super_admin = ctx.accounts.admin.key();
        Ok(())
    }

    pub fn initialize_user_pool(
        ctx: Context<InitializeUserPool>
    ) -> Result<()> {
        let mut user_pool = ctx.accounts.user_pool.load_init()?;
        let user_vault = &mut ctx.accounts.user_vault;
        user_pool.owner = ctx.accounts.owner.key();
        user_vault.owner = ctx.accounts.owner.key();
        user_vault.amount = 0;
        Ok(())
    }

    pub fn deposit_to_account(
        ctx: Context<DepositToAccount>,
        amount: u64
    ) -> Result<()> {
        let user_vault = &mut ctx.accounts.user_vault;

        let token_account_info = &mut &ctx.accounts.user_token_account;
        let dest_token_account_info = &mut &ctx.accounts.dest_token_account;
        let token_program = &mut &ctx.accounts.token_program;

        let cpi_accounts = Transfer {
            from: token_account_info.to_account_info().clone(),
            to: dest_token_account_info.to_account_info().clone(),
            authority: ctx.accounts.owner.to_account_info().clone()
        };
        token::transfer(
            CpiContext::new(token_program.clone().to_account_info(), cpi_accounts),
            amount
        )?;

        user_vault.amount += amount;
        
        Ok(())
    }

    pub fn withdraw_from_account(
        ctx: Context<WithdrawFromAccount>,
        bump: u8,
        amount: u64,
    ) -> Result<()> {
        require!(ctx.accounts.user_vault.amount > amount, StakingError::InsufficientAccountVault);
        let token_account_info = &mut &ctx.accounts.user_token_account;
        let dest_token_account_info = &mut &ctx.accounts.dest_token_account;
        let token_program = &mut &ctx.accounts.token_program;
        let seeds = &[VAULT_SEED.as_bytes(), &ctx.accounts.owner.key().to_bytes(), &[bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: token_account_info.to_account_info().clone(),
            to: dest_token_account_info.to_account_info().clone(),
            authority: ctx.accounts.user_vault.to_account_info().clone()
        };
        token::transfer(
            CpiContext::new_with_signer(token_program.to_account_info().clone(), cpi_accounts, signer),
            amount
        )?;

        ctx.accounts.user_vault.amount -= amount;
        
        Ok(())
    }


    pub fn deposit_to_vault(
        ctx: Context<DepositToVault>,
        bump: u8,
        amount: u64,
    ) -> Result<()> {
        require!(ctx.accounts.user_token_account.amount >= amount, StakingError::InsufficientAccountVault);

        let token_account_info = &mut &ctx.accounts.user_token_account;
        let dest_token_account_info = &mut &ctx.accounts.reward_vault;
        let token_program = &mut &ctx.accounts.token_program;
        let seeds = &[VAULT_SEED.as_bytes(), &ctx.accounts.owner.key().to_bytes(), &[bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: token_account_info.to_account_info().clone(),
            to: dest_token_account_info.to_account_info().clone(),
            authority: ctx.accounts.user_vault.to_account_info().clone()
        };
        token::transfer(
            CpiContext::new_with_signer(token_program.to_account_info().clone(), cpi_accounts, signer),
            amount
        )?;

        ctx.accounts.user_vault.amount -= amount;
        
        Ok(())
    }

    pub fn withdraw_from_vault(
        ctx: Context<WithdrawFromVault>,
        global_bump: u8,
        amount: u64,
    ) -> Result<()> {
        require!(ctx.accounts.reward_vault.amount > amount, StakingError::InsufficientRewardVault);

        let token_account_info = &mut &ctx.accounts.reward_vault;
        let dest_token_account_info = &mut &ctx.accounts.dest_token_account;
        let token_program = &mut &ctx.accounts.token_program;
        let seeds = &[GLOBAL_AUTHORITY_SEED.as_bytes(), &[global_bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: token_account_info.to_account_info().clone(),
            to: dest_token_account_info.to_account_info().clone(),
            authority: ctx.accounts.global_authority.to_account_info().clone()
        };
        token::transfer(
            CpiContext::new_with_signer(token_program.to_account_info().clone(), cpi_accounts, signer),
            amount
        )?;

        ctx.accounts.user_vault.amount += amount;
        
        Ok(())
    }

    pub fn fusion(
        ctx: Context<Fusion>,
        bump: u8,
        amount: u64,
        new_uri: String
    ) -> Result<()> {
        require!(ctx.accounts.user_token_account.amount >= amount, StakingError::InsufficientAccountVault);

        let mint_metadata = &mut &ctx.accounts.mint_metadata;

        // Get mint metadata address from metaplex
        msg!(
            "Mint Metadata Account: {:?}",
            ctx.accounts.mint_metadata.key()
        );
        let (metadata, _) = Pubkey::find_program_address(
            &[
                metaplex_token_metadata::state::PREFIX.as_bytes(),
                metaplex_token_metadata::id().as_ref(),
                ctx.accounts.nft_mint.key().as_ref(),
            ],
            &metaplex_token_metadata::id(),
        );
        require!(
            metadata == mint_metadata.key(),
            StakingError::InvalidMetadata
        );

        // Verify metadata is legit
        let mut nft_metadata = Metadata::from_account_info(mint_metadata)?;
    
        // Check if this NFT is the wanted collection and verified
        // Check if its CandyMachinID is true
        if let Some(creators) = nft_metadata.data.creators {
            let mut valid: u8 = 0;
            let mut collection: Pubkey = Pubkey::default();
            for creator in creators {
                if creator.address.to_string() == COLLECTION_ADDRESS && creator.verified == true {
                    valid = 1;
                    collection = creator.address;
                    break;
                }
            }
            require!(valid == 1, StakingError::UnkownOrNotAllowedNFTCollection);
            msg!("Collection= {:?}", collection);
        } else {
            return Err(error!(StakingError::MetadataCreatorParseError));
        };

        let update_authority = &mut ctx.accounts.update_authority;
        let token_metadata_program = &mut ctx.accounts.token_metadata_program;

        nft_metadata = Metadata::from_account_info(mint_metadata)?.clone();
        // Update metadata
        nft_metadata.data.uri = new_uri;

        invoke(
            &update_metadata_accounts(
                token_metadata_program.key(),
                mint_metadata.key(),
                update_authority.key(),
                Some(update_authority.key()),
                Some(nft_metadata.clone().data),
                None,
            ),
            &[
                token_metadata_program.to_account_info(),
                mint_metadata.to_account_info().clone(),
                update_authority.to_account_info().clone(),
            ],
        )?;

        let token_account_info = &mut &ctx.accounts.user_token_account;
        let dest_token_account_info = &mut &ctx.accounts.reward_vault;
        let token_program = &mut &ctx.accounts.token_program;
        let seeds = &[VAULT_SEED.as_bytes(), &ctx.accounts.owner.key().to_bytes(), &[bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: token_account_info.to_account_info().clone(),
            to: dest_token_account_info.to_account_info().clone(),
            authority: ctx.accounts.user_vault.to_account_info().clone()
        };
        token::transfer(
            CpiContext::new_with_signer(token_program.to_account_info().clone(), cpi_accounts, signer),
            amount
        )?;

        ctx.accounts.user_vault.amount -= amount;
        
        Ok(())
    }

    #[access_control(user(&ctx.accounts.user_pool, &ctx.accounts.owner))]
    pub fn stake_nft_to_pool(
        ctx: Context<StakeNftToPool>,
        _global_bump: u8,
        duration: i64,
    ) -> Result<()> {
        let mint_metadata = &mut &ctx.accounts.mint_metadata;

        msg!("Metadata Account: {:?}", ctx.accounts.mint_metadata.key());
        let (metadata, _) = Pubkey::find_program_address(
            &[
                metaplex_token_metadata::state::PREFIX.as_bytes(),
                metaplex_token_metadata::id().as_ref(),
                ctx.accounts.nft_mint.key().as_ref(),
            ],
            &metaplex_token_metadata::id(),
        );
        require!(metadata == mint_metadata.key(), StakingError::InvalidMetadata);

        // verify metadata is legit
        let nft_metadata = Metadata::from_account_info(mint_metadata)?;

        if let Some(creators) = nft_metadata.data.creators {
            let mut valid: u8 = 0;
            let mut collection: Pubkey = Pubkey::default();
            for creator in creators {       
                if creator.address.to_string() == COLLECTION_ADDRESS_2D && creator.verified == true {
                    valid = 1;
                    collection = creator.address;
                    break;
                }
            }
            require!(valid == 1, StakingError::UnkownOrNotAllowedNFTCollection);
            msg!("Collection= {:?}", collection);
        } else {
            return Err(error!(StakingError::MetadataCreatorParseError));
        };

        let mut user_pool = ctx.accounts.user_pool.load_mut()?;
        msg!("Stake Mint: {:?}", ctx.accounts.nft_mint.key());
        msg!("Duration: {}", duration);
        let timestamp = Clock::get()?.unix_timestamp;
        user_pool.add_nft(ctx.accounts.nft_mint.key(), duration, timestamp);
        msg!("Staked Time: {}", timestamp);
        ctx.accounts.global_authority.total_staked_count += 1;

        let token_account_info = &mut &ctx.accounts.user_nft_token_account;
        let dest_token_account_info = &mut &ctx.accounts.dest_nft_token_account;
        let token_program = &mut &ctx.accounts.token_program;

        let cpi_accounts = Transfer {
            from: token_account_info.to_account_info().clone(),
            to: dest_token_account_info.to_account_info().clone(),
            authority: ctx.accounts.owner.to_account_info().clone()
        };
        token::transfer(
            CpiContext::new(token_program.clone().to_account_info(), cpi_accounts),
            1
        )?;
        
        Ok(())
    }
    
    #[access_control(user(&ctx.accounts.user_pool, &ctx.accounts.owner))]
    pub fn withdraw_nft_from_pool(
        ctx: Context<WithdrawNftFromPool>,
        global_bump: u8,
    ) -> Result<()> {
        let mut user_pool = ctx.accounts.user_pool.load_mut()?;
        msg!("Staked Mint: {:?}", ctx.accounts.nft_mint.key());

        let timestamp = Clock::get()?.unix_timestamp;
        let reward: u64 = user_pool.remove_nft(ctx.accounts.nft_mint.key(), timestamp)?;
        msg!("Reward: {:?} Unstaked Time: {}", reward, timestamp);
        ctx.accounts.global_authority.total_staked_count -= 1;

        let token_account_info = &mut &ctx.accounts.user_nft_token_account;
        let dest_token_account_info = &mut &ctx.accounts.dest_nft_token_account;
        let token_program = &mut &ctx.accounts.token_program;
        let seeds = &[GLOBAL_AUTHORITY_SEED.as_bytes(), &[global_bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: dest_token_account_info.to_account_info().clone(),
            to: token_account_info.to_account_info().clone(),
            authority: ctx.accounts.global_authority.to_account_info()
        };
        token::transfer(
            CpiContext::new_with_signer(token_program.clone().to_account_info(), cpi_accounts, signer),
            1
        )?;
        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: ctx.accounts.global_authority.to_account_info()
        };
        token::transfer(
            CpiContext::new_with_signer(token_program.to_account_info().clone(), cpi_accounts, signer),
            reward
        )?;

        invoke_signed(
            &spl_token::instruction::close_account(
                token_program.key,
                &dest_token_account_info.key(),
                ctx.accounts.owner.key,
                &ctx.accounts.global_authority.key(),
                &[],
            )?,
            &[
                token_program.clone().to_account_info(),
                dest_token_account_info.to_account_info().clone(),
                ctx.accounts.owner.to_account_info().clone(),
                ctx.accounts.global_authority.to_account_info().clone(),
            ],
            signer,
        )?;
        
        Ok(())
    }

    pub fn withdraw_token(
        ctx: Context<WithdrawToken>,
        bump: u8,
        amount: u64,
    ) -> Result<()> {
        let global_authority = &mut ctx.accounts.global_authority;
        require!(ctx.accounts.owner.key() == global_authority.super_admin, StakingError::InvalidSuperOwner);

        let token_program = &mut &ctx.accounts.token_program;
        let seeds = &[GLOBAL_AUTHORITY_SEED.as_bytes(), &[bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: ctx.accounts.global_authority.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info().clone(),
                cpi_accounts,
                signer,
            ),
            amount,
        )?;
        Ok(())
    }

}


#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
        space = 8 + 48,
        payer = admin
    )]
    pub global_authority: Account<'info, GlobalPool>,
    
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct InitializeUserPool<'info> {
    #[account(zero)]
    pub user_pool: AccountLoader<'info, UserPool>,

    #[account(
        init,
        seeds = [VAULT_SEED.as_ref(), owner.key().as_ref()],
        bump,
        space = 8 + 48,
        payer = owner
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct DepositToAccount<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED.as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub user_vault: Account<'info, UserVault>,
    
    #[account(
        mut,
        constraint = user_token_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = user_token_account.owner == *owner.key,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = dest_token_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = dest_token_account.owner == user_vault.key(),
    )]
    pub dest_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct WithdrawFromAccount<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED.as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub user_vault: Account<'info, UserVault>,
    
    #[account(
        mut,
        constraint = user_token_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = user_token_account.owner == user_vault.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = dest_token_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = dest_token_account.owner == *owner.key,
    )]
    pub dest_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct DepositToVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
    )]
    pub global_authority: Box<Account<'info, GlobalPool>>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED.as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub user_vault: Account<'info, UserVault>,
    
    #[account(
        mut,
        constraint = reward_vault.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = reward_vault.owner == global_authority.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = user_token_account.owner == user_vault.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct WithdrawFromVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
    )]
    pub global_authority: Box<Account<'info, GlobalPool>>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED.as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub user_vault: Account<'info, UserVault>,
    
    #[account(
        mut,
        constraint = reward_vault.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = reward_vault.owner == global_authority.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = dest_token_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = dest_token_account.owner == user_vault.key(),
    )]
    pub dest_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Fusion<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
    )]
    pub global_authority: Box<Account<'info, GlobalPool>>,
    
    #[account(mut)]
    pub update_authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED.as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub user_vault: Account<'info, UserVault>,
    
    #[account(
        mut,
        constraint = reward_vault.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = reward_vault.owner == global_authority.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = user_token_account.owner == user_vault.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub nft_mint: AccountInfo<'info>,

     // The first mint metadata
     #[account(mut)]
     /// CHECK: This is not dangerous because we don't read or write from this account
     pub mint_metadata: AccountInfo<'info>,
 
     // the token metadata program
     #[account(constraint = token_metadata_program.key == &metaplex_token_metadata::ID)]
     /// CHECK: This is not dangerous because we don't read or write from this account
     pub token_metadata_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct StakeNftToPool<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub user_pool: AccountLoader<'info, UserPool>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
    )]
    pub global_authority: Box<Account<'info, GlobalPool>>,
    
    #[account(
        mut,
        constraint = user_nft_token_account.mint == nft_mint.key(),
        constraint = user_nft_token_account.owner == *owner.key,
        constraint = user_nft_token_account.amount == 1,
    )]
    pub user_nft_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = dest_nft_token_account.mint == nft_mint.key(),
        constraint = dest_nft_token_account.owner == global_authority.key(),
    )]
    pub dest_nft_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub nft_mint: AccountInfo<'info>,
    /// the mint metadata
    #[account(
        mut,
        constraint = mint_metadata.owner == &metaplex_token_metadata::ID
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub mint_metadata: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(constraint = token_metadata_program.key == &metaplex_token_metadata::ID)]
    pub token_metadata_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct WithdrawNftFromPool<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub user_pool: AccountLoader<'info, UserPool>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
    )]
    pub global_authority: Box<Account<'info, GlobalPool>>,
    
    #[account(
        mut,
        constraint = user_nft_token_account.mint == nft_mint.key(),
        constraint = user_nft_token_account.owner == *owner.key,
    )]
    pub user_nft_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = dest_nft_token_account.mint == nft_mint.key(),
        constraint = dest_nft_token_account.owner == global_authority.key(),
        constraint = dest_nft_token_account.amount == 1,
    )]
    pub dest_nft_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = reward_vault.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = reward_vault.owner == global_authority.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [VAULT_SEED.as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub user_vault: Box<Account<'info, UserVault>>,
    
    #[account(
        mut,
        constraint = user_reward_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = user_reward_account.owner == user_vault.key(),
    )]
    pub user_reward_account: Box<Account<'info, TokenAccount>>,
    
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub nft_mint: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct WithdrawToken<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
    )]
    pub global_authority: Box<Account<'info, GlobalPool>>,
    #[account(
        mut,
        constraint = reward_vault.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = reward_vault.owner == global_authority.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = user_reward_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = user_reward_account.owner == *owner.key,
    )]
    pub user_reward_account: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

// Access control modifiers
fn user(pool_loader: &AccountLoader<UserPool>, user: &AccountInfo) -> Result<()> {
    let user_pool = pool_loader.load()?;
    require!(user_pool.owner == *user.key, StakingError::InvalidUserPool);
    Ok(())
}