import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { motion } from "framer-motion";
import { useState } from "react";
import { Upload, Zap, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function CreateToken() {
  const { connectedWallet } = useWallet();
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    twitter: "",
    telegram: "",
    website: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connectedWallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!formData.name || !formData.symbol) {
      toast.error("Name and symbol are required");
      return;
    }

    toast.info("Token creation will be available soon!");
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-red-500">CREATE TOKEN</h1>
          <p className="text-gray-400 font-mono text-sm">
            Launch your token on the bonding curve
          </p>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-500 font-bold text-sm">COMING SOON</p>
              <p className="text-gray-400 text-sm mt-1">
                Token creation is currently in development. For now, you can create tokens directly on{" "}
                <a 
                  href="https://pump.fun/create" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                >
                  Pump.fun
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-lg bg-zinc-800 border-2 border-dashed border-red-600/50 flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Token" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-red-500/50" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  data-testid="input-token-image"
                />
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">TOKEN NAME *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="DumCoin"
                    maxLength={32}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white focus:border-red-500 focus:outline-none"
                    data-testid="input-token-name"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">SYMBOL *</label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    placeholder="DUM"
                    maxLength={10}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white focus:border-red-500 focus:outline-none"
                    data-testid="input-token-symbol"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">DESCRIPTION</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell the world about your token..."
                rows={3}
                maxLength={500}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white focus:border-red-500 focus:outline-none resize-none"
                data-testid="input-token-description"
              />
            </div>
          </div>

          <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6 space-y-4">
            <h3 className="font-bold text-gray-300">SOCIAL LINKS (Optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">TWITTER</label>
                <input
                  type="url"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white text-sm focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">TELEGRAM</label>
                <input
                  type="url"
                  value={formData.telegram}
                  onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  placeholder="https://t.me/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white text-sm focus:border-red-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 block mb-1">WEBSITE</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white text-sm focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-yellow-600/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-300 font-bold">LAUNCH COST</p>
                <p className="text-xs text-gray-500">Paid to deploy on Solana</p>
              </div>
              <p className="text-xl font-mono text-yellow-500">~0.02 SOL</p>
            </div>
          </div>

          {connectedWallet ? (
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black py-4 rounded-lg uppercase transition-all border border-green-400/50 flex items-center justify-center gap-2"
              data-testid="button-create-token"
            >
              <Zap className="w-5 h-5" />
              CREATE TOKEN
            </motion.button>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 font-mono">Connect your wallet to create a token</p>
            </div>
          )}
        </form>
      </div>
    </Layout>
  );
}
