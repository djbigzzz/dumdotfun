# Hackathon Submission Checklist

**Deadline: February 1, 2026**

Use this checklist to ensure your submission is complete before the deadline.

## ✅ Required for Submission

- [ ] **Demo Video (3 minutes max)**
  - [ ] Script written and practiced
  - [ ] Shows complete user flow (wallet connect → create token → private transfer → confidential bet)
  - [ ] Clear audio and screen recording
  - [ ] Uploaded to YouTube/Vimeo
  - [ ] Link added to README.md

- [ ] **Open Source Code**
  - [x] Repository is public
  - [x] MIT License added
  - [x] README.md is comprehensive
  - [ ] Add GitHub repository URL to submission

- [ ] **Deployed on Solana**
  - [x] Bonding curve program deployed to Devnet
  - [x] Contract addresses documented in README
  - [x] Verified on Solscan/Solana Explorer

- [ ] **Documentation**
  - [x] README.md with installation instructions
  - [x] Architecture diagrams
  - [x] API documentation
  - [x] Privacy integration deep-dives (SHADOWWIRE_HACKATHON.md, TOKEN2022_HACKATHON.md)
  - [ ] Add troubleshooting section

## 🎯 Privacy Hack Specific

- [ ] **Sponsor Integrations**
  - [x] ShadowWire integrated and documented
  - [x] Token-2022 Confidential integrated
  - [x] Helius RPC for all connections
  - [x] Inco Lightning SDK for betting
  - [x] Stealth addresses implemented
  - [x] Privacy Cash SDK integrated
  - [x] Arcium MPC integration
  - [x] PNP Exchange AI agents
  - [x] Privacy education content (encrypt.trade)
  - [x] Thank sponsors in README

- [ ] **Bounty Requirements**
  - [x] Each integration clearly explained
  - [x] Why each sponsor tech was chosen
  - [x] Bounty amounts listed in README
  - [ ] Test each integration before submission

## 🚀 Before Submission

- [ ] **Code Quality**
  - [ ] Run TypeScript type checking: `npm run check`
  - [ ] No critical console errors
  - [ ] Remove debug code and console.logs
  - [ ] Environment variables documented

- [ ] **Testing**
  - [ ] Run test suite: `npx tsx server/privacy/test-shadowwire.ts`
  - [ ] Manual testing on Devnet
  - [ ] Test on different browsers
  - [ ] Mobile responsive check

- [ ] **Performance**
  - [ ] Check bundle size
  - [ ] Optimize images
  - [ ] Test load times

- [ ] **Final Checks**
  - [ ] Update team contact info in README
  - [ ] Add GitHub/Twitter/Email to README
  - [ ] Spell check README and docs
  - [ ] Check all links work
  - [ ] Take final screenshots for submission

## 📝 Submission Form

- [ ] **Fill out official submission form**
  - [ ] Project name: dum.fun
  - [ ] Tagline: "Privacy-First Solana Token Launchpad"
  - [ ] Team members
  - [ ] Demo video URL
  - [ ] GitHub repository URL
  - [ ] Live deployment URL
  - [ ] Bounties you're applying for (check all that apply)
  - [ ] Project description
  - [ ] Technology stack

- [ ] **Submit at least 30 minutes before deadline**
  - This gives buffer for technical issues

## 🎬 Demo Video Script Template

### Intro (30 seconds)
```
"Hi! I'm [name], and I built dum.fun for the Solana Privacy Hack.

The problem: Blockchain payments are completely transparent.
Everyone can see your salary, your balance, your entire financial history.

dum.fun solves this by integrating 8 different privacy protocols
into a token launchpad with confidential prediction markets.

Let me show you how it works."
```

### Demo Flow (2 minutes)
1. **Connect wallet** → Show Phantom integration
2. **Airdrop Devnet SOL** → Click airdrop button
3. **Create a token** → Real SPL creation
4. **Enable privacy** → Open Privacy Hub
5. **Deposit to ShadowWire pool** → Show transaction
6. **Make private transfer** → Amount hidden on-chain
7. **Generate stealth address** → Show one-time address
8. **Create prediction market** → AI agent demo
9. **Place confidential bet** → Encrypted amount

### Technical Highlight (30 seconds)
```
"Under the hood, we're using:
- Bulletproofs for zero-knowledge proofs
- Token-2022 for confidential transfers
- Stealth addresses from Anoncoin
- Inco Lightning for encrypted betting
- And 4 more privacy protocols

All 8 integrations work together on Solana Devnet."
```

### Outro (30 seconds)
```
"dum.fun brings enterprise-grade privacy to Solana.
Our code is open source, MIT licensed, and ready for mainnet.

Check out the GitHub repo for docs and the technical deep-dive.

Thanks to Radr, Inco, Helius, and all our sponsors
for making this possible!"
```

## 📊 Final Stats to Highlight

- **8 privacy integrations** in one platform
- **$67K+ in bounties** targeted
- **22 tokens** supported by ShadowWire
- **100+ API endpoints** documented
- **~5,000 lines** of privacy-focused code
- **Type-safe** TypeScript throughout
- **Open source** MIT License

## 🚨 Common Mistakes to Avoid

- ❌ Don't submit late (aim for 30 min buffer)
- ❌ Don't forget the demo video
- ❌ Don't leave broken links in README
- ❌ Don't submit without testing
- ❌ Don't forget to thank sponsors
- ❌ Don't use mock data in demo
- ❌ Don't skip documentation
- ❌ Don't forget contract addresses

## ✨ Extra Credit

Want to stand out even more?

- [ ] Add automated tests (even 10-15 tests help)
- [ ] Create a blog post explaining your architecture
- [ ] Tweet about your project and tag sponsors
- [ ] Create a detailed technical write-up
- [ ] Add API rate limiting
- [ ] Split routes.ts into modules
- [ ] Add performance benchmarks

## 📅 Timeline

**7 days before deadline:**
- [ ] Complete all integrations
- [ ] Write final documentation

**3 days before:**
- [ ] Record demo video
- [ ] Final testing round
- [ ] Get feedback from friends

**1 day before:**
- [ ] Fill out submission form
- [ ] Triple-check all links
- [ ] Test video playback

**Day of deadline:**
- [ ] Submit with 30-minute buffer
- [ ] Celebrate! 🎉

---

**Good luck! You've got this! 🚀🔒**

Remember: Judges value honesty, clarity, and impact over perfection.
Show them what you've built and why it matters.
