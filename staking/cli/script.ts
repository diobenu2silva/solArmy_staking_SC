import {
    Edition,
    MetadataProgram,
} from "@metaplex-foundation/mpl-token-metadata";
import { Program, web3 } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';

import { IDL as StakingIDL } from "../target/types/staking";
import {
    Keypair,
    PublicKey,
    Connection,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
} from '@solana/web3.js';
import {
    STAKING_PROGRAM_ID,
    GLOBAL_AUTHORITY_SEED,
    GlobalPool,
    AMMO_TOKEN_MINT,
    USER_POOL_SIZE,
    AMMO_TOKEN_DECIMAL,
    UserPool,
    VAULT_SEED,
} from './types';
import {
    getAssociatedTokenAccount,
    getATokenAccountsNeedCreate,
    getNFTTokenAccount,
    getOwnerOfNFT,
    getMetadata,
    METAPLEX,
    isExistAccount,
} from './utils';
import { programs } from "@metaplex/js";

let program: Program = null;

// Address of the deployed program.
let programId = new anchor.web3.PublicKey(STAKING_PROGRAM_ID);

anchor.setProvider(anchor.AnchorProvider.local(web3.clusterApiUrl("mainnet-beta")));
const solConnection = anchor.getProvider().connection;
const payer = anchor.AnchorProvider.local().wallet;

// Generate the program client from IDL.
program = new anchor.Program(StakingIDL as anchor.Idl, programId);
console.log('ProgramId: ', program.programId.toBase58());

// Update Authority Keypair
const updateKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(__dirname + '/../tests/keys/supernova.json', 'utf-8'))), { skipValidation: true });
console.log("Update authority pubkey= ", updateKeypair.publicKey.toBase58());
const main = async () => {
    const [globalAuthority, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        program.programId
    );
    console.log('GlobalAuthority: ', globalAuthority.toBase58());

    // const metadata = await getMetadata(new PublicKey("AwYBNbV3G1mdRbGenE5Xv9hoXPePJctstmHh93Hwj7KZ"));
    // console.log(metadata.toBase58());
    await initProject();

    // await initUserPool();

    // await depositToAccount(1);
    // let tx = await solConnection.getParsedTransaction("iE9Q7LhTHL5iVHaN2mtuyRZGKstTAe8ngDhgcT7C5eHH5MN2UVUFMU4WjefLRJDARsJwvz5zBg84RTXv6AiobYK", "confirmed");

    // await withdrawFromAccount(1);
    // let tx = await solConnection.getParsedTransaction("3gpGDEktgkWbF2mEgZodAHm49hoBDRGqoB9JHuPLr5kuXj9rf6dZCtzSAo2kLWELGWnzpTPEt8fz3YBnULUcZF4R", "confirmed");

    // await depositToVault(1);
    // let tx = await solConnection.getParsedTransaction("4DYEir2DxgRbWFYB28FjJwKCjkTZCZyF6ccV8EKLLwGcCsmtcSsNaDDoM1B9RZg23VUirBLFSmgD1fKmeYeSWPW", "confirmed");

    // await withdrawFromVault(1);
    // let tx = await solConnection.getParsedTransaction("3k6GbvB74FkJKYDQ6Pu2bwQ7pvz7sBTusyeaU1f8vyqowmMNESW4bHPDSSKGQqCzeDm8nCzwdRBobEBkYdjxhYdN", "confirmed");


    // await fusion(new PublicKey('DbMmFssKg3pr1SmncXFTBPqqUWaorqoCM1V8EHTKj6uD'), 10, 'https://solarmy-1.s3.amazonaws.com/16611742280471484')
        // 5ThYP9Uvukrr8AM4CZ3KyNQCgiHoasitTkuuSeRJkeiCwYNtJe7jBbGbKG26t21MKbtnjDJC5Kfco1DHLJUsF7Ap
    // console.log(tx.transaction.message.instructions);
    // await stakeNFT(new PublicKey('5vYFr2LvdC9HJZhw3BxFZnFbCAigxLJ8RAnEESq5Duwp'), 3);
    // await withdrawNft(new PublicKey('5vYFr2LvdC9HJZhw3BxFZnFbCAigxLJ8RAnEESq5Duwp'));
    // const userPool: UserPool = await getUserPoolState(payer.publicKey, program);
    // await testMetadata(new PublicKey("22HpVhS1SmUQHBCz9sPansBwyziDC77Rs1jkPHCPMsf3"));

};

export const testMetadata = async (
    nftMint: PublicKey
) => {
    let { metadata: { Metadata } } = programs;
    let metadataAccount = await Metadata.getPDA(nftMint);
    const metadata = await Metadata.load(solConnection, metadataAccount);
    let creators = metadata.data.data.creators;

    console.log("MintMetadata's Creator Addresses =", creators.map((creator) => creator.address));
}

export const initProject = async (
) => {
    const tx = await createInitializeTx(payer.publicKey, program);
    const { blockhash } = await solConnection.getRecentBlockhash('confirmed');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "confirmed");
    console.log("txHash =", txId);
}


export const initUserPool = async (
) => {
    const tx = await createInitUserPoolTx(payer.publicKey, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('finalized');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "finalized");
    console.log("Your transaction signature", txId);
}


export const depositToAccount = async (
    amount: number
) => {
    const tx = await createDepositToAccountTx(payer.publicKey, amount, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('finalized');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "finalized");
    console.log("Your transaction signature", txId);
}

export const withdrawFromAccount = async (
    amount: number
) => {
    const tx = await createWithdrawFromAccountTx(payer.publicKey, amount, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('finalized');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "finalized");
    console.log("Your transaction signature", txId);
}


export const depositToVault = async (
    amount: number
) => {
    const tx = await createDepositToVaultTx(payer.publicKey, amount, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('finalized');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "finalized");
    console.log("Your transaction signature", txId);
}

export const withdrawFromVault = async (
    amount: number
) => {
    const tx = await createWithdrawFromVaultTx(payer.publicKey, amount, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('finalized');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "finalized");
    console.log("Your transaction signature", txId);
}


export const fusion = async (
    nftMint: PublicKey,
    amount: number,
    newUri: string,
) => {
    const [userVault, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), payer.publicKey.toBuffer()],
        STAKING_PROGRAM_ID,
    );
    console.log(userVault.toBase58());
    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        payer.publicKey,
        "user-pool",
        STAKING_PROGRAM_ID,
    );

    let poolAccount = await solConnection.getAccountInfo(userPoolKey);
    if (poolAccount === null || poolAccount.data === null) {
        await initUserPool();
    }

    const tx = await createFusionTx(payer.publicKey, nftMint, amount, newUri, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('finalized');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer, updateKeypair]);
    await solConnection.confirmTransaction(txId, "finalized");
    console.log("Your transaction signature", txId);
}


export const stakeNFT = async (
    mint: PublicKey,
    duration: number,
) => {
    console.log(mint.toBase58(), duration);

    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        payer.publicKey,
        "user-pool",
        STAKING_PROGRAM_ID,
    );

    let poolAccount = await solConnection.getAccountInfo(userPoolKey);
    if (poolAccount === null || poolAccount.data === null) {
        await initUserPool();
    }

    const tx = await createStakeNftTx(mint, payer.publicKey, program, solConnection, duration);
    const { blockhash } = await solConnection.getRecentBlockhash('confirmed');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "confirmed");
    console.log("Your transaction signature", txId);
}


export const withdrawNft = async (
    mint: PublicKey,
) => {
    console.log(mint.toBase58());

    const tx = await createWithdrawNftTx(mint, payer.publicKey, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('confirmed');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "confirmed");
    console.log("Your transaction signature", txId);
}


export const withdrawToken = async (
    amount: number
) => {
    const tx = await createWithdrawTx(payer.publicKey, amount, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('confirmed');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "confirmed");
    console.log("Your transaction signature", txId);
}


export const createInitializeTx = async (
    userAddress: PublicKey,
    program: anchor.Program,
) => {
    const [globalAuthority, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        STAKING_PROGRAM_ID,
    );

    let tx = new Transaction();
    console.log('==>Initializing Program');

    tx.add(program.instruction.initialize(
        bump, {
        accounts: {
            admin: userAddress,
            globalAuthority,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
        },
        instructions: [],
        signers: [],
    }));

    return tx;
}

export const createInitUserPoolTx = async (
    userAddress: PublicKey,
    program: anchor.Program,
    connection: Connection,
) => {
    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        userAddress,
        "user-pool",
        STAKING_PROGRAM_ID,
    );

    const [userVault, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), userAddress.toBuffer()],
        STAKING_PROGRAM_ID,
    );
    console.log(USER_POOL_SIZE);
    let ix = SystemProgram.createAccountWithSeed({
        fromPubkey: userAddress,
        basePubkey: userAddress,
        seed: "user-pool",
        newAccountPubkey: userPoolKey,
        lamports: await connection.getMinimumBalanceForRentExemption(USER_POOL_SIZE),
        space: USER_POOL_SIZE,
        programId: STAKING_PROGRAM_ID,
    });

    let tx = new Transaction();
    console.log('==>initializing user PDA', userPoolKey.toBase58());
    tx.add(ix);
    tx.add(program.instruction.initializeUserPool(
        {
            accounts: {
                userPool: userPoolKey,
                userVault,
                owner: userAddress,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            },
            instructions: [],
            signers: []
        }
    ));

    return tx;
}


export const createDepositToAccountTx = async (
    userAddress: PublicKey,
    amount: number,
    program: anchor.Program,
    connection: Connection,
) => {

    const [userVault, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), userAddress.toBuffer()],
        STAKING_PROGRAM_ID,
    );
    let userTokenAccount = await getAssociatedTokenAccount(userAddress, AMMO_TOKEN_MINT);
    let { instructions, destinationAccounts } = await getATokenAccountsNeedCreate(
        connection,
        userAddress,
        userVault,
        [AMMO_TOKEN_MINT]
    );

    let tx = new Transaction();
    console.log('==>Depositing to Account', destinationAccounts[0].toBase58());
    if (instructions.length > 0) instructions.map((ix) => tx.add(ix));
    tx.add(program.instruction.depositToAccount(
        new anchor.BN(amount * AMMO_TOKEN_DECIMAL), {
            accounts: {
                owner: userAddress,
                userVault,
                userTokenAccount,
                destTokenAccount: destinationAccounts[0],
                tokenProgram: TOKEN_PROGRAM_ID,

            },
            instructions: [],
            signers: []
        }
    ));

    return tx;
}


export const createWithdrawFromAccountTx = async (
    userAddress: PublicKey,
    amount: number,
    program: anchor.Program,
    connection: Connection,
) => {

    const [userVault, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), userAddress.toBuffer()],
        STAKING_PROGRAM_ID,
    );
    let userTokenAccount = await getAssociatedTokenAccount(userVault, AMMO_TOKEN_MINT);
    let { instructions, destinationAccounts } = await getATokenAccountsNeedCreate(
        connection,
        userAddress,
        userAddress,
        [AMMO_TOKEN_MINT]
    );

    let tx = new Transaction();
    console.log('==>Withdrawing from Account', destinationAccounts[0].toBase58());
    if (instructions.length > 0) instructions.map((ix) => tx.add(ix));
    tx.add(program.instruction.withdrawFromAccount(
        bump, new anchor.BN(amount * AMMO_TOKEN_DECIMAL), {
            accounts: {
                owner: userAddress,
                userVault,
                userTokenAccount,
                destTokenAccount: destinationAccounts[0],
                tokenProgram: TOKEN_PROGRAM_ID,

            },
            instructions: [],
            signers: []
        }
    ));

    return tx;
}


export const createDepositToVaultTx = async (
    userAddress: PublicKey,
    amount: number,
    program: anchor.Program,
    connection: Connection,
) => {
    const [globalAuthority, globalBump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        STAKING_PROGRAM_ID,
    );

    const [userVault, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), userAddress.toBuffer()],
        STAKING_PROGRAM_ID,
    );
    let rewardVault = await getAssociatedTokenAccount(globalAuthority, AMMO_TOKEN_MINT);
    let userTokenAccount = await getAssociatedTokenAccount(userVault, AMMO_TOKEN_MINT);

    let tx = new Transaction();
    console.log('==>Depositing to Vault...', rewardVault.toBase58());
    tx.add(program.instruction.depositToVault(
        bump, new anchor.BN(amount * AMMO_TOKEN_DECIMAL), {
            accounts: {
                owner: userAddress,
                globalAuthority,
                userVault,
                rewardVault,
                userTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,

            },
            instructions: [],
            signers: []
        }
    ));

    return tx;
}


export const createWithdrawFromVaultTx = async (
    userAddress: PublicKey,
    amount: number,
    program: anchor.Program,
    connection: Connection,
) => {
    const [globalAuthority, globalBump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        STAKING_PROGRAM_ID,
    );

    const [userVault, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), userAddress.toBuffer()],
        STAKING_PROGRAM_ID,
    );
    let rewardVault = await getAssociatedTokenAccount(globalAuthority, AMMO_TOKEN_MINT);
    let { instructions, destinationAccounts } = await getATokenAccountsNeedCreate(
        connection,
        userAddress,
        userVault,
        [AMMO_TOKEN_MINT]
    );

    let tx = new Transaction();
    console.log('==>Withdrawing From Vault...', destinationAccounts[0].toBase58());
    if (instructions.length > 0) instructions.map((ix) => tx.add(ix));

    tx.add(program.instruction.withdrawFromVault(
        globalBump, new anchor.BN(amount * AMMO_TOKEN_DECIMAL), {
            accounts: {
                owner: userAddress,
                globalAuthority,
                userVault,
                rewardVault,
                destTokenAccount: destinationAccounts[0],
                tokenProgram: TOKEN_PROGRAM_ID,
            },
            instructions: [],
            signers: []
        }
    ));

    return tx;
}


export const createFusionTx = async (
    userAddress: PublicKey,
    nftMint: PublicKey,
    amount: number,
    newUri: string,
    program: anchor.Program,
    connection: Connection,
) => {
    const [globalAuthority, globalBump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        STAKING_PROGRAM_ID,
    );

    const [userVault, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), userAddress.toBuffer()],
        STAKING_PROGRAM_ID,
    );
    let rewardVault = await getAssociatedTokenAccount(globalAuthority, AMMO_TOKEN_MINT);
    let userTokenAccount = await getAssociatedTokenAccount(userVault, AMMO_TOKEN_MINT);

    const metadata = await getMetadata(nftMint);

    let tx = new Transaction();
    console.log('==>Fusioning...', nftMint.toBase58());
    tx.add(program.instruction.fusion(
        bump, new anchor.BN(amount * AMMO_TOKEN_DECIMAL), newUri, {
            accounts: {
                owner: userAddress,
                globalAuthority,
                updateAuthority: updateKeypair.publicKey,
                userVault,
                rewardVault,
                userTokenAccount,
                nftMint,
                mintMetadata: metadata,
                tokenMetadataProgram: METAPLEX,
                tokenProgram: TOKEN_PROGRAM_ID,
            },
            instructions: [],
            signers: [updateKeypair]
        }
    ));

    return tx;
}

export const createStakeNftTx = async (
    mint: PublicKey,
    userAddress: PublicKey,
    program: anchor.Program,
    connection: Connection,
    duration: number,
) => {
    const [globalAuthority, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        STAKING_PROGRAM_ID,
    );

    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        userAddress,
        "user-pool",
        STAKING_PROGRAM_ID,
    );

    let userTokenAccount = await getAssociatedTokenAccount(userAddress, mint);
    if (!await isExistAccount(userTokenAccount, connection)) {
        let accountOfNFT = await getNFTTokenAccount(mint, connection);
        if (userTokenAccount.toBase58() != accountOfNFT.toBase58()) {
            let nftOwner = await getOwnerOfNFT(mint, connection);
            if (nftOwner.toBase58() == userAddress.toBase58()) userTokenAccount = accountOfNFT;
            else if (nftOwner.toBase58() !== globalAuthority.toBase58()) {
                throw 'Error: Nft is not owned by user';
            }
        }
    }
    console.log("NFT = ", mint.toBase58(), userTokenAccount.toBase58());

    let { instructions, destinationAccounts } = await getATokenAccountsNeedCreate(
        connection,
        userAddress,
        globalAuthority,
        [mint]
    );

    console.log("Dest NFT Account = ", destinationAccounts[0].toBase58())

    const metadata = await getMetadata(mint);

    console.log("Metadata=", metadata.toBase58());

    let tx = new Transaction();

    if (instructions.length > 0) instructions.map((ix) => tx.add(ix));
    console.log('==>Staking ...', mint.toBase58(), duration);

    tx.add(program.instruction.stakeNftToPool(
        bump, new anchor.BN(duration), {
        accounts: {
            owner: userAddress,
            globalAuthority,
            userPool: userPoolKey,
            userNftTokenAccount: userTokenAccount,
            destNftTokenAccount: destinationAccounts[0],
            nftMint: mint,
            mintMetadata: metadata,
            tokenProgram: TOKEN_PROGRAM_ID,
            tokenMetadataProgram: METAPLEX,
        },
        instructions: [],
        signers: [],
    }));

    return tx;
}

export const createWithdrawNftTx = async (
    mint: PublicKey,
    userAddress: PublicKey,
    program: anchor.Program,
    connection: Connection,
) => {
    let ret = await getATokenAccountsNeedCreate(
        connection,
        userAddress,
        userAddress,
        [mint, AMMO_TOKEN_MINT]
    );

    const [userVault, userbump] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), payer.publicKey.toBuffer()],
        STAKING_PROGRAM_ID,
    );
    let userTokenAccount = ret.destinationAccounts[0];
    console.log("User NFT = ", mint.toBase58(), userTokenAccount.toBase58());

    const [globalAuthority, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        STAKING_PROGRAM_ID
    );
    let rewardVault = await getAssociatedTokenAccount(globalAuthority, AMMO_TOKEN_MINT);
    let destNftTokenAccount = await getAssociatedTokenAccount(globalAuthority, mint);

    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        userAddress,
        "user-pool",
        STAKING_PROGRAM_ID,
    );

    let tx = new Transaction();

    if (ret.instructions.length > 0) ret.instructions.map((ix) => tx.add(ix));
    console.log('==> Withdrawing ... ', mint.toBase58());

    tx.add(program.instruction.withdrawNftFromPool(
        bump, {
        accounts: {
            owner: userAddress,
            globalAuthority,
            userPool: userPoolKey,
            userNftTokenAccount: userTokenAccount,
            destNftTokenAccount,
            rewardVault,
            userVault,
            userRewardAccount: ret.destinationAccounts[1],
            nftMint: mint,
            tokenProgram: TOKEN_PROGRAM_ID,
        },
        instructions: [],
        signers: [],
    }));

    return tx;
}


export const createWithdrawTx = async (
    userAddress: PublicKey,
    amount: number,
    program: anchor.Program,
    connection: Connection,
) => {
    const [globalAuthority, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        STAKING_PROGRAM_ID
    );
    let rewardVault = await getAssociatedTokenAccount(globalAuthority, AMMO_TOKEN_MINT);

    let ret = await getATokenAccountsNeedCreate(
        connection,
        userAddress,
        userAddress,
        [AMMO_TOKEN_MINT]
    );

    let tx = new Transaction();
    console.log('==> Withdrawing Token ... ', amount);

    if (ret.instructions.length > 0) ret.instructions.map((ix) => tx.add(ix));
    tx.add(program.instruction.withdrawToken(
        bump, new anchor.BN(amount * AMMO_TOKEN_DECIMAL), {
        accounts: {
            owner: userAddress,
            globalAuthority,
            rewardVault,
            userRewardAccount: ret.destinationAccounts[0],
            tokenProgram: TOKEN_PROGRAM_ID,
        },
        instructions: [],
        signers: [],
    }));

    return tx;
}

export const getUserPoolInfo = async (
    userAddress: PublicKey,
) => {
    const userInfo: UserPool = await getUserPoolState(userAddress, program);
    return {
        owner: userInfo.owner.toBase58(),
        stakedCount: userInfo.stakedCount.toNumber(),
        staking: userInfo.staking.map((info) => {
            return {
                mint: info.mint.toBase58(),
                stakedTime: info.stakedTime.toNumber(),
                lockTime: info.lockTime.toNumber(),
                duration: info.duration.toNumber(),
            }
        }),
    };
}

export const getGlobalInfo = async () => {
    const globalPool: GlobalPool = await getGlobalState(program);
    const result = {
        admin: globalPool.superAdmin.toBase58(),
        totalStakedCount: globalPool.totalStakedCount.toNumber(),
    };

    return result;
}

export const getAllNFTs = async (rpc?: string) => {
    return await getAllStakedNFTs(solConnection, rpc);
}


export const getGlobalState = async (
    program: anchor.Program,
): Promise<GlobalPool | null> => {
    const [globalAuthority, _] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        STAKING_PROGRAM_ID
    );
    try {
        let globalState = await program.account.globalPool.fetch(globalAuthority);
        return globalState as unknown as GlobalPool;
    } catch {
        return null;
    }
}

export const getUserPoolState = async (
    userAddress: PublicKey,
    program: anchor.Program,
): Promise<UserPool | null> => {
    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        userAddress,
        "user-pool",
        STAKING_PROGRAM_ID,
    );
    try {
        let userPoolState = await program.account.userPool.fetch(userPoolKey);
        return userPoolState as unknown as UserPool;
    } catch {
        return null;
    }
}

export const getAllStakedNFTs = async (connection: Connection, rpcUrl: string | undefined) => {
    let solConnection = connection;

    if (rpcUrl) {
        solConnection = new anchor.web3.Connection(rpcUrl, "confirmed");
    }

    let poolAccounts = await solConnection.getProgramAccounts(
        STAKING_PROGRAM_ID,
        {
            filters: [
                {
                    dataSize: USER_POOL_SIZE,
                },
            ]
        }
    );

    console.log(`Encounter ${poolAccounts.length} NFT Data Accounts`);

    let result: UserPool[] = [];

    try {
        for (let idx = 0; idx < poolAccounts.length; idx++) {
            let data = poolAccounts[idx].account.data;
            const owner = new PublicKey(data.slice(8, 40));

            let buf = data.slice(40, 48).reverse();
            const stakedCount = new anchor.BN(buf);

            let staking = [];
            for (let i = 0; i < stakedCount.toNumber(); i++) {
                const mint = new PublicKey(data.slice(i * 56 + 48, i * 56 + 80));

                buf = data.slice(i * 56 + 80, i * 56 + 88).reverse();
                const stakedTime = new anchor.BN(buf);
                buf = data.slice(i * 56 + 88, i * 56 + 96).reverse();
                const lockTime = new anchor.BN(buf);
                buf = data.slice(i * 56 + 96, i * 56 + 104).reverse();
                const rewardAmount = new anchor.BN(buf);

                staking.push({
                    mint,
                    stakedTime,
                    lockTime,
                    rewardAmount,
                })
            }

            result.push({
                owner,
                stakedCount,
                staking,
            });
        }
    } catch (e) {
        console.log(e);
        return {};
    }

    return {
        count: result.length,
        data: result.map((info: UserPool) => {
            return {
                owner: info.owner.toBase58(),
                stakedCount: info.stakedCount.toNumber(),
                staking: info.staking.map((info) => {
                    return {
                        mint: info.mint.toBase58(),
                        stakedTime: info.stakedTime.toNumber(),
                        claimedTime: info.lockTime.toNumber(),
                        duration: info.duration.toNumber(),
                    }
                }),
            }
        })
    }
};

main();