# Dum.fun — Frontier Hackathon Video Scripts
### Colosseum Frontier 2026 | Submissions close May 12

---

> **RECORDING TIPS**
> - Each script reads in ~90 seconds at a comfortable pace
> - Screen share the live app at dum.fun while you talk
> - Demo cues are marked **[SHOW: ...]** — pause and interact with the app
> - Your energy matters more than memorising the words — use these as a guide

---

## SCRIPT 1 — Helius Track

**[Open on the Dum.fun homepage with a few tokens visible]**

Dum.fun is a meme token launchpad on Solana where every token you launch comes with a built-in prediction market on day one — and the whole thing runs on Helius.

When a user creates a token, that single action involves seven or eight Helius RPC calls: checking wallet balance, fetching a recent blockhash, submitting the transaction, and then polling for confirmation with up to ten retry attempts using exponential backoff. If Helius returns a 503, we retry. If it returns a signature not found yet, we wait and retry. The token does not go live until Helius confirms it on-chain.

**[SHOW: The Explore page — scroll through the token cards]**

Every market cap you see on this page was refreshed from Helius. We run a background job every 60 seconds that reads the bonding curve accounts from Helius for all active tokens and writes the price, market cap, and bonding curve progress back to our database. The homepage is always fresh without hammering the chain on every page load.

**[SHOW: Click into a token, watch the price chart update]**

The candlestick chart on the token detail page pulls trade events that we index using Helius webhooks. Every buy and sell hits our Helius webhook endpoint, which writes to our OHLC table in real time.

Helius is not a nice-to-have on dum.fun. It is the backbone of every transaction, every price update, and every trade event. Without it, the app does not function.

Dum.fun — built on Helius.

---

## SCRIPT 2 — Raydium Track

**[Open on a token detail page that shows "Graduated to Raydium"]**

On dum.fun, every token lives on a bonding curve until it earns its place on a real DEX. When enough people buy in and the curve fills — 85 SOL — the token automatically graduates to a Raydium CPMM pool. No manual step, no admin button. It just happens.

**[SHOW: A graduated token's detail page with the Raydium pool link]**

Here is a token that graduated. The moment that threshold was hit, our graduation service called the Raydium SDK V2 to create a CPMM pool, seed it with the tokens and SOL from the bonding curve, and record the pool ID in our database. From that point on, trading switches from our custom bonding curve program to Raydium's AMM.

**[SHOW: The swap interface on a graduated token]**

For graduated tokens, the buy and sell buttons no longer talk to the bonding curve. They use Raydium. We fetch live swap quotes from the pool — slippage, price impact, fee breakdown — and build the swap transaction using the Raydium SDK V2's CurveCalculator. The user signs one transaction and the swap settles on Raydium.

**[SHOW: The price chart on a graduated token]**

Even the price chart switches source. For bonding curve tokens we use on-chain curve data. For graduated tokens we read reserves directly from the Raydium pool to keep the market cap accurate.

Bonding curve to Raydium, fully automated. That is the dum.fun graduation pipeline.

---

## SCRIPT 3 — Dune (Sim API) Track

**[Open on a user profile or token activity page]**

Dum.fun uses the Dune Sim API — specifically the SVM endpoint — to power two things: wallet portfolio data and token transaction history.

**[SHOW: A user profile page showing token holdings]**

When a user opens their profile, we hit `api.sim.dune.com/beta/svm` with their wallet address and get back a complete breakdown of every token they hold — mint address, symbol, balance, and USD value. This is not our own indexing. Dune's SIM API reads the chain state and hands it back in a clean structured response that we display directly in the UI.

**[SHOW: A token's activity feed with buy and sell transactions]**

The transaction activity feed on every token page also runs through Dune. We query the SVM transactions endpoint for a given mint address and get back a chronological list of transfers — who sent, who received, how many tokens, at what time. We parse that into a human-readable activity feed so anyone can see what is happening with a token in real time.

The key here is the SIM API header — `X-Sim-Api-Key` — which is different from Dune Analytics. We are using Dune's newer SVM-native simulation layer, not the legacy query engine.

One API key, real on-chain data for wallets and token activity — no custom indexer required. That is how Dune powers dum.fun's data layer.

---

## SCRIPT 4 — Umbra Track

**[Open on the prediction market section of a token page]**

Prediction markets are public by design. But when a whale wins a big bet on a meme token, they do not want their payout permanently linked to their wallet on-chain for every chain analysis tool to see. That is the problem Umbra solves on dum.fun.

**[SHOW: The prediction market payout screen with the Umbra privacy option]**

When a prediction market resolves, winners can choose a standard payout or an Umbra-shielded payout. With Umbra, we generate a stealth address derived from the recipient's public key using Umbra's ECDH-based stealth address scheme. The SOL is routed to that one-time stealth address — not the user's known wallet.

On-chain, observers see a transfer to an address that does not trace back to the winner's public wallet. Only the winner, using their Umbra viewing key, can prove they received it and sweep the funds. The amount and the recipient are both hidden.

**[SHOW: The Umbra pool status showing anonymity set size]**

The larger the anonymity set in Umbra's pool, the harder it is to guess who received what. We show the current pool depth and privacy score in the UI so users can make an informed decision before choosing the shielded route.

Dum.fun is the first prediction market launchpad to give winners a private exit. Umbra makes that possible without changing anything about how users place their bets.

---

## SCRIPT 5 — Cloak Track

**[Open on the prediction market payout settings or the shield button]**

Prediction market payouts on Solana are transparent. Every winner's wallet, every amount — visible forever. For dum.fun's high-stakes bettors, that is a real problem. Cloak fixes it.

**[SHOW: The Cloak shield button on the payout screen]**

We integrated `@cloak.dev/sdk-devnet` — Cloak's UTXO-based shielded pool running on Solana devnet with Groth16 zero-knowledge proofs. When a winner claims a shielded payout, here is what happens:

The platform deposits the winning SOL into the Cloak shielded pool as a UTXO commitment. That commitment is cryptographically hashed — the amount is hidden. Then the pool performs a shielded withdrawal to the recipient. The link between the market, the winner's wallet, and the payout amount is broken at the protocol level.

**[SHOW: The server code in cloak.ts briefly — or just describe it while showing the UI]**

Our server holds the platform authority keypair and signs the Cloak deposit and withdrawal on behalf of the protocol. The devnet program — `Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h` — handles the proof verification. The relay at `api.devnet.cloak.ag` coordinates the UTXO state.

Prediction market winners deserve privacy. Cloak gives us the cryptographic guarantee to deliver it — on-chain, verifiable, and without trusting us to keep a secret.

---

## SCRIPT 6 — Adevar Labs Track ($50K Audit Credits)

**[Open on the dum.fun homepage or the GitHub repo]**

Dum.fun is not a toy. It has a custom Solana bonding-curve program, a prediction market settlement program, and a confidential betting program — three separate on-chain programs that will handle real user funds when we go to mainnet. Getting those audited is not optional. That is why we applied for Adevar audit credits.

**[SHOW: The token launch flow — create token, bonding curve progress bar]**

The bonding-curve program powers every token launch. It manages the virtual SOL and token reserves, enforces the price formula, collects platform fees, and triggers graduation when the threshold is hit. Any math error in the reserve calculations is a direct financial exploit.

**[SHOW: A prediction market with YES and NO pools]**

The prediction market program handles bet pools, tracks positions per wallet, and executes payouts when a market resolves. A bug in the pool accounting or the resolver authority check would let someone drain the pool.

**[SHOW: The Cloak shield button briefly]**

The confidential betting program layers zero-knowledge proofs on top of that — adding ciphertext handling and shielded UTXO commitments. This is the most security-critical piece of the stack.

We have registered all three programs for Adevar's audit process. The findings will be public, which is how it should be. Security on a launchpad is not a feature — it is the foundation. Adevar makes that foundation solid before mainnet.

---

## SCRIPT 7 — Solana Mobile / Saga Track

**[Open on a phone with the dum.fun Android app installed — or show the APK build screen]**

Meme tokens are not a desktop activity. They are something you see on your phone, decide in five seconds, and ape into immediately. Dum.fun is built for that. We ship a native Android app.

**[SHOW: The app running on an Android device or emulator]**

The Android app is built with Capacitor — dum.fun's web app packaged as a native APK with app ID `fun.dum.app`. It is not a web wrapper with a browser bar. It has a native splash screen, native status bar styling, and deep linking so token pages open directly in the app.

**[SHOW: Connecting a wallet on mobile — Saga or Phantom mobile]**

For wallet connections on mobile, we use `@solana-mobile/wallet-adapter-mobile`. On a Saga or Seeker device, the Mobile Wallet Adapter protocol handles signing natively — no QR code, no browser extension, no copy-pasting. The user approves transactions in their mobile wallet and comes straight back to the app.

**[SHOW: Launching a token or placing a bet on mobile]**

Every feature works on mobile. Token launches, bonding curve trades, prediction market bets, the leaderboard — all touch-optimised with the same Solana devnet backend.

We are building for the Solana Mobile ecosystem because that is where the next wave of meme token traders is coming from. Fast, native, and Saga-ready.

---

## SCRIPT 8 — SendGrid / Eitherway Track ("Build Live dApp")

**[Open on the dum.fun homepage or the waitlist / notification section]**

Dum.fun uses SendGrid for transactional email — specifically waitlist confirmation when users sign up for early access or notifications.

**[SHOW: The waitlist or email notification flow in the app]**

When a user submits their email on dum.fun, our server calls the SendGrid API via the `@sendgrid/mail` package. The integration is wired through Replit's secure connector system — no API key in environment variables or code. The SendGrid client is instantiated fresh on every request so expired tokens never cause a silent failure.

**[SHOW: The broader app — Explore, token detail, prediction markets]**

But the Eitherway track is about building a live dApp, so let me show you the full picture. Dum.fun is a complete, live Solana application:

- Token launches with bonding curves — real on-chain transactions on devnet
- Prediction markets created automatically on every new token
- A gamified points and quests system with a seasonal SOL leaderboard
- Professional OHLC candlestick charts on every token
- Automatic DEX graduation when bonding curves fill
- Privacy-preserving payouts via Cloak and Umbra
- SEO-optimised pages so tokens are discoverable on Google

**[SHOW: A token detail page with chart, prediction market, and trading panel all visible]**

This is a full-stack live dApp — TypeScript frontend and backend, PostgreSQL, Helius RPC, Raydium SDK, Dune Sim API, and SendGrid all working together in production. Not a demo. Not mocked data. Real devnet transactions.

Dum.fun is live, it works, and it is ready.

---

## QUICK REFERENCE — What to show in each video

| Track | Must-show screens |
|---|---|
| Helius | Explore page loading, token detail chart, confirmation toast |
| Raydium | Graduated token page, swap UI, pool stats |
| Dune | Wallet portfolio / profile, token activity feed |
| Umbra | Prediction market payout screen, Umbra shield option |
| Cloak | Cloak shield button, payout flow |
| Adevar | Token launch flow, prediction market, mention GitHub programs |
| Solana Mobile | Android app on device, wallet connect on mobile, any transaction |
| SendGrid / Eitherway | Email signup, then full app tour |
