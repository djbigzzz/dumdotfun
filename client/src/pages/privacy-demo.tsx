import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Zap, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Copy
} from "lucide-react";

interface IntegrationStatus {
  name: string;
  active: boolean;
  description: string;
  bounty: string;
  features?: string[];
  programId?: string;
}

interface PrivacyStatus {
  incoLightning: IntegrationStatus;
  stealthAddresses: IntegrationStatus;
  token2022: IntegrationStatus;
  privacyCash: IntegrationStatus;
  shadowWire: IntegrationStatus;
  npExchange: IntegrationStatus;
}

export default function PrivacyDemo() {
  const { connectedWallet } = useWallet();
  const publicKey = connectedWallet;
  const { toast } = useToast();
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; result: any; signature?: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchPrivacyStatus();
  }, []);

  const fetchPrivacyStatus = async () => {
    try {
      const res = await fetch("/api/privacy/status");
      const data = await res.json();
      setPrivacyStatus(data);
    } catch (error) {
      console.error("Failed to fetch privacy status:", error);
    } finally {
      setLoading(false);
    }
  };

  const testIncoEncryption = async () => {
    if (!publicKey) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    setTesting("inco");
    try {
      const res = await fetch("/api/privacy/test/inco-encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 0.1,
          walletAddress: publicKey
        })
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, inco: { success: data.success, result: data } }));
      toast({ 
        title: data.success ? "Encryption Successful" : "Encryption Failed",
        description: data.success ? `SDK Used: ${data.sdkUsed}` : data.error
      });
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, inco: { success: false, result: error.message } }));
    } finally {
      setTesting(null);
    }
  };

  const testStealthAddress = async () => {
    if (!publicKey) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    setTesting("stealth");
    try {
      const res = await fetch("/api/privacy/stealth-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientWallet: publicKey
        })
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, stealth: { success: !!data.stealthAddress, result: data } }));
      toast({ 
        title: data.stealthAddress ? "Stealth Address Generated" : "Generation Failed",
        description: data.stealthAddress ? `${data.stealthAddress.slice(0, 20)}...` : data.error
      });
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, stealth: { success: false, result: error.message } }));
    } finally {
      setTesting(null);
    }
  };

  const testShadowWire = async () => {
    if (!publicKey) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    setTesting("shadowwire");
    try {
      const res = await fetch(`/api/privacy/shadowwire/balance/${publicKey}`);
      const data = await res.json();
      setTestResults(prev => ({ ...prev, shadowwire: { success: data.success !== false, result: data } }));
      toast({ 
        title: "ShadowWire Status Retrieved",
        description: `SDK Active: ${data.success !== false}`
      });
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, shadowwire: { success: false, result: error.message } }));
    } finally {
      setTesting(null);
    }
  };

  const testPrivacyCash = async () => {
    if (!publicKey) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    setTesting("privacycash");
    try {
      const res = await fetch(`/api/privacy/cash/balance/${publicKey}`);
      const data = await res.json();
      setTestResults(prev => ({ ...prev, privacycash: { success: data.success !== false, result: data } }));
      toast({ 
        title: "Privacy Cash Status Retrieved",
        description: `SDK Active: ${data.success !== false}`
      });
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, privacycash: { success: false, result: error.message } }));
    } finally {
      setTesting(null);
    }
  };

  const testNPExchange = async () => {
    setTesting("npexchange");
    try {
      const res = await fetch("/api/privacy/pnp/status");
      const data = await res.json();
      setTestResults(prev => ({ ...prev, npexchange: { success: data.active, result: data } }));
      toast({ 
        title: "NP Exchange Status",
        description: `Active: ${data.active}, Version: ${data.version}`
      });
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, npexchange: { success: false, result: error.message } }));
    } finally {
      setTesting(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              Privacy SDK Demo
            </h1>
            <p className="text-zinc-400 mt-1">
              Live testing of all privacy integrations on Solana Devnet
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-green-400 mb-2">Solana Privacy Hackathon (Feb 1 Deadline)</h2>
          <p className="text-zinc-300">
            Total Bounty Potential: <span className="text-green-400 font-bold">~$65K+</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Inco $2K</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Helius $5K</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Anoncoin $10K</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Token-2022 $15K</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Privacy Cash $15K</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">ShadowWire $15K</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">NP Exchange $2.5K</Badge>
          </div>
        </div>

        {!publicKey && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-8">
            <p className="text-yellow-400">Connect your wallet to test privacy features</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-zinc-900 border-zinc-800" data-testid="card-inco-lightning">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Inco Lightning SDK
                </span>
                <Badge className={privacyStatus?.incoLightning?.active ? "bg-green-500" : "bg-red-500"}>
                  {privacyStatus?.incoLightning?.active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-400 text-sm">{privacyStatus?.incoLightning?.description}</p>
              <div className="text-xs text-zinc-500">
                <strong>Program ID:</strong> {privacyStatus?.incoLightning?.programId?.slice(0, 20)}...
              </div>
              <Button 
                onClick={testIncoEncryption} 
                disabled={!publicKey || testing === "inco"}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
                data-testid="button-test-inco"
              >
                {testing === "inco" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Test Encryption
              </Button>
              {testResults.inco && (
                <div className={`p-3 rounded text-xs ${testResults.inco.success ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResults.inco.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {testResults.inco.success ? "Success" : "Failed"}
                  </div>
                  <pre className="overflow-x-auto">{JSON.stringify(testResults.inco.result, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800" data-testid="card-stealth-addresses">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <EyeOff className="h-5 w-5 text-purple-500" />
                  Stealth Addresses
                </span>
                <Badge className={privacyStatus?.stealthAddresses?.active ? "bg-green-500" : "bg-red-500"}>
                  {privacyStatus?.stealthAddresses?.active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-400 text-sm">{privacyStatus?.stealthAddresses?.description}</p>
              <p className="text-xs text-zinc-500">One-time addresses for untraceable token receiving</p>
              <Button 
                onClick={testStealthAddress} 
                disabled={!publicKey || testing === "stealth"}
                className="w-full bg-purple-600 hover:bg-purple-700"
                data-testid="button-test-stealth"
              >
                {testing === "stealth" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                Generate Stealth Address
              </Button>
              {testResults.stealth && (
                <div className={`p-3 rounded text-xs ${testResults.stealth.success ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResults.stealth.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {testResults.stealth.success ? "Generated" : "Failed"}
                  </div>
                  {testResults.stealth.result?.stealthAddress && (
                    <div className="flex items-center gap-2">
                      <span className="truncate">{testResults.stealth.result.stealthAddress}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(testResults.stealth.result.stealthAddress)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800" data-testid="card-shadowwire">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Radr ShadowWire
                </span>
                <Badge className={privacyStatus?.shadowWire?.active ? "bg-green-500" : "bg-red-500"}>
                  {privacyStatus?.shadowWire?.active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-400 text-sm">{privacyStatus?.shadowWire?.description}</p>
              <p className="text-xs text-zinc-500">Bulletproof ZK proofs for private transfers</p>
              <Button 
                onClick={testShadowWire} 
                disabled={!publicKey || testing === "shadowwire"}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-test-shadowwire"
              >
                {testing === "shadowwire" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                Check ShadowWire Balance
              </Button>
              {testResults.shadowwire && (
                <div className={`p-3 rounded text-xs ${testResults.shadowwire.success ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResults.shadowwire.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    SDK {testResults.shadowwire.success ? "Active" : "Unavailable"}
                  </div>
                  <pre className="overflow-x-auto">{JSON.stringify(testResults.shadowwire.result, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800" data-testid="card-privacycash">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-emerald-500" />
                  Privacy Cash
                </span>
                <Badge className={privacyStatus?.privacyCash?.active ? "bg-green-500" : "bg-red-500"}>
                  {privacyStatus?.privacyCash?.active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-400 text-sm">{privacyStatus?.privacyCash?.description}</p>
              <p className="text-xs text-zinc-500">Break on-chain links with ZK proofs</p>
              <Button 
                onClick={testPrivacyCash} 
                disabled={!publicKey || testing === "privacycash"}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-test-privacycash"
              >
                {testing === "privacycash" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Check Privacy Cash
              </Button>
              {testResults.privacycash && (
                <div className={`p-3 rounded text-xs ${testResults.privacycash.success ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResults.privacycash.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    SDK {testResults.privacycash.success ? "Active" : "Unavailable"}
                  </div>
                  <pre className="overflow-x-auto">{JSON.stringify(testResults.privacycash.result, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800" data-testid="card-npexchange">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  NP Exchange (PNP)
                </span>
                <Badge className={privacyStatus?.npExchange?.active ? "bg-green-500" : "bg-red-500"}>
                  {privacyStatus?.npExchange?.active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-400 text-sm">{privacyStatus?.npExchange?.description}</p>
              <p className="text-xs text-zinc-500">AI agent-based prediction market creation</p>
              <Button 
                onClick={testNPExchange} 
                disabled={testing === "npexchange"}
                className="w-full bg-orange-600 hover:bg-orange-700"
                data-testid="button-test-npexchange"
              >
                {testing === "npexchange" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Check NP Exchange Status
              </Button>
              {testResults.npexchange && (
                <div className={`p-3 rounded text-xs ${testResults.npexchange.success ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResults.npexchange.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    SDK {testResults.npexchange.success ? "Active" : "Unavailable"}
                  </div>
                  <pre className="overflow-x-auto">{JSON.stringify(testResults.npexchange.result, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800" data-testid="card-token2022">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-cyan-500" />
                  Token-2022 Confidential
                </span>
                <Badge className={privacyStatus?.token2022?.active ? "bg-green-500" : "bg-red-500"}>
                  {privacyStatus?.token2022?.active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-400 text-sm">{privacyStatus?.token2022?.description}</p>
              <div className="text-xs text-zinc-500">
                <strong>Program ID:</strong> TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
              </div>
              <p className="text-xs text-yellow-500">
                Note: Full on-chain ZK ElGamal support expected after audit completion
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h3 className="text-xl font-bold mb-4">How to Verify on Devnet</h3>
          <ol className="list-decimal list-inside space-y-2 text-zinc-400 text-sm">
            <li>Connect your Phantom wallet (set to Devnet)</li>
            <li>Run any test above to generate transactions</li>
            <li>Check transaction signatures on <a href="https://solscan.io/?cluster=devnet" target="_blank" className="text-blue-400 hover:underline">Solscan (Devnet)</a></li>
            <li>Verify the program IDs match our privacy integrations</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
