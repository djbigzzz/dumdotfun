import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { motion } from "framer-motion";
import { useState } from "react";
import { Upload, Zap, AlertTriangle, ExternalLink, Info } from "lucide-react";
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
  const [fileName, setFileName] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File must be smaller than 10MB");
        return;
      }
      
      setFileName(file.name);
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black text-red-500">CREATE NEW COIN</h1>
          <p className="text-gray-400 text-sm mt-1">
            Fields marked with * cannot be changed once the coin is created
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
          {/* Coin Details Section */}
          <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6">
            <h2 className="text-sm font-black text-red-500 mb-4 uppercase">COIN DETAILS</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2 font-bold">COIN NAME *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Name your coin"
                  maxLength={32}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white focus:border-red-500 focus:outline-none"
                  data-testid="input-token-name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2 font-bold">TICKER *</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="Add a coin ticker (e.g., DUNI)"
                  maxLength={10}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white focus:border-red-500 focus:outline-none"
                  data-testid="input-token-symbol"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-2 font-bold">DESCRIPTION (OPTIONAL)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Write a short description"
                rows={3}
                maxLength={500}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white focus:border-red-500 focus:outline-none resize-none"
                data-testid="input-token-description"
              />
            </div>
          </div>

          {/* Social Links Section */}
          <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors mb-4"
            >
              <span>+ ADD SOCIAL LINKS (OPTIONAL)</span>
            </button>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2 font-bold">TWITTER</label>
                <input
                  type="url"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white text-sm focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2 font-bold">TELEGRAM</label>
                <input
                  type="url"
                  value={formData.telegram}
                  onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  placeholder="https://t.me/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white text-sm focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2 font-bold">WEBSITE</label>
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

          {/* Image Upload Section */}
          <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6">
            <h2 className="text-sm font-black text-red-500 mb-4 uppercase">COIN IMAGE</h2>
            
            <div className="border-2 border-dashed border-red-600/50 rounded-lg p-8 text-center hover:border-red-600/80 transition-colors">
              {imagePreview ? (
                <div className="space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden border border-red-600/30">
                    <img src={imagePreview} alt="Token" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm font-mono">{fileName}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFileName(null);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs mt-2 underline"
                    >
                      Change image
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-red-500/50" />
                    <p className="text-gray-400 text-sm">Select video or image to upload</p>
                    <p className="text-gray-500 text-xs">or drag and drop here</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="input-token-image"
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-zinc-800 border border-zinc-700 rounded p-3">
                <p className="text-xs text-gray-400 font-bold mb-1">File size and type</p>
                <ul className="text-xs text-gray-500 space-y-0.5">
                  <li>• Image: <span className="text-gray-400">2mb</span></li>
                  <li>• Video: <span className="text-gray-400">2mb</span></li>
                  <li>• Format: <span className="text-gray-400">JPG, PNG or MP4</span></li>
                </ul>
              </div>
              <div className="bg-zinc-800 border border-zinc-700 rounded p-3">
                <p className="text-xs text-gray-400 font-bold mb-1">Resolution and aspect ratio</p>
                <ul className="text-xs text-gray-500 space-y-0.5">
                  <li>• Image: <span className="text-gray-400">1000x1000px</span></li>
                  <li>• Video: <span className="text-gray-400">16:9, 1080x600px</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Launch Cost Section */}
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-500 font-bold text-sm">LAUNCH COST: ~0.02 SOL</p>
                <p className="text-gray-400 text-xs mt-1">Paid to deploy on Solana blockchain</p>
              </div>
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
              CREATE COIN
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
