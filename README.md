# 🚀 SolanaLance - The Future of Decentralized Freelancing

<div align="center">

![SolanaLance Hero](docs/images/Screenshot%20from%202025-10-31%2008-59-04.png)

**Secure milestone-based payments • Transparent ratings • Automated escrow**  
*Built on Solana for lightning-fast, low-cost transactions*

[![Solana](https://img.shields.io/badge/Solana-Blockchain-14F195?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)

</div>

---

## 🌟 What is SolanaLance?

**SolanaLance** is a next-generation decentralized freelancing platform that eliminates trust barriers between clients and freelancers through blockchain-powered escrow, transparent on-chain payments, and immutable reputation systems.

Unlike traditional platforms that charge 20% fees and hold your money, SolanaLance uses **Solana smart contracts** to:
- ✅ Lock funds in trustless escrow (no intermediary custody)
- ✅ Release payments automatically upon milestone approval
- ✅ Provide transparent transaction history on the blockchain
- ✅ Charge minimal fees (< 0.01 SOL per transaction)
- ✅ Settle payments in seconds, not days

---

## 🎯 Why SolanaLance is Futuristic

### 🔮 Web3-Native Architecture
- **Decentralized Identity**: Your wallet is your identity - no passwords, no data breaches
- **Trustless Escrow**: Smart contracts eliminate the need to trust a central authority
- **Immutable Records**: All transactions, ratings, and milestones recorded on Solana blockchain
- **Crypto-Native Payments**: Get paid in SOL instantly, anywhere in the world

### ⚡ Lightning-Fast Performance
- **Sub-second finality**: Transactions confirm in ~400ms on Solana
- **Scalable**: Handles 65,000+ transactions per second
- **Low fees**: Average transaction cost < $0.00025
- **Real-time updates**: WebSocket integration for instant notifications

### 🎨 Modern, Intuitive Design
- **Dark mode UI** with neon accents for a futuristic aesthetic
- **Glassmorphism effects** and smooth animations
- **Mobile-responsive** design that works seamlessly across devices
- **Wallet-first UX** with one-click Phantom/Solflare integration

### 🔐 Enterprise-Grade Security
- **PDA-based escrow**: Program Derived Addresses ensure funds can't be stolen
- **Multi-signature support**: Optional multi-sig for high-value contracts
- **Audit trail**: Every action recorded immutably on-chain
- **No custody risk**: Platform never holds your funds

---

## 📸 Platform Screenshots

### 🏠 Landing Page - The Future Awaits
![Landing Page](docs/images/Screenshot%20from%202025-10-31%2008-59-04.png)
*Sleek, modern interface showcasing the power of decentralized freelancing with instant payments and 100% stake protection*

### 🔍 Job Discovery - Find Your Next Opportunity
![Job Marketplace](docs/images/Screenshot%20from%202025-10-31%2009-00-10.png)
*Browse thousands of opportunities with real-time SOL payment amounts, milestone breakdowns, and instant filtering*

### 👤 Profile System - Build Your Reputation
![User Profile](docs/images/Screenshot%20from%202025-10-31%2009-00-35.png)
*Showcase your skills, connect social profiles, and display your verified Solana wallet address with trust badges*

### 💰 Transaction History - Full Transparency
![Transaction History](docs/images/Screenshot%20from%202025-10-31%2009-00-49.png)
*View all your blockchain transactions with Solana Explorer integration, export to CSV, and track your earnings in real-time*

### 📊 Freelancer Dashboard - Track Your Success
![Freelancer Dashboard](docs/images/Screenshot%20from%202025-10-31%2009-01-07.png)
*Monitor active projects, milestone progress, and earnings with live blockchain verification and one-click fund claiming*

---

## 🎮 How Users Experience SolanaLance

### 👔 For Recruiters (Clients)

1. **Post a Job**
   - Define project scope, skills needed, and budget in SOL
   - Set 3 milestone payments (e.g., 33% / 33% / 34%)
   - Specify experience level and project duration

2. **Review Applications**
   - Browse freelancer portfolios and proposals
   - Check on-chain reputation and trust scores
   - View verified wallet addresses and past work

3. **Fund Escrow & Start Project**
   - Select the best candidate
   - One-click escrow funding (full amount locked on-chain)
   - Freelancer receives instant notification to begin work

4. **Approve Milestones**
   - Review submitted deliverables
   - Approve milestones on-chain with your wallet signature
   - Funds automatically become claimable by freelancer

5. **Rate & Build Reputation**
   - Leave detailed ratings (quality, communication, professionalism)
   - Ratings stored on-chain and visible to all users
   - Build trust score for future collaborations

### 💼 For Freelancers

1. **Discover Opportunities**
   - Search jobs by skills, budget, and experience level
   - Filter by payment amount and project duration
   - View real-time escrow funding status

2. **Submit Proposals**
   - Write compelling cover letters
   - Upload portfolio files and work samples
   - Set estimated completion timeline

3. **Verify Funding**
   - Before starting work, verify escrow is funded on-chain
   - View exact SOL amounts locked for each milestone
   - Check client's wallet address and transaction history

4. **Deliver Work & Submit Milestones**
   - Upload deliverables with descriptions
   - Submit milestone for client review
   - Track approval status in real-time

5. **Claim Payments Instantly**
   - Once approved, claim payment with one click
   - Funds transfer directly from escrow to your wallet
   - Transaction confirms in < 1 second on Solana
   - View transaction on Solana Explorer

6. **Build Your Reputation**
   - Earn trust points with each completed project
   - Climb tiers: Iron → Bronze → Silver → Gold
   - Showcase verified on-chain work history

---

## 🏗️ Technical Architecture

### **Frontend Stack**
```
React 18 + TypeScript
├── TailwindCSS - Utility-first styling
├── shadcn/ui - Modern component library
├── Lucide Icons - Beautiful icon set
├── React Router - Client-side routing
├── Tanstack Query - Data fetching & caching
└── Solana Wallet Adapter - Web3 wallet integration
```

### **Backend Stack**
```
Node.js + Express
├── Prisma ORM - Type-safe database access
├── PostgreSQL - Relational database
├── JWT Authentication - Secure auth tokens
├── Socket.io - Real-time messaging
└── AWS S3 - File storage
```

### **Blockchain Layer**
```
Solana (Anchor Framework)
├── Rust Smart Contracts
├── PDA-based Escrow Accounts
├── Milestone Approval System
├── Automated Payment Release
└── On-chain Transaction Verification
```

### **System Architecture Diagram**
```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │◄────►│   Express    │◄────►│  PostgreSQL │
│  Frontend   │      │   Backend    │      │   Database  │
└──────┬──────┘      └──────┬───────┘      └─────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌─────────────────────────────────────────┐
│         Solana Blockchain               │
│  ┌─────────────────────────────────┐   │
│  │   Smart Contract (Anchor/Rust)  │   │
│  │  • Escrow Creation              │   │
│  │  • Milestone Approval           │   │
│  │  • Payment Claims               │   │
│  │  • Refund Logic                 │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Solana CLI (for smart contract deployment)
- Phantom or Solflare wallet

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/solana-lance-hq.git
cd solana-lance-hq
```

2. **Setup Backend**
```bash
cd http-backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, AWS credentials

# Setup database
npx prisma migrate deploy
npx prisma generate
```

3. **Setup Frontend**
```bash
cd ../frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with VITE_SOLANA_RPC_URL
```

4. **Setup Socket Server**
```bash
cd ../socket-server
npm install

# Configure environment
cp .env.example .env
```

5. **Run the Platform**
```bash
# Terminal 1 - Backend
cd http-backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Socket Server
cd socket-server
npm run dev
```

6. **Access the Platform**
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Socket Server: http://localhost:3001

---

## 🔐 Smart Contract Details

### Program Information
- **Program ID**: `BZicjRE3jR6YVWYof7pGSFwqJpJVEBZkY7xzfUimrjhm`
- **Network**: Solana Devnet (Mainnet ready)
- **Framework**: Anchor 0.30.1
- **Language**: Rust

### Core Functions
```rust
// Fund escrow with 3 milestone payments
pub fn fund_job(
    ctx: Context<FundJob>,
    job_id: String,
    milestone1: u64,
    milestone2: u64,
    milestone3: u64
) -> Result<()>

// Recruiter approves completed milestone
pub fn approve_milestone_payment(
    ctx: Context<ApproveMilestone>,
    milestone_index: u8
) -> Result<()>

// Freelancer claims approved payment
pub fn claim_milestone(
    ctx: Context<ClaimMilestone>,
    milestone_index: u8
) -> Result<()>

// Refund recruiter if no milestones approved
pub fn cancel_job(ctx: Context<CancelJob>) -> Result<()>
```

### Security Features
- ✅ PDA-based escrow (no private keys)
- ✅ Double-claim prevention
- ✅ Approval-gated payments
- ✅ Refund protection after approval
- ✅ Access control with `has_one` constraints

---

## 🎨 Key Features

### 💎 Core Platform Features
- **Job Marketplace**: Post and browse freelance opportunities
- **Smart Applications**: Submit proposals with portfolios and estimates
- **Blockchain Escrow**: Automated fund locking and release
- **Milestone System**: 3-stage payment workflow
- **Real-time Messaging**: Project-based and direct messaging
- **File Uploads**: Resume, portfolio, and deliverable storage
- **Rating System**: Multi-dimensional feedback (quality, communication, professionalism)
- **Trust Scores**: Tiered reputation system (Gold/Silver/Bronze/Iron)
- **Transaction History**: Complete on-chain payment records
- **Wallet Verification**: Immutable wallet address tracking

### 🌐 Web3 Features
- **Wallet Integration**: Phantom, Solflare, and all Solana wallets
- **On-chain Verification**: Backend validates all blockchain transactions
- **Solana Explorer Links**: Direct links to view transactions
- **Real-time Balance Updates**: Live escrow balance monitoring
- **Crypto Payments**: Native SOL payments with instant settlement

### 🎯 User Experience
- **Dark Mode**: Eye-friendly interface with neon accents
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Toast Notifications**: Real-time feedback for all actions
- **Loading States**: Smooth transitions and skeleton loaders
- **Error Handling**: User-friendly error messages
- **Search & Filters**: Advanced job discovery tools

---

## 📊 Database Schema

### Core Models
- **Profile**: User accounts with skills, bio, and social links
- **UserRole**: Dual-role system (recruiter/freelancer)
- **Job**: Project listings with milestones and payment details
- **Application**: Freelancer proposals with portfolios
- **Project**: Active collaborations between users
- **Milestone**: 3-stage payment workflow tracking
- **Staking**: Escrow funding records
- **Transaction**: Complete blockchain transaction history
- **Rating**: Multi-dimensional feedback system
- **TrustPoint**: Reputation scoring and tier system
- **Message**: Project-based communication
- **DirectMessage**: User-to-user messaging
- **Notification**: Real-time alerts

---

## 🛣️ Roadmap

### Phase 1: MVP ✅ (Current)
- [x] Core platform functionality
- [x] Solana smart contract integration
- [x] Escrow creation and funding
- [x] Milestone approval and claiming
- [x] Basic messaging system
- [x] Rating and reputation system

### Phase 2: Enhanced Features 🚧 (In Progress)
- [ ] Dispute resolution workflow
- [ ] Arbitration system with platform mediators
- [ ] Variable milestone counts (not just 3)
- [ ] Partial payment releases
- [ ] Multi-currency support (USDC, USDT)
- [ ] Advanced search with AI recommendations

### Phase 3: Scale & Optimize 📅 (Planned)
- [ ] Mobile apps (iOS/Android)
- [ ] DAO governance for platform decisions
- [ ] Staking rewards for platform token
- [ ] NFT-based achievement badges
- [ ] Integration with other chains (cross-chain bridge)
- [ ] Enterprise features (team accounts, invoicing)

### Phase 4: Ecosystem 🔮 (Future)
- [ ] SolanaLance API for third-party integrations
- [ ] Freelancer insurance and benefits
- [ ] Educational platform for skill development
- [ ] Hackathons and bounty programs
- [ ] Global expansion with localization

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Solana Foundation** - For the incredible blockchain infrastructure
- **Anchor Framework** - Making Solana development accessible
- **shadcn/ui** - Beautiful component library
- **Vercel** - Hosting and deployment
- **Community** - All our early adopters and contributors

---

## 📞 Contact & Support

- **Website**: [solanalance.com](https://solanalance.com)
- **Twitter**: [@SolanaLance](https://twitter.com/solanalance)
- **Discord**: [Join our community](https://discord.gg/solanalance)
- **Email**: support@solanalance.com

---

<div align="center">

**Built with ❤️ on Solana**

*Empowering freelancers and clients with trustless, transparent collaboration*

[Get Started](https://solanalance.com) • [Documentation](https://docs.solanalance.com) • [Community](https://discord.gg/solanalance)

</div>
