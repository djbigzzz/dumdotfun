import { Link } from "wouter";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border-2 border-black rounded-lg p-8 text-center shadow-[6px_6px_0px_0px_rgba(232,39,42,1)]"
        data-testid="page-not-found"
      >
        <div
          className="text-7xl md:text-8xl font-black tracking-tighter text-red-500 mb-2"
          style={{ textShadow: "4px 4px 0px hsl(60 100% 50%)" }}
        >
          404
        </div>
        <h1 className="text-2xl font-black uppercase mb-3 text-gray-900">
          You got rugged.
        </h1>
        <p className="text-sm text-gray-600 mb-6 font-mono">
          This page didn't survive the bonding curve.
        </p>
        <Link href="/">
          <button
            className="font-mono font-bold border-2 px-6 py-3 uppercase text-sm transition-all bg-red-500 text-white border-black hover:translate-x-1 hover:translate-y-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
            data-testid="button-home"
          >
            Take me home
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
