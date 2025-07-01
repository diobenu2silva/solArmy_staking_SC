# ⚡ Solarmy Staking Program - Solana Smart Contracts

Welcome to the Solarmy Staking Program! 🌟 This is the heart of our staking ecosystem - the smart contracts that power the entire Solarmy staking experience. Whether you're a developer looking to understand our architecture or a user curious about how your staking works, you're in the right place!

## 🎯 What Is This Program?

The Solarmy Staking Program is a collection of Solana smart contracts that enable secure, efficient, and transparent staking of Solarmy NFTs. Built with the Anchor framework and written in Rust, these contracts handle everything from staking and unstaking to reward distribution and governance.

## ✨ Key Features

- 🔒 Secure Staking: Robust smart contracts for safe NFT staking
- 💰 Reward Distribution: Automated reward calculation and distribution
- ⚡ High Performance: Optimized for Solana's fast blockchain
- 🎯 Flexible Parameters: Configurable staking periods and reward rates
- 📊 Transparent Operations: All actions visible on-chain
- 🔄 Easy Integration: Clean APIs for frontend integration

## 🛠️ Tech Stack

Built with the best tools for Solana development:

- Blockchain: Solana for speed and low costs
- Framework: Anchor for simplified Solana development
- Language: Rust for performance and safety
- Testing: TypeScript for comprehensive test coverage
- Deployment: Automated deployment scripts

## 🚀 Getting Started

Ready to dive into the Solarmy staking contracts? Let's get you set up!

### Prerequisites

Before you begin, make sure you have:
- Node.js and yarn installed
- ts-node installed globally (`npm install -g ts-node`)
- Solana CLI tools installed
- A Solana wallet with some SOL for deployment
- Your Solana wallet keypair ready (default: `/home/---/.config/solana/id.json`)

### Installation & Setup

1. Install Dependencies
   ```bash
   yarn install
   ```

2. Configure Your Environment
   - Set up your `ANCHOR_WALLET` environment variable in `package.json`
   - Ensure your Solana wallet is properly configured

3. Build the Program
   ```bash
   anchor build
   ```

## 🏗️ Deployment Guide

Ready to deploy your own staking program? Here's the step-by-step process:

### Step 1: Build the Program
```bash
anchor build
```

You'll see output like:
```
To deploy this program:
  $ solana program deploy /home/.../staking/target/deploy/staking.so
The program address will default to this keypair (override with --program-id):
  /home/.../staking/target/deploy/staking-keypair.json
```

### Step 2: Get Your Program ID
```bash
solana-keygen pubkey /home/.../staking/target/deploy/staking-keypair.json
```

This will give you a public key like: `5N...x6k`

### Step 3: Update Configuration Files

Update `lib.rs` (line 17):
```rust
declare_id!("5N...x6k");
```

Update `Anchor.toml` (line 4):
```toml
staking = "5N...x6k"
```

Update `types.ts` (line 6):
```typescript
export const STAKING_PROGRAM_ID = new PublicKey("5N...x6k");
```

### Step 4: Rebuild and Deploy
```bash
anchor build
solana program deploy /home/.../staking/target/deploy/staking.so
```

### Step 5: Enjoy Your Program! 🎭

Once deployed, your staking program is ready to use!

## 🔧 Development Guide

### Project Structure

```
├── programs/       # Solana smart contract programs
├── cli/           # Command-line interface and scripts
├── migrations/    # Deployment scripts
├── tests/         # Test files and examples
└── target/        # Build outputs and artifacts
```

### Key Files

- `/cli/script.ts`: Main functionality and staking operations
- `/cli/types.ts`: Program account type definitions
- `/cli/staking.ts`: IDL for JavaScript bindings

### Testing Your Setup

1. Modify Commands: Update the main functions in `script.ts` to test different features
2. Verify Configuration: Ensure your `ANCHOR_WALLET` environment variable is set correctly
3. Run Tests: Execute `yarn ts-node` to test your staking functions

## 🎯 Program Features Explained

### Staking Operations
- Stake NFTs: Lock NFTs for rewards
- Unstake: Release NFTs when ready
- Claim Rewards: Collect earned tokens
- View Status: Check staking positions

### Security Features
- Access Control: Only authorized users can perform actions
- Input Validation: All inputs are validated for safety
- Error Handling: Comprehensive error handling and recovery
- Audit Trail: All actions are logged on-chain

## 🤝 Contributing

We love community contributions! Here's how you can help:

- 🐛 Report Bugs: Help us identify and fix issues
- 💡 Suggest Features: Have ideas for new staking features?
- 🔧 Code Improvements: Help optimize the smart contracts
- 📝 Documentation: Enhance our guides and examples
- 🧪 Testing: Help test new features and edge cases

## 📞 Support & Community

Need help or want to connect with other developers?

- Discord: Join our community server
- Twitter: Follow for updates and announcements
- GitHub: Report issues and contribute code
- Documentation: Check our detailed guides

## 🎯 Roadmap

We're constantly improving the staking program:

- [ ] Enhanced Rewards: More sophisticated reward algorithms
- [ ] Governance: On-chain governance for parameter updates
- [ ] Cross-chain: Support for multiple blockchains
- [ ] Advanced Analytics: Detailed staking statistics
- [ ] Mobile Integration: Native mobile app support

## 🔒 Security & Trust

Your security is our priority:

- Audited Contracts: All smart contracts are professionally reviewed
- Open Source: Transparent code for community verification
- Regular Updates: Continuous security improvements
- Best Practices: Following Solana development standards

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🙏 Acknowledgments

Special thanks to:
- The Solana community for building amazing tools
- The Anchor team for the excellent framework
- Our contributors and testers
- All developers who make this ecosystem possible

---

Ready to build the future of staking? Let's create something amazing! ⚡✨

*Built with ❤️ by the Solarmy team*
