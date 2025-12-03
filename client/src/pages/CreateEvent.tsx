import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, AlertCircle, Coins } from "lucide-react";
import logoImage from "@assets/IMG_9377_1764744730481.jpeg";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useContract } from "@/hooks/useContract";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["Crypto", "Sports", "Politics", "Pop Culture", "Science", "Other"];

const CRYPTO_ASSETS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH" },
  { id: "solana", name: "Solana", symbol: "SOL" },
  { id: "monad", name: "Monad", symbol: "MON" },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE" },
  { id: "cardano", name: "Cardano", symbol: "ADA" },
  { id: "ripple", name: "XRP", symbol: "XRP" },
  { id: "polkadot", name: "Polkadot", symbol: "DOT" },
  { id: "avalanche-2", name: "Avalanche", symbol: "AVAX" },
  { id: "chainlink", name: "Chainlink", symbol: "LINK" },
];

export default function CreateEvent() {
  const [, navigate] = useLocation();
  const { isConnected, address, createMarket, getContractBalance, loading, error } = useContract();
  const { openConnectModal } = useConnectModal();

  const [category, setCategory] = useState("Crypto");
  const [question, setQuestion] = useState("");
  const [deadline, setDeadline] = useState("");
  const [targetAsset, setTargetAsset] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [priceCondition, setPriceCondition] = useState("above");
  const [contractBalance, setContractBalance] = useState("0");

  useEffect(() => {
    const loadBalance = async () => {
      if (address) {
        const bal = await getContractBalance();
        setContractBalance(bal);
      }
    };
    loadBalance();
  }, [address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (!question || !deadline) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (category === "Crypto" && (!targetAsset || !targetPrice)) {
      toast.error("Please select an asset and target price for crypto markets");
      return;
    }

    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    
    if (deadlineTimestamp <= now) {
      toast.error("Deadline must be in the future");
      return;
    }

    const toastId = toast.loading("Creating market on-chain...");
    
    const marketId = await createMarket(
      question,
      category,
      deadlineTimestamp,
      category === "Crypto" ? targetAsset : "",
      category === "Crypto" ? targetPrice : "0",
      priceCondition === "above"
    );

    toast.dismiss(toastId);

    if (marketId !== null) {
      toast.success("Market created on-chain!");
      navigate(`/event/${marketId}`);
    } else if (error) {
      toast.error(error);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  const selectedAsset = CRYPTO_ASSETS.find(a => a.id === targetAsset);

  return (
    <div className="min-h-screen bg-background bg-grid-pattern font-sans selection:bg-primary/30">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href="/markets">
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Markets
            </Button>
          </Link>
        </div>

        <Card className="bg-card/50 backdrop-blur-md border-primary/20 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-monad-purple/20 to-primary/20 p-1 mb-4 shadow-lg shadow-primary/20">
              <img 
                src={logoImage} 
                alt="Create Market" 
                className="w-full h-full rounded-xl object-cover"
              />
            </div>
            <CardTitle className="text-2xl font-bold">Create Prediction Market</CardTitle>
            <CardDescription className="text-muted-foreground">
              Launch a fully on-chain market with permissionless resolution
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {isConnected && (
              <div className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm">Trading Balance</span>
                </div>
                <span className="font-mono font-bold">${parseFloat(contractBalance).toFixed(2)} USDC</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-secondary/30 border-border h-12" data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question">Prediction Question</Label>
                <Textarea
                  id="question"
                  placeholder={category === "Crypto" 
                    ? "Will Bitcoin reach $100k before the deadline?" 
                    : category === "Sports" 
                    ? "Will the Lakers win the NBA Championship?"
                    : category === "Politics"
                    ? "Will candidate X win the election?"
                    : "Will this event happen by the deadline?"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[100px] bg-secondary/30 border-border resize-none"
                  data-testid="input-question"
                />
                <p className="text-xs text-muted-foreground">
                  {category === "Crypto" 
                    ? "Clear YES/NO question. Resolution based on price at deadline." 
                    : "Clear YES/NO question. Resolved via permissionless oracle after deadline."}
                </p>
              </div>

              {category === "Crypto" && (
                <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-primary font-medium">Price Target Settings</p>
                  
                  <div className="space-y-2">
                    <Label>Asset</Label>
                    <Select value={targetAsset} onValueChange={setTargetAsset}>
                      <SelectTrigger className="bg-secondary/30 border-border h-12" data-testid="select-asset">
                        <SelectValue placeholder="Select cryptocurrency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CRYPTO_ASSETS.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name} ({asset.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={priceCondition} onValueChange={setPriceCondition}>
                        <SelectTrigger className="bg-secondary/30 border-border h-12" data-testid="select-condition">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="above">Above</SelectItem>
                          <SelectItem value="below">Below</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Price ($)</Label>
                      <Input
                        type="number"
                        placeholder="100000"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        className="bg-secondary/30 border-border h-12"
                        data-testid="input-target-price"
                      />
                    </div>
                  </div>
                  
                  {targetAsset && targetPrice && (
                    <div className="p-3 rounded-lg bg-monad-green/10 border border-monad-green/30">
                      <p className="text-xs text-monad-green font-medium">
                        Resolves YES if {selectedAsset?.symbol || targetAsset.toUpperCase()} is {priceCondition} ${parseFloat(targetPrice).toLocaleString()} at deadline
                      </p>
                    </div>
                  )}
                </div>
              )}

              {category !== "Crypto" && (
                <div className="p-4 rounded-lg bg-monad-purple/10 border border-monad-purple/30">
                  <p className="text-sm text-monad-purple font-medium mb-2">Permissionless Resolution</p>
                  <p className="text-xs text-muted-foreground">
                    After the deadline, anyone can propose the outcome by posting a bond. 
                    Others can challenge incorrect proposals. Final outcome is determined by consensus.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="deadline">Resolution Deadline</Label>
                <input
                  id="deadline"
                  type="date"
                  min={minDateStr}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="flex w-full rounded-md border border-border bg-secondary/30 px-3 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground appearance-none"
                  style={{ colorScheme: 'dark' }}
                  data-testid="input-deadline"
                />
                <p className="text-xs text-muted-foreground">
                  After this date, anyone can propose the outcome
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-monad-purple to-primary hover:opacity-90"
                disabled={loading}
                data-testid="button-create"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : !isConnected ? (
                  "Connect Wallet to Create"
                ) : (
                  "Create Market On-Chain"
                )}
              </Button>

              <div className="text-xs text-center text-muted-foreground space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Markets are fully trustless with permissionless resolution
                </div>
                <p>Anyone can propose outcomes by posting a bond. Wrong proposals get slashed.</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
