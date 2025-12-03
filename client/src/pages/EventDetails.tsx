import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock, TrendingUp, Users, Info, Share2, AlertCircle, Loader2, Zap, ChevronUp, ChevronDown, Gavel, CheckCircle, XCircle } from "lucide-react";
import { Link, useRoute } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState, useEffect } from "react";
import { useContract } from "@/hooks/useContract";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { getMarket, getPosition, Market, MarketStatus, formatMancer, Position, categoryToString, Category } from "@/lib/contract";

function generatePriceHistory(currentYesPrice: number) {
  const history = [];
  let price = currentYesPrice - 0.15 + Math.random() * 0.1;
  
  for (let i = 0; i < 24; i++) {
    const change = (Math.random() - 0.45) * 0.04;
    price = Math.max(0.05, Math.min(0.95, price + change));
    history.push({
      time: `${String(i).padStart(2, '0')}:00`,
      price: price,
    });
  }
  
  history.push({ time: "Now", price: currentYesPrice });
  return history;
}

export default function EventDetails() {
  const [, params] = useRoute("/event/:id");
  const marketId = parseInt(params?.id || "0");
  
  const [amount, setAmount] = useState("10");
  const [sellAmount, setSellAmount] = useState("10");
  const [selectedOption, setSelectedOption] = useState<"YES" | "NO">("YES");
  const [sellOption, setSellOption] = useState<"YES" | "NO">("YES");
  const [timeframe, setTimeframe] = useState("1D");
  const [market, setMarket] = useState<Market | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contractBalance, setContractBalance] = useState("0");

  const { isConnected, address, buyShares, sellShares, proposeOutcome, finalizeResolution, claimWinnings, loading, error, getContractBalance } = useContract();
  const { login } = usePrivy();

  const loadMarket = async () => {
    try {
      const data = await getMarket(marketId);
      console.log("Market data:", data);
      console.log("Market status:", data?.status, "MarketStatus.OPEN:", MarketStatus.OPEN);
      console.log("Deadline:", data?.deadline, "Now:", Date.now() / 1000);
      setMarket(data);
      if (address) {
        const pos = await getPosition(marketId, address);
        setPosition(pos);
        const bal = await getContractBalance();
        setContractBalance(bal);
      }
    } catch (e: any) {
      console.error("Failed to load market:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMarket();
    const interval = setInterval(loadMarket, 10000);
    return () => clearInterval(interval);
  }, [marketId, address]);

  const handleBuy = async () => {
    if (!isConnected) {
      login();
      return;
    }
    
    const balanceNum = parseFloat(contractBalance);
    const amountNum = parseFloat(amount);
    if (amountNum > balanceNum) {
      toast.error("Insufficient balance. Please deposit $MANCER first.");
      return;
    }
    
    const toastId = toast.loading(`Buying ${selectedOption} shares...`);
    const success = await buyShares(marketId, selectedOption === "YES", amount);
    toast.dismiss(toastId);
    if (success) {
      toast.success(`Successfully bought ${selectedOption} shares!`);
      loadMarket();
    } else if (error) {
      toast.error(error);
    }
  };

  const handleSell = async () => {
    if (!isConnected) {
      login();
      return;
    }
    
    if (!position) {
      toast.error("No shares to sell");
      return;
    }
    
    const rawShares = sellOption === "YES" ? position.yesShares : position.noShares;
    const userShares = Number(rawShares) / 1e6;
    const sellAmountNum = parseFloat(sellAmount);
    
    if (sellAmountNum > userShares + 0.000001) {
      toast.error(`Insufficient ${sellOption} shares. You have ${userShares.toFixed(6)}`);
      return;
    }
    
    const actualSellAmount = Math.min(sellAmountNum, userShares).toString();
    
    const toastId = toast.loading(`Selling ${sellOption} shares...`);
    const success = await sellShares(marketId, sellOption === "YES", actualSellAmount);
    toast.dismiss(toastId);
    if (success) {
      toast.success(`Successfully sold ${sellOption} shares!`);
      loadMarket();
    } else if (error) {
      toast.error(error);
    }
  };

  const handleProposeOutcome = async () => {
    if (!market) return;
    const toastId = toast.loading("Proposing outcome...");
    const success = await proposeOutcome(marketId, true);
    toast.dismiss(toastId);
    if (success) {
      toast.success("Outcome proposed! Bond posted.");
      loadMarket();
    } else if (error) {
      toast.error(error);
    }
  };

  const handleFinalize = async () => {
    const toastId = toast.loading("Finalizing resolution...");
    const success = await finalizeResolution(marketId);
    toast.dismiss(toastId);
    if (success) {
      toast.success("Market finalized!");
      loadMarket();
    } else if (error) {
      toast.error(error);
    }
  };

  const handleClaim = async () => {
    const toastId = toast.loading("Claiming winnings...");
    const success = await claimWinnings(marketId);
    toast.dismiss(toastId);
    if (success) {
      toast.success("Winnings claimed!");
      loadMarket();
    } else if (error) {
      toast.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern font-sans flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern font-sans">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <p className="text-muted-foreground">Market not found</p>
            <Link href="/markets">
              <Button variant="link">Back to Markets</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const total = market.yesPool + market.noPool;
  const yesPrice = total > BigInt(0) ? Number((market.noPool * BigInt(10000)) / total) / 10000 : 0.5;
  const noPrice = 1 - yesPrice;
  const currentPrice = selectedOption === "YES" ? yesPrice : noPrice;
  const safePrice = currentPrice > 0.001 ? currentPrice : 0.001;
  const shares = parseFloat(amount) / safePrice;
  const potentialPayout = shares;
  const profit = potentialPayout - parseFloat(amount);
  const returnPercentage = parseFloat(amount) > 0 && isFinite(profit) ? ((profit / parseFloat(amount)) * 100).toFixed(0) : "0";
  const volume = formatMancer(market.totalVolume);
  const deadline = new Date(Number(market.deadline) * 1000);
  const isExpired = deadline < new Date();
  const isOpen = Number(market.status) === MarketStatus.OPEN;
  const isPending = Number(market.status) === MarketStatus.PENDING_RESOLUTION;
  const isResolved = Number(market.status) === MarketStatus.RESOLVED;

  const priceHistory = generatePriceHistory(yesPrice);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-xl border border-primary/30 rounded-xl px-4 py-3 shadow-2xl">
          <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.time}</p>
          <p className="text-lg font-bold text-primary font-mono">
            {(payload[0].value * 100).toFixed(0)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const userHasPosition = position && (position.yesShares > BigInt(0) || position.noShares > BigInt(0));

  return (
    <div className="min-h-screen bg-background bg-grid-pattern font-sans selection:bg-primary/30">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-4">
          <Link href="/markets">
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-7 space-y-5">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className="bg-primary/20 text-primary border-primary/30" data-testid="badge-category">{categoryToString(market.category)}</Badge>
                <Badge variant="outline" className={`${isOpen ? "bg-monad-green/10 text-monad-green border-monad-green/30" : isPending ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" : "bg-muted text-muted-foreground"}`}>
                  {isOpen ? "Open" : isPending ? "Pending Resolution" : isResolved ? "Resolved" : "Voided"}
                </Badge>
                <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" /> {isExpired ? "Expired" : formatDistanceToNow(deadline, { addSuffix: true })}
                </Badge>
              </div>
              <h1 className="text-xl md:text-3xl font-bold leading-tight" data-testid="text-event-question">
                {market.question}
              </h1>
            </div>

            <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-white/10 overflow-hidden shadow-2xl">
              <div className="p-4 md:p-5 border-b border-white/5">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Probability</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold font-mono text-monad-green" data-testid="text-probability">{(yesPrice * 100).toFixed(0)}%</span>
                        <span className="text-sm text-monad-green font-medium">YES</span>
                      </div>
                    </div>
                    <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Volume</div>
                      <div className="text-2xl font-bold font-mono" data-testid="text-volume">
                        ${parseFloat(volume).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                    {['1H', '1D', '1W', 'ALL'].map(t => (
                      <Button 
                        key={t} 
                        variant="ghost" 
                        size="sm" 
                        className={`text-xs h-8 px-3 rounded-md transition-all ${t === timeframe ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                        onClick={() => setTimeframe(t)}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-[280px] md:h-[320px] w-full p-2 md:p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceHistory} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(160, 85%, 40%)" />
                        <stop offset="50%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(270, 85%, 60%)" />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} 
                      dy={10}
                      interval="preserveStartEnd"
                      tickCount={6}
                    />
                    <YAxis 
                      domain={[0.3, 0.9]} 
                      hide 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="url(#lineGradient)"
                      strokeWidth={3} 
                      fill="url(#priceGradient)"
                      dot={false}
                      activeDot={{ 
                        r: 6, 
                        fill: "hsl(var(--primary))", 
                        stroke: "white",
                        strokeWidth: 2,
                        className: "drop-shadow-lg"
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Resolution Info Card */}
            <Card className="bg-card/30 backdrop-blur-sm border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-primary" />
                  Resolution Info
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                {isResolved ? (
                  <div className="p-3 rounded-lg bg-monad-green/10 border border-monad-green/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-monad-green text-black">RESOLVED</Badge>
                      <span className="font-bold text-monad-green">{market.outcome === 1 ? "YES" : "NO"}</span>
                    </div>
                    {market.targetAsset && (
                      <p className="text-xs">Target: {market.targetAsset.toUpperCase()} {market.priceAbove ? "above" : "below"} ${formatMancer(market.targetPrice)}</p>
                    )}
                  </div>
                ) : isPending ? (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500 text-black">PENDING RESOLUTION</Badge>
                    </div>
                    <p className="text-xs">
                      Market deadline has passed. Anyone can propose the outcome.
                    </p>
                    <Button size="sm" onClick={handleProposeOutcome} disabled={loading} className="w-full">
                      Propose Outcome
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="border-primary/50 text-primary">
                        {market.category === Category.CRYPTO ? "PRICE ORACLE" : "PERMISSIONLESS ORACLE"}
                      </Badge>
                    </div>
                    {market.targetAsset ? (
                      <>
                        <p className="text-xs">
                          Target: <span className="text-primary font-medium">{market.targetAsset.toUpperCase()}</span> {market.priceAbove ? "above" : "below"} <span className="text-primary font-medium">${formatMancer(market.targetPrice)}</span>
                        </p>
                        <p className="text-xs mt-2">
                          After deadline, anyone can propose the outcome. Crypto markets can be verified against live prices.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs">
                        After deadline, anyone can propose an outcome. Wrong proposals can be challenged.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Position Card */}
            {userHasPosition && (
              <Card className="bg-gradient-to-br from-primary/10 to-monad-purple/10 border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Your Position
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {position!.yesShares > BigInt(0) && (
                      <div className="p-3 rounded-lg bg-monad-green/10 border border-monad-green/30">
                        <div className="text-xs text-muted-foreground">YES Shares</div>
                        <div className="text-lg font-bold text-monad-green">{formatMancer(position!.yesShares)}</div>
                      </div>
                    )}
                    {position!.noShares > BigInt(0) && (
                      <div className="p-3 rounded-lg bg-monad-pink/10 border border-monad-pink/30">
                        <div className="text-xs text-muted-foreground">NO Shares</div>
                        <div className="text-lg font-bold text-monad-pink">{formatMancer(position!.noShares)}</div>
                      </div>
                    )}
                  </div>
                  {isResolved && (
                    <Button onClick={handleClaim} disabled={loading} className="w-full bg-monad-green hover:bg-monad-green/90 text-black">
                      Claim Winnings
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl border-primary/20 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)] sticky top-20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-monad-purple/5 pointer-events-none"></div>
              
              {!isOpen ? (
                <div className="p-6 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isResolved ? "bg-monad-green/20 text-monad-green" : "bg-yellow-500/20 text-yellow-500"}`}>
                    {isResolved ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    <span className="font-bold">{isResolved ? "Market Resolved" : "Awaiting Resolution"}</span>
                  </div>
                  {isResolved && (
                    <p className="mt-4 text-lg font-bold">
                      Outcome: <span className={market.outcome ? "text-monad-green" : "text-monad-pink"}>{market.outcome ? "YES" : "NO"}</span>
                    </p>
                  )}
                </div>
              ) : (
                <Tabs defaultValue="buy" className="w-full relative">
                  <div className="px-4 pt-4">
                    <TabsList className="w-full bg-white/5 border border-white/10 h-12 p-1 rounded-xl">
                      <TabsTrigger 
                        value="buy" 
                        className="flex-1 h-full rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
                        data-testid="tab-buy"
                      >
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Buy
                      </TabsTrigger>
                      <TabsTrigger 
                        value="sell" 
                        className="flex-1 h-full rounded-lg font-semibold data-[state=active]:bg-monad-pink data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                        data-testid="tab-sell"
                      >
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Sell
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="buy" className="p-4 md:p-5 space-y-5 mt-0">
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        className={`relative h-16 md:h-20 rounded-2xl font-bold text-xl border-2 transition-all duration-300 overflow-hidden group ${
                          selectedOption === "YES" 
                            ? 'bg-gradient-to-br from-monad-green/30 to-monad-green/10 border-monad-green text-monad-green shadow-[0_0_30px_-5px_hsl(160,85%,45%/0.5)]' 
                            : 'bg-white/5 border-white/10 text-muted-foreground hover:border-monad-green/50 hover:bg-monad-green/10'
                        }`}
                        onClick={() => setSelectedOption("YES")}
                        data-testid="button-yes"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-monad-green/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex flex-col items-center justify-center">
                          <span className="text-2xl md:text-3xl font-bold">{Math.round(yesPrice * 100)}¢</span>
                          <span className="text-xs uppercase tracking-wider opacity-70">Yes</span>
                        </div>
                      </button>
                      <button 
                        className={`relative h-16 md:h-20 rounded-2xl font-bold text-xl border-2 transition-all duration-300 overflow-hidden group ${
                          selectedOption === "NO" 
                            ? 'bg-gradient-to-br from-monad-pink/30 to-monad-pink/10 border-monad-pink text-monad-pink shadow-[0_0_30px_-5px_hsl(330,85%,55%/0.5)]' 
                            : 'bg-white/5 border-white/10 text-muted-foreground hover:border-monad-pink/50 hover:bg-monad-pink/10'
                        }`}
                        onClick={() => setSelectedOption("NO")}
                        data-testid="button-no"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-monad-pink/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex flex-col items-center justify-center">
                          <span className="text-2xl md:text-3xl font-bold">{Math.round(noPrice * 100)}¢</span>
                          <span className="text-xs uppercase tracking-wider opacity-70">No</span>
                        </div>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Amount ($MANCER)</span>
                        <span className="text-primary font-medium" data-testid="text-balance">
                          Balance: {parseFloat(contractBalance).toFixed(2)} $MANCER
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground font-bold">$</span>
                        <Input 
                          type="number" 
                          value={amount} 
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-9 h-14 text-2xl font-mono font-bold bg-white/5 border-white/10 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                          data-testid="input-amount"
                        />
                      </div>
                      <div className="flex gap-2">
                        {[10, 50, 100, 500].map((val) => (
                          <Button
                            key={val}
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs bg-white/5 border-white/10 hover:bg-primary/20 hover:border-primary/30 hover:text-primary"
                            onClick={() => setAmount(val.toString())}
                          >
                            ${val}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Price</span>
                        <span className="font-mono font-bold text-lg" data-testid="text-avg-price">
                          {currentPrice < 0.01 ? "<1" : (currentPrice * 100).toFixed(0)}¢
                        </span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Est. Shares</span>
                        <span className="font-mono font-bold text-lg" data-testid="text-shares">
                          {isFinite(shares) ? shares.toFixed(2) : "—"}
                        </span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Potential Profit</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg text-monad-green" data-testid="text-potential-return">
                            {isFinite(profit) ? `+$${profit.toFixed(2)}` : "—"}
                          </span>
                          <Badge className={`${selectedOption === "YES" ? 'bg-monad-green/20 text-monad-green' : 'bg-monad-pink/20 text-monad-pink'} font-mono`}>
                            {returnPercentage}%
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Button 
                      className={`w-full h-14 text-lg font-bold rounded-xl transition-all duration-300 shadow-lg ${
                        selectedOption === "YES" 
                          ? 'bg-gradient-to-r from-monad-green to-emerald-500 hover:from-monad-green/90 hover:to-emerald-500/90 text-black shadow-monad-green/25' 
                          : 'bg-gradient-to-r from-monad-pink to-rose-500 hover:from-monad-pink/90 hover:to-rose-500/90 text-white shadow-monad-pink/25'
                      } hover:scale-[1.02] active:scale-[0.98]`}
                      onClick={handleBuy}
                      disabled={loading}
                      data-testid="button-place-bet"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : !isConnected ? (
                        <>
                          <Zap className="mr-2 h-5 w-5" /> Connect Wallet
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-5 w-5" /> Buy {selectedOption}
                        </>
                      )}
                    </Button>

                    {!isConnected && (
                      <p className="text-xs text-center text-muted-foreground">
                        Connect wallet and deposit $MANCER to trade
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="sell" className="p-4 md:p-5 space-y-5 mt-0">
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        className={`relative h-16 md:h-20 rounded-2xl font-bold text-xl border-2 transition-all duration-300 overflow-hidden group ${
                          sellOption === "YES" 
                            ? 'bg-gradient-to-br from-monad-green/30 to-monad-green/10 border-monad-green text-monad-green shadow-[0_0_30px_-5px_hsl(160,85%,45%/0.5)]' 
                            : 'bg-white/5 border-white/10 text-muted-foreground hover:border-monad-green/50 hover:bg-monad-green/10'
                        }`}
                        onClick={() => setSellOption("YES")}
                        data-testid="button-sell-yes"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-monad-green/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex flex-col items-center justify-center">
                          <span className="text-lg font-bold">Sell YES</span>
                          <span className="text-xs opacity-70">
                            {position ? (Number(position.yesShares) / 1e6).toFixed(2) : "0"} shares
                          </span>
                        </div>
                      </button>
                      <button 
                        className={`relative h-16 md:h-20 rounded-2xl font-bold text-xl border-2 transition-all duration-300 overflow-hidden group ${
                          sellOption === "NO" 
                            ? 'bg-gradient-to-br from-monad-pink/30 to-monad-pink/10 border-monad-pink text-monad-pink shadow-[0_0_30px_-5px_hsl(330,85%,55%/0.5)]' 
                            : 'bg-white/5 border-white/10 text-muted-foreground hover:border-monad-pink/50 hover:bg-monad-pink/10'
                        }`}
                        onClick={() => setSellOption("NO")}
                        data-testid="button-sell-no"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-monad-pink/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex flex-col items-center justify-center">
                          <span className="text-lg font-bold">Sell NO</span>
                          <span className="text-xs opacity-70">
                            {position ? (Number(position.noShares) / 1e6).toFixed(2) : "0"} shares
                          </span>
                        </div>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Shares to Sell</span>
                        <span className="text-primary font-medium">
                          Available: {position ? (sellOption === "YES" ? (Number(position.yesShares) / 1e6).toFixed(2) : (Number(position.noShares) / 1e6).toFixed(2)) : "0"}
                        </span>
                      </div>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={sellAmount} 
                          onChange={(e) => setSellAmount(e.target.value)}
                          className="h-14 text-2xl font-mono font-bold bg-white/5 border-white/10 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                          data-testid="input-sell-amount"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs bg-white/5 border-white/10 hover:bg-primary/20 hover:border-primary/30 hover:text-primary"
                          onClick={() => {
                            if (position) {
                              const shares = sellOption === "YES" ? Number(position.yesShares) / 1e6 : Number(position.noShares) / 1e6;
                              setSellAmount(Math.floor(shares * 0.25 * 1e6) / 1e6 + "");
                            }
                          }}
                        >
                          25%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs bg-white/5 border-white/10 hover:bg-primary/20 hover:border-primary/30 hover:text-primary"
                          onClick={() => {
                            if (position) {
                              const shares = sellOption === "YES" ? Number(position.yesShares) / 1e6 : Number(position.noShares) / 1e6;
                              setSellAmount(Math.floor(shares * 0.5 * 1e6) / 1e6 + "");
                            }
                          }}
                        >
                          50%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs bg-white/5 border-white/10 hover:bg-primary/20 hover:border-primary/30 hover:text-primary"
                          onClick={() => {
                            if (position) {
                              const rawShares = sellOption === "YES" ? position.yesShares : position.noShares;
                              setSellAmount((Number(rawShares) / 1e6).toString());
                            }
                          }}
                        >
                          MAX
                        </Button>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-14 text-lg font-bold rounded-xl transition-all duration-300 shadow-lg bg-gradient-to-r from-monad-pink to-rose-500 hover:from-monad-pink/90 hover:to-rose-500/90 text-white shadow-monad-pink/25 hover:scale-[1.02] active:scale-[0.98]"
                      onClick={handleSell}
                      disabled={loading || !position || (sellOption === "YES" ? Number(position?.yesShares || 0) === 0 : Number(position?.noShares || 0) === 0)}
                      data-testid="button-sell"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : !isConnected ? (
                        <>
                          <Zap className="mr-2 h-5 w-5" /> Connect Wallet
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-5 w-5" /> Sell {sellOption} Shares
                        </>
                      )}
                    </Button>

                    {(!position || (Number(position.yesShares) === 0 && Number(position.noShares) === 0)) && (
                      <p className="text-xs text-center text-muted-foreground">
                        You don't have any shares to sell
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
