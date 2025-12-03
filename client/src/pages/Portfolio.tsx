import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, TrendingUp, History, DollarSign, ArrowUpRight, ArrowDownRight, Trophy, Loader2, Coins, ExternalLink } from "lucide-react";
import { useContract } from "@/hooks/useContract";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { getAllMarkets, getPosition, Market, MarketStatus, formatMancer, Position } from "@/lib/contract";
import { toast } from "sonner";

interface PositionWithMarket {
  market: Market;
  position: Position;
}

export default function Portfolio() {
  const { isConnected, address, getContractBalance, claimWinnings, loading } = useContract();
  const { login } = usePrivy();
  
  const [contractBalance, setContractBalance] = useState("0");
  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPortfolio = async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }
    
    try {
      const balance = await getContractBalance();
      setContractBalance(balance);
      
      const markets = await getAllMarkets();
      const positionsWithMarkets: PositionWithMarket[] = [];
      
      for (const market of markets) {
        const pos = await getPosition(Number(market.id), address);
        if (pos && (pos.yesShares > BigInt(0) || pos.noShares > BigInt(0))) {
          positionsWithMarkets.push({ market, position: pos });
        }
      }
      
      setPositions(positionsWithMarkets);
    } catch (e) {
      console.error("Failed to load portfolio:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPortfolio();
    const interval = setInterval(loadPortfolio, 15000);
    return () => clearInterval(interval);
  }, [address]);

  const handleClaim = async (marketId: number) => {
    const toastId = toast.loading("Claiming winnings...");
    const success = await claimWinnings(marketId);
    toast.dismiss(toastId);
    if (success) {
      toast.success("Winnings claimed!");
      loadPortfolio();
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern font-sans selection:bg-primary/30">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-secondary/50 p-6 mb-6">
              <Wallet className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Connect your wallet to view your on-chain portfolio and positions.
            </p>
            <Button onClick={login} className="font-bold" data-testid="button-connect-wallet">
              <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const shortAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const activePositions = positions.filter(p => Number(p.market.status) === MarketStatus.OPEN || Number(p.market.status) === MarketStatus.PENDING_RESOLUTION);
  const resolvedPositions = positions.filter(p => Number(p.market.status) === MarketStatus.RESOLVED);
  const claimablePositions = resolvedPositions;

  const totalPositionValue = positions.reduce((sum, p) => {
    const total = p.market.yesPool + p.market.noPool;
    if (total === BigInt(0)) return sum;
    const yesPrice = Number((p.market.noPool * BigInt(10000)) / total) / 10000;
    const noPrice = 1 - yesPrice;
    const yesValue = Number(p.position.yesShares) / 1e6 * yesPrice;
    const noValue = Number(p.position.noShares) / 1e6 * noPrice;
    return sum + yesValue + noValue;
  }, 0);

  return (
    <div className="min-h-screen bg-background bg-grid-pattern font-sans selection:bg-primary/30">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-portfolio-title">
              <Wallet className="h-8 w-8 text-primary" />
              My Portfolio
            </h1>
            <p className="text-muted-foreground">All data directly from the blockchain</p>
          </div>
          <Button className="font-bold shadow-[0_0_15px_rgba(131,110,249,0.3)]" data-testid="button-wallet-address">
            <Wallet className="mr-2 h-4 w-4" /> {shortAddress}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trading Balance</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-total-balance">${parseFloat(contractBalance).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ready to trade
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-bets">{activePositions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Open markets
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Position Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="text-total-profit">
                ${totalPositionValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Estimated value
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claimable</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-monad-green" data-testid="text-win-rate">
                {claimablePositions.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ready to claim
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="bg-secondary/50 p-1">
            <TabsTrigger value="active" className="data-[state=active]:bg-background" data-testid="tab-active">Active ({activePositions.length})</TabsTrigger>
            <TabsTrigger value="resolved" className="data-[state=active]:bg-background" data-testid="tab-history">Resolved ({resolvedPositions.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activePositions.length > 0 ? (
              <div className="space-y-4">
                {activePositions.map(({ market, position }) => {
                  const total = market.yesPool + market.noPool;
                  const yesPrice = total > BigInt(0) ? Number((market.noPool * BigInt(10000)) / total) / 100 : 50;
                  
                  return (
                    <Card key={Number(market.id)} className="bg-card/30 backdrop-blur-sm border-border/50" data-testid={`card-position-${market.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Link href={`/event/${market.id}`}>
                              <h3 className="font-medium hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                                {market.question}
                                <ExternalLink className="h-3 w-3" />
                              </h3>
                            </Link>
                            <p className="text-xs text-muted-foreground mt-1">
                              {market.status === MarketStatus.OPEN ? "Open" : "Pending Resolution"} • Ends {formatDistanceToNow(new Date(Number(market.deadline) * 1000), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            {position.yesShares > BigInt(0) && (
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-monad-green/20 text-monad-green">
                                {formatMancer(position.yesShares)} YES
                              </div>
                            )}
                            {position.noShares > BigInt(0) && (
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-monad-pink/20 text-monad-pink">
                                {formatMancer(position.noShares)} NO
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Current: {yesPrice.toFixed(0)}% YES
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-8 border-dashed border-2 border-border/50 bg-transparent min-h-[300px]">
                <div className="rounded-full bg-secondary/50 p-4 mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold">No Active Positions</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Browse markets to place your first prediction.
                </p>
                <Link href="/markets">
                  <Button variant="outline" data-testid="button-browse-markets">Browse Markets</Button>
                </Link>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="resolved">
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Resolved Markets</CardTitle>
                <CardDescription>Markets where you had positions</CardDescription>
              </CardHeader>
              <CardContent>
                {resolvedPositions.length > 0 ? (
                  <div className="space-y-4">
                    {resolvedPositions.map(({ market, position }) => {
                      const won = (market.outcome && position.yesShares > BigInt(0)) || 
                                  (!market.outcome && position.noShares > BigInt(0));
                      
                      return (
                        <div key={Number(market.id)} className="flex items-center justify-between p-4 rounded-lg bg-secondary/20 border border-border/50">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full ${won ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {won ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-medium">{market.question}</p>
                              <p className="text-xs text-muted-foreground">
                                Resolved: {market.outcome ? "YES" : "NO"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {won ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleClaim(Number(market.id))}
                                disabled={loading}
                                className="bg-monad-green hover:bg-monad-green/90 text-black"
                              >
                                Claim Winnings
                              </Button>
                            ) : (
                              <div className="text-sm text-red-400">Lost</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No resolved markets yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
