# Gotas Open

A Web3 loyalty platform that turns engagement into real value. Built on blockchain, validated in production, now open source for any brand or community.

## The Idea

Traditional loyalty programs are outdated — stamp cards, points that expire, zero transparency. Gotas replaces all of that with NFT cards and on-chain tokens.

Users earn collectible cards by engaging — attending events, interacting on social media, or consuming at partner stores. These cards are NFTs that can be exchanged for USDC, discounts, or traded with other collectors. The more you collect, the more access you unlock.

Already deployed and generating thousands of dollars in production. Fully transparent, validated by thousands of real users.

## Who Is This For?

- **Brands and retailers** building token-incentivized loyalty programs
- **Institutions** creating transparent incentive mechanisms
- **Any community** that needs proven Web3 loyalty infrastructure
- **Sports clubs** launching fan engagement programs

## Key Features

- **NFT Cards** — Collectible cards with rarity tiers and album completion
- **Token Exchange** — Cards exchangeable for USDC, tokens, or partner discounts
- **PIX Payments** — Buy tokens with Brazil's instant payment system
- **Staking** — Stake NFTs and tokens for rewards
- **Marketplace** — P2P NFT trading
- **Consumer Analytics** — Detailed visibility into engagement and spending patterns
- **Admin Panel** — Minting, categories, users, and analytics management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS v4, Radix UI, shadcn/ui |
| Web3 | Wagmi v2, Viem v2, Privy Auth |
| Blockchain | Chiliz Chain (88888) |
| Minting | Thirdweb Engine (async queue) |
| Database | PostgreSQL |
| Payments | BRLA API (PIX) |
| Storage | AWS S3 |

## Getting Started

```bash
git clone https://github.com/gotasapp/gotas-open.git
cd gotas-open
npm install
cp .env.example .env.local   # Fill in your values
npm run dev                   # Start dev server (port 3005)
```

Requires Node.js >= 20 and a PostgreSQL database.

## Project Structure

```
src/
├── app/api/        # API routes (payments, minting, staking)
├── app/adm/        # Admin panel
├── components/     # UI components
├── hooks/          # Custom React hooks
├── lib/            # Core utilities (DB, auth, errors)
├── utils/          # Helpers
└── abis/           # Smart contract ABIs
```

## Documentation & Roadmap

This repository contains the full source code. Documentation and updates will be released progressively.

**Coming soon:**
- Architecture diagrams
- API reference
- Deployment guides
- Contributing guidelines
- Smart contract docs

## License

This project is open source. License details coming soon.

---

Built by [Gotas](https://gotas.social)
