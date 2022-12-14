use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::*;

#[account]
#[derive(Default)]
pub struct GlobalPool {
    // 8 + 40
    pub super_admin: Pubkey,        // 32
    pub total_staked_count: u64,    // 8
}

#[account]
#[derive(Default)]
pub struct UserVault {
    // 8 + 40
    pub owner: Pubkey,        // 32
    pub amount: u64,    // 8
}

/// User PDA Layout
#[zero_copy]
#[derive(Default, PartialEq)]
#[repr(packed)]
pub struct StakedData {
    pub mint: Pubkey,               // 32
    pub staked_time: i64,           // 8
    pub lock_time: i64,             // 8
    pub duration: i64,         // 8
}

#[account(zero_copy)]
pub struct UserPool {
    // 8 + 5640
    pub owner: Pubkey,                              // 32
    pub staked_count: u64,                          // 8
    pub staking: [StakedData; STAKE_MAX_COUNT],     // 56 * 100
}

impl Default for UserPool {
    #[inline]
    fn default() -> UserPool {
        UserPool {
            owner: Pubkey::default(),
            staked_count: 0,
            staking: [
                StakedData {
                    ..Default::default()
                }; STAKE_MAX_COUNT
            ],
        }
    }
}

impl UserPool {
    pub fn add_nft(
        &mut self,
        nft_pubkey: Pubkey,
        duration: i64,
        now: i64,
    ) {
        let idx = self.staked_count as usize;
        self.staking[idx].mint = nft_pubkey;
        self.staking[idx].staked_time = now;
        self.staking[idx].lock_time = now + duration * DAY;
        self.staking[idx].duration = duration;
       
        self.staked_count += 1;
    }
    
    pub fn remove_nft(
        &mut self,
        nft_pubkey: Pubkey,
        now: i64,
    ) -> Result<u64> {
        let mut withdrawn: u8 = 0;
        let mut index: usize = 0;
        let mut reward: u64 = 0;
        // Find NFT in pool
        for i in 0..self.staked_count {
            let idx = i as usize;
            if self.staking[idx].mint.eq(&nft_pubkey) {
                if self.staking[idx].lock_time <= now {
                    match self.staking[index].duration {
                        1 => reward = 90 * AMMO_DECIMAL,
                        5 => reward = 540 * AMMO_DECIMAL,
                        15 => reward = 1620 * AMMO_DECIMAL,
                        30 => reward = 3150 * AMMO_DECIMAL,
                        _ => reward = 0,
                    }
                }
                index = idx;
                withdrawn = 1;
                break;
            }
        }
        require!(withdrawn == 1, StakingError::InvalidNFTAddress);
       
        // Remove NFT from pool
        let last_idx: usize = (self.staked_count - 1) as usize;
        if index != last_idx {
            self.staking[index] = self.staking[last_idx];
        }
        self.staked_count -= 1;
        Ok(reward)
    }
}