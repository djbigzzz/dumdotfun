import { Link } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-500 space-y-3">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4 text-xs" aria-label="Site navigation">
            <a href="/tokens" className="transition-colors hover:text-black" data-testid="footer-link-tokens">All Tokens</a>
            <a href="/trending" className="transition-colors hover:text-black" data-testid="footer-link-trending">Trending</a>
            <a href="/create" className="transition-colors hover:text-black" data-testid="footer-link-create">Launch Token</a>
            <a href="/quests" className="transition-colors hover:text-black" data-testid="footer-link-quests">Quests</a>
            <a href="/leaderboard" className="transition-colors hover:text-black" data-testid="footer-link-leaderboard">Leaderboard</a>
            <a href="/docs" className="transition-colors hover:text-black" data-testid="footer-link-docs">Documentation</a>
            <a href="/careers" className="transition-colors hover:text-black" data-testid="footer-link-careers">Careers</a>
          </nav>
          <div className="flex items-center justify-center gap-4 mb-3 text-xs">
            <a href="/legal/privacy" className="transition-colors underline hover:text-black" data-testid="link-privacy-policy">Privacy Policy</a>
            <span>|</span>
            <a href="/legal/eula" className="transition-colors underline hover:text-black" data-testid="link-terms">Terms of Service</a>
            <span>|</span>
            <a href="/legal/copyright" className="transition-colors underline hover:text-black" data-testid="link-copyright">Copyright</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
