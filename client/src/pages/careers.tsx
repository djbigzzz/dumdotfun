import { Layout } from "@/components/layout";
import { usePageTitle } from "@/hooks/use-page-title";
import { motion } from "framer-motion";
import { Briefcase, Shield, Rocket, Trophy, Users, Zap } from "lucide-react";

const openings = [
  { title: "Frontend Engineer", type: "Contract", focus: "React, TypeScript, UX polish" },
  { title: "Solana / Rust Engineer", type: "Contract", focus: "On-chain programs, integrations" },
  { title: "Design Engineer", type: "Part-time", focus: "Neo-brutalist UI, motion, alignment" },
];

const perks = [
  "Build on a live Solana devnet product",
  "Ship fast on token launch, quests, and leaderboard flows",
  "Work on real on-chain features, not mockups",
  "Help shape the next phase of dum.fun",
];

export default function CareersPage() {
  usePageTitle("/careers");

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6 pb-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-3">
            <Briefcase className="w-8 h-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-black text-black" data-testid="text-careers-title">Careers</h1>
              <p className="text-sm text-gray-600">Join the team building dum.fun</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-600 max-w-2xl">
            We’re looking for sharp builders who care about shipping beautiful, fast, on-chain product experiences.
            dum.fun is a real Solana devnet launchpad with bonding curves, quests, seasons, and live token pages.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 mb-4 text-black font-black">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Open Roles
            </div>
            <div className="space-y-3">
              {openings.map((job) => (
                <div key={job.title} className="rounded-lg border border-gray-200 bg-gray-50 p-3" data-testid={`card-role-${job.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-black">{job.title}</div>
                      <div className="text-xs text-gray-500">{job.focus}</div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-red-100 text-red-600 border border-red-200">{job.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 mb-4 text-black font-black">
              <Shield className="w-5 h-5 text-green-500" />
              What We Want
            </div>
            <div className="space-y-2">
              {perks.map((perk) => (
                <div key={perk} className="flex items-start gap-2 text-sm text-gray-700">
                  <Zap className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 mb-3 font-black text-black">
            <Rocket className="w-5 h-5 text-red-500" />
            How to Apply
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Email <span className="font-bold text-black">jobs@dum.fun</span> with your portfolio/GitHub and what you’d ship first.</p>
            <p>We care more about execution than resumes. If you’ve built real product, send it.</p>
            <p>No formal application form yet — keep it simple and direct.</p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-500">
            <Users className="w-4 h-4" />
            Small team, high autonomy, shipping weekly.
          </div>
        </motion.section>
      </div>
    </Layout>
  );
}
