# 🚀 SolanaLance - Decentralized Freelancing Platform

A complete Web3 freelancing marketplace built on Solana blockchain with milestone-based payments, automated escrow, and trust-based reputation system.

![SolanaLance](https://img.shields.io/badge/Solana-Devnet-14F195?style=for-the-badge&logo=solana)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)

## ✨ Features

### 🔐 **Authentication & Wallet Integration**
- Dual role system (Freelancer/Recruiter)
- Multi-wallet support (Phantom, Solflare, Torus, Ledger)
- Email + Wallet authentication
- Secure wallet signature verification

### 💼 **Job Management**
- **For Recruiters:**
  - Multi-step job creation wizard
  - 3-stage milestone payment structure
  - Applicant management interface
  - Real-time application tracking
  - Draft and publish options

- **For Freelancers:**
  - Advanced job filtering & search
  - Skills, price range, tier-based filters
  - Cover letter submissions
  - Portfolio link attachments
  - Application status tracking

### 💰 **Blockchain-Powered Payments**
- **20% minimum staking requirement**
- Automated escrow on Solana blockchain
- Milestone-based payment releases
- Real-time balance checking
- Transaction history with Solana Explorer links
- SOL payments with on-chain verification

### 📊 **Project Workspace**
- Visual progress timeline
- Milestone submission system
- File and link attachments
- Review and approval workflow
- Revision request functionality
- Real-time status updates
- **In-project messaging** with live updates

### ⭐ **Rating & Trust System**
- Post-project mutual ratings
- 4-criteria rating system:
  - Overall satisfaction
  - Communication
  - Quality of work
  - Professionalism
- Automated trust points calculation
- Tier system (Gold/Silver/Bronze/Iron)
- Public/private review options
- Success rate tracking

### 👤 **User Profiles**
- Professional profile pages
- Avatar and bio customization
- Skills showcase (3-15 skills)
- Company information
- Hourly rate display
- Project statistics
- Public reviews display
- Trust badge and tier

### 💬 **Communication**
- Real-time project messaging
- Read receipts
- Message notifications
- Auto-scrolling chat interface
- Real-time subscriptions via Supabase

### 📈 **Comprehensive Dashboards**
- **Recruiter Dashboard:**
  - Total jobs statistics
  - Open/In Progress/Completed tabs
  - Applicant counts
  - Total spending tracking
  
- **Freelancer Dashboard:**
  - Trust points display
  - Active projects
  - Application tracking
  - Earnings statistics

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router v6** - Navigation
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **date-fns** - Date formatting
- **Lucide React** - Icons
- **Sonner** - Toast notifications

### Blockchain
- **@solana/web3.js** - Solana interactions
- **@solana/wallet-adapter-react** - Wallet integration
- **Multiple wallet support:**
  - Phantom Wallet
  - Solflare Wallet
  - Torus Wallet
  - Ledger Hardware Wallet

### Backend & Database
- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Row Level Security (RLS)** - Data protection
- **Real-time subscriptions** - Live updates
- **Edge Functions** - Serverless functions

## 📦 Installation

### Prerequisites
- Node.js 18+ or Bun
- Solana wallet (Phantom recommended)
- Supabase account

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/solana-lance-hq.git
cd solana-lance-hq
```

### 2. Install dependencies
```bash
npm install
# or
bun install
```

### 3. Environment Setup
Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
Run the migrations in your Supabase project:
```bash
# Apply the schema migration
supabase db push
```

The migration file is located at:
`supabase/migrations/20251011190000_create_solanalance_schema.sql`

### 5. Start Development Server
```bash
npm run dev
# or
bun dev
```

Visit `http://localhost:5173`

## 🗄️ Database Schema

### Core Tables
- **profiles** - User information
- **user_roles** - Freelancer/Recruiter designation
- **trust_points** - Reputation system
- **jobs** - Job postings
- **job_stages** - 3-stage milestone definitions
- **applications** - Job applications
- **projects** - Active project tracking
- **milestones** - Milestone submissions & approvals
- **staking** - Escrow stake tracking
- **transactions** - Blockchain transaction records
- **ratings** - User ratings & reviews
- **messages** - Project communication
- **notifications** - User notifications
- **user_wallets** - Wallet addresses

### Key Features
- Comprehensive RLS policies
- Automated triggers
- Database functions for trust calculation
- Indexes for performance
- Real-time subscriptions

## 🎯 User Journey

### For Recruiters
1. **Sign up** as a Recruiter
2. **Create job** with 3 payment milestones
3. **Review applications** from freelancers
4. **Select freelancer** and stake 20% minimum
5. **Review milestones** as they're submitted
6. **Approve work** - payment auto-releases
7. **Rate freelancer** after completion

### For Freelancers
1. **Sign up** as a Freelancer
2. **Browse jobs** with advanced filters
3. **Apply** with cover letter & portfolio
4. **Submit milestones** when selected
5. **Receive payments** automatically on approval
6. **Rate recruiter** after completion
7. **Build trust score** over time

## 🔥 Key Highlights

### Blockchain Features
✅ Real Solana transactions on devnet  
✅ Wallet signature verification  
✅ Escrow-based payment security  
✅ On-chain transaction records  
✅ Solana Explorer integration  

### Trust System
✅ Dynamic tier calculation  
✅ Trust points algorithm  
✅ Success rate tracking  
✅ Mutual rating system  
✅ Public review system  

### User Experience
✅ Smooth animations & transitions  
✅ Real-time updates  
✅ Mobile responsive  
✅ Intuitive navigation  
✅ Loading states & skeletons  
✅ Toast notifications  
✅ Error handling  

## 🎨 Design System

### Colors
- **Primary Purple:** `#7C3AED`
- **Secondary Cyan:** `#14F195`
- **Success Green:** `#10B981`
- **Warning Yellow:** `#F59E0B`
- **Error Red:** `#EF4444`
- **Solana Gradient:** `#14F195 → #9945FF`

### Typography
- **Font:** Inter / Geist Sans
- **Headings:** Bold, letter-spacing optimized
- **Body:** Regular, 1.5 line-height

### Components
- Glass morphism effects
- Gradient accents
- Hover lift animations
- Smooth transitions
- Micro-interactions

## 🚀 Deployment

### Build for Production
```bash
npm run build
# or
bun run build
```

### Preview Build
```bash
npm run preview
# or
bun run preview
```

### Deploy to Vercel
```bash
vercel deploy
```

## 🔧 Configuration

### Solana Network
Default: **Devnet**

To change network, edit `src/contexts/SolanaWalletContext.tsx`:
```typescript
const network = WalletAdapterNetwork.Devnet; // or Mainnet
```

### Supabase
Configure your Supabase project URL and keys in `.env`

## 📝 Environment Variables

```env
VITE_SUPABASE_URL=           # Your Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Your Supabase anon key
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Solana Foundation** - Blockchain infrastructure
- **Supabase** - Backend platform
- **shadcn/ui** - Component library
- **Vercel** - Hosting platform

## 📞 Support

For support, email support@solanalance.io or join our Discord community.

## 🗺️ Roadmap

### Phase 2 (Coming Soon)
- [ ] Dispute resolution system
- [ ] Multi-freelancer team projects
- [ ] Video call integration
- [ ] Mobile apps (iOS/Android)
- [ ] NFT achievement badges

### Phase 3 (Future)
- [ ] AI-powered job matching
- [ ] On-chain skill verification
- [ ] DAO governance
- [ ] Multiple token support (USDC)
- [ ] Advanced analytics dashboard

---

**Built with ❤️ using Solana & React**

*Decentralize your freelancing journey with SolanaLance*
