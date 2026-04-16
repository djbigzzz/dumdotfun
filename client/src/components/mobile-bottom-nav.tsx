import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Coins, Flame, Plus, User, Trophy, Star } from "lucide-react";

const navItems = [
  { path: "/tokens", label: "Tokens", icon: Coins },
  { path: "/trending", label: "Trending", icon: Flame },
  { path: "/create", label: "Create", icon: Plus, isAction: true },
  { path: "/quests", label: "Quests", icon: Star },
  { path: "/leaderboard", label: "Ranks", icon: Trophy },
  { path: "/profile", label: "Profile", icon: User },
];

export function MobileBottomNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/tokens" && (location === "/" || location === "/tokens")) return true;
    return location.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t-2 bg-white border-black"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      data-testid="nav-mobile-bottom"
    >
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <Link key={item.path} href={item.path}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center justify-center py-2 px-2 min-w-[48px] rounded-lg transition-colors relative ${
                  item.isAction
                    ? "text-white"
                    : active
                    ? "text-red-500"
                    : "text-gray-500"
                }`}
                data-testid={`nav-mobile-${item.label.toLowerCase()}`}
              >
                {item.isAction ? (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center -mt-3 border-2 bg-red-500 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Icon className="w-5 h-5" />
                  </div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span
                  className={`text-[10px] font-bold mt-0.5 ${
                    item.isAction ? "text-red-500" : ""
                  }`}
                >
                  {item.label}
                </span>
                {active && !item.isAction && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-red-500"
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
