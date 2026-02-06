import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Coins, Flame, Plus, User, Search } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";
import { useWallet } from "@/lib/wallet-context";

const navItems = [
  { path: "/tokens", label: "Tokens", icon: Coins, privateLabel: "TKNS" },
  { path: "/trending", label: "Trending", icon: Flame, privateLabel: "HOT" },
  { path: "/create", label: "Create", icon: Plus, privateLabel: "DEPLOY", isAction: true },
  { path: "/search", label: "Search", icon: Search, privateLabel: "SRCH" },
  { path: "/profile", label: "Profile", icon: User, privateLabel: "PRFL" },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { privateMode } = usePrivacy();
  const { connectedWallet } = useWallet();

  const isActive = (path: string) => {
    if (path === "/tokens" && (location === "/" || location === "/tokens")) return true;
    return location.startsWith(path);
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t-2 transition-colors duration-300 ${
        privateMode
          ? "bg-black/95 border-[#4ADE80]/30 backdrop-blur-md"
          : "bg-white border-black"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      data-testid="nav-mobile-bottom"
    >
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          if (item.path === "/profile" && !connectedWallet) {
            return null;
          }

          return (
            <Link key={item.path} href={item.path}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center justify-center py-2 px-3 min-w-[56px] rounded-lg transition-colors relative ${
                  item.isAction
                    ? privateMode
                      ? "text-black"
                      : "text-white"
                    : active
                    ? privateMode
                      ? "text-[#4ADE80]"
                      : "text-red-500"
                    : privateMode
                    ? "text-[#4ADE80]/50"
                    : "text-gray-500"
                }`}
                data-testid={`nav-mobile-${item.label.toLowerCase()}`}
              >
                {item.isAction ? (
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center -mt-3 border-2 ${
                      privateMode
                        ? "bg-[#4ADE80] border-[#4ADE80]/50 shadow-[0_0_15px_rgba(57,255,20,0.4)]"
                        : "bg-red-500 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span
                  className={`text-[10px] font-bold mt-0.5 ${
                    item.isAction ? (privateMode ? "text-[#4ADE80]" : "text-red-500") : ""
                  }`}
                >
                  {privateMode ? item.privateLabel : item.label}
                </span>
                {active && !item.isAction && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className={`absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${
                      privateMode ? "bg-[#4ADE80]" : "bg-red-500"
                    }`}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
