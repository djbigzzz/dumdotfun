import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/">
          <button data-testid="link-back-home" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Dum.fun
          </button>
        </Link>
        <h1 data-testid="text-legal-title" className="text-3xl font-black mb-8 border-b-4 border-red-500 pb-4">{title}</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-gray-300 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-sm text-gray-500">Last updated: February 6, 2026</p>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">1. Introduction</h2>
        <p>Dum.fun ("we," "our," or "us") is a decentralized application (dApp) built on the Solana blockchain. This Privacy Policy explains how we collect, use, and protect your information when you use our platform.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">2. Information We Collect</h2>
        <p><strong className="text-white">Wallet Address:</strong> When you connect your Solana wallet, we collect your public wallet address to facilitate transactions and display your profile.</p>
        <p><strong className="text-white">Transaction Data:</strong> All transactions are recorded on the Solana blockchain and are publicly accessible. We store transaction references in our database for display purposes.</p>
        <p><strong className="text-white">Email (Optional):</strong> If you join our waitlist, we collect your email address with your consent.</p>
        <p><strong className="text-white">Usage Data:</strong> We may collect anonymous usage analytics to improve the platform.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">3. Privacy Features</h2>
        <p>Dum.fun integrates multiple privacy technologies to protect user financial data:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Confidential betting with encrypted amounts (Inco Lightning SDK)</li>
          <li>Stealth addresses for unlinkable token receiving</li>
          <li>Token-2022 confidential transfers with Pedersen commitments</li>
          <li>Privacy Cash for breaking on-chain transaction links</li>
          <li>ShadowWire ZK transfers with Bulletproof proofs</li>
          <li>Arcium MPC for multi-party confidential operations</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">4. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>To facilitate token creation and prediction market transactions</li>
          <li>To display your profile and activity on the platform</li>
          <li>To send waitlist communications (with your consent)</li>
          <li>To improve our platform and user experience</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">5. Data Storage</h2>
        <p>We store minimal off-chain data in a PostgreSQL database. On-chain data is stored permanently on the Solana blockchain. We do not sell your data to third parties.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">6. Blockchain Transparency</h2>
        <p>Please note that Solana is a public blockchain. While our privacy features help obscure transaction details, your public wallet address and non-private transactions are visible on-chain. Use our privacy features for enhanced financial privacy.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">7. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Helius RPC for Solana blockchain access</li>
          <li>SendGrid for email communications</li>
          <li>Solana Mobile Wallet Adapter for wallet connections</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">8. Contact</h2>
        <p>For privacy concerns, contact us at <a href="mailto:team@dum.fun" className="text-red-400 hover:text-red-300">team@dum.fun</a>.</p>
      </section>
    </LegalLayout>
  );
}

export function EULA() {
  return (
    <LegalLayout title="End User License Agreement">
      <p className="text-sm text-gray-500">Last updated: February 6, 2026</p>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">1. Agreement</h2>
        <p>By using Dum.fun, you agree to this End User License Agreement ("EULA"). If you do not agree, do not use the application.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">2. License Grant</h2>
        <p>We grant you a limited, non-exclusive, non-transferable license to use the Dum.fun application for personal, non-commercial purposes in connection with the Solana blockchain.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">3. Blockchain Interactions</h2>
        <p>You acknowledge that:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>All token creation and prediction market transactions occur on the Solana blockchain</li>
          <li>Blockchain transactions are irreversible once confirmed</li>
          <li>You are solely responsible for managing your wallet and private keys</li>
          <li>Token values can fluctuate significantly and you may lose your investment</li>
          <li>The platform currently operates on Solana Devnet for testing purposes</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">4. Prohibited Uses</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Use the platform for illegal activities or money laundering</li>
          <li>Attempt to exploit, hack, or compromise the platform's smart contracts</li>
          <li>Create tokens that infringe on intellectual property rights</li>
          <li>Manipulate prediction markets through coordinated activity</li>
          <li>Use automated bots to gain unfair advantage</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">5. Disclaimer of Warranties</h2>
        <p>THE APPLICATION IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY CONTENT OR TRANSACTIONS ON THE PLATFORM.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">6. Limitation of Liability</h2>
        <p>IN NO EVENT SHALL DUM.FUN BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE PLATFORM, INCLUDING LOSS OF TOKENS, FUNDS, OR DATA.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">7. Modifications</h2>
        <p>We reserve the right to modify this EULA at any time. Continued use of the application after changes constitutes acceptance of the modified terms.</p>
      </section>
    </LegalLayout>
  );
}

export function Copyright() {
  return (
    <LegalLayout title="Copyright Notice">
      <p className="text-sm text-gray-500">Last updated: February 6, 2026</p>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">Copyright</h2>
        <p>&copy; 2026 Dum.fun. All rights reserved.</p>
        <p>The Dum.fun name, logo, and all associated branding are the property of Dum.fun. The application source code, design, and content are protected by copyright law.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">Open Source Components</h2>
        <p>This application uses open-source software components licensed under their respective licenses, including but not limited to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>React (MIT License)</li>
          <li>Solana Web3.js (Apache 2.0 License)</li>
          <li>Capacitor (MIT License)</li>
          <li>Tailwind CSS (MIT License)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">User-Generated Content</h2>
        <p>Tokens created on the platform and their associated metadata (names, symbols, descriptions, images) are the responsibility of their creators. Dum.fun does not claim ownership of user-generated content.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mt-6 mb-3">Contact</h2>
        <p>For copyright inquiries, contact <a href="mailto:team@dum.fun" className="text-red-400 hover:text-red-300">team@dum.fun</a>.</p>
      </section>
    </LegalLayout>
  );
}
