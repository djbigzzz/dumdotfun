import { useState } from "react";
import { Layout } from "@/components/layout";
import { TokenCard } from "@/components/token-card";
import { MOCK_TOKENS } from "@/lib/mockData";
import { motion } from "framer-motion";
import { AlertOctagon } from "lucide-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchForm, setLaunchForm] = useState({ name: "", ticker: "", admitted: false });

  const handleLaunch = () => {
    setIsLaunching(true);
    // Simulate launch delay
    setTimeout(() => {
      setIsLaunching(false);
      alert("LAUNCHED! (AND PROBABLY ALREADY RUGGED)");
      // In a real app, we'd redirect to the new token page
    }, 2000);
  };

  return (
    <Layout>
      {/* Village Idiot Section */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <AlertOctagon className="text-red-600 w-8 h-8 animate-spin-slow" />
          <h2 className="text-2xl md:text-4xl text-red-600 border-2 border-red-600 px-4 py-1 inline-block bg-black">
            THE VILLAGE IDIOT
          </h2>
        </div>
        <div className="max-w-md mx-auto md:mx-0 transform rotate-1">
          <TokenCard token={MOCK_TOKENS[0]} isVillageIdiot={true} />
        </div>
      </section>

      {/* Token Grid */}
      <section>
        <div className="flex justify-between items-end mb-6 border-b-2 border-neutral-800 pb-2">
          <h2 className="text-xl text-neutral-400 font-mono">
            ACTIVE DISASTERS ({MOCK_TOKENS.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_TOKENS.slice(1).map((token) => (
            <TokenCard key={token.id} token={token} />
          ))}
        </div>
      </section>

      {/* Launch Floating Button */}
      <Dialog>
        <DialogTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-yellow-400 text-black font-black text-xl px-8 py-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all z-50 uppercase"
          >
            START A DISASTER
          </motion.button>
        </DialogTrigger>
        <DialogContent className="bg-black border-4 border-red-600 text-red-600 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase text-center underline decoration-wavy decoration-yellow-400">
              CREATE NEW MISTAKE
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-green-500 font-mono">TOKEN NAME</Label>
              <Input 
                id="name" 
                placeholder="e.g. SafePonzi" 
                className="bg-neutral-900 border-2 border-red-900 text-white font-mono rounded-none focus:ring-0 focus:border-yellow-400"
                value={launchForm.name}
                onChange={(e) => setLaunchForm({...launchForm, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ticker" className="text-green-500 font-mono">TICKER</Label>
              <Input 
                id="ticker" 
                placeholder="$SCAM" 
                className="bg-neutral-900 border-2 border-red-900 text-white font-mono rounded-none focus:ring-0 focus:border-yellow-400"
                value={launchForm.ticker}
                onChange={(e) => setLaunchForm({...launchForm, ticker: e.target.value})}
              />
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <Checkbox 
                id="warning" 
                className="border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:text-black rounded-none"
                checked={launchForm.admitted}
                onCheckedChange={(c) => setLaunchForm({...launchForm, admitted: c === true})}
              />
              <Label htmlFor="warning" className="text-xs font-mono text-neutral-400 leading-tight">
                I ADMIT THIS IS A TERRIBLE IDEA AND I ACCEPT FULL RESPONSIBILITY FOR RUINING THE ECONOMY
              </Label>
            </div>

            <button 
              onClick={handleLaunch}
              disabled={!launchForm.admitted || isLaunching}
              className="w-full mt-4 bg-red-600 text-black font-black text-xl py-4 border-2 border-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            >
              {isLaunching ? "INITIALIZING RUIN..." : "LAUNCH TOKEN"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
