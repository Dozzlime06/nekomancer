import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useEffect } from "react";
import { Search, Filter, Loader2, TrendingUp, Clock } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { getAllMarkets, Market, MarketStatus, formatUsdc, categoryToString, CATEGORY_NAMES } from "@/lib/contract";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function MarketCard({ market }: { market: Market }) {
  const total = market.yesPool + market.noPool;
  const yesPrice = total > BigInt(0) ? Number((market.noPool * BigInt(10000)) / total) / 100 : 50;
  const noPrice = 100 - yesPrice;
  const volume = formatUsdc(market.totalVolume);
  const isOpen = Number(market.status) === MarketStatus.OPEN;
  const deadline = new Date(Number(market.deadline) * 1000);
  const isExpired = deadline < new Date();

  return (
    <Link href={`/event/${market.id}`}>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all cursor-pointer group h-full" data-testid={`card-market-${market.id}`}>
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex gap-2 mb-3">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
              {categoryToString(market.category)}
            </Badge>
            {!isOpen && (
              <Badge variant="outline" className="text-xs">
                {Number(market.status) === MarketStatus.RESOLVED ? "Resolved" : 
                 Number(market.status) === MarketStatus.PENDING_RESOLUTION ? "Pending" : "Voided"}
              </Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-base leading-tight mb-4 group-hover:text-primary transition-colors line-clamp-2 flex-grow">
            {market.question}
          </h3>
          
          <div className="space-y-3 mt-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-monad-green animate-pulse"></div>
                <span className="text-2xl font-bold text-monad-green">{yesPrice.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground">YES</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-monad-pink">{noPrice.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground ml-1">NO</span>
              </div>
            </div>
            
            <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-monad-green to-monad-green/70 rounded-full transition-all"
                style={{ width: `${yesPrice}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>${parseFloat(volume).toLocaleString()} vol</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{isExpired ? "Expired" : formatDistanceToNow(deadline, { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Markets() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarkets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllMarkets();
      setMarkets(data);
    } catch (e: any) {
      setError(e.message || "Failed to load markets");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(loadMarkets, 15000);
    return () => clearInterval(interval);
  }, []);

  const categories = ["All", ...CATEGORY_NAMES];

  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => {
      const matchesSearch = m.question.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || categoryToString(m.category) === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [markets, searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-background bg-grid-pattern font-sans selection:bg-primary/30">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-markets-title">Explore Markets</h1>
          <p className="text-muted-foreground max-w-2xl">
            Browse and trade on fully on-chain prediction markets. All trades happen directly on Monad.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between sticky top-16 z-40 bg-background/95 backdrop-blur-xl p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search markets..." 
              className="pl-9 bg-secondary/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar items-center">
            <Filter className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                data-testid={`button-category-${cat.toLowerCase()}`}
                className={`rounded-full whitespace-nowrap ${activeCategory === cat 
                  ? "bg-foreground text-background hover:bg-foreground/90" 
                  : "bg-transparent border-border text-muted-foreground hover:text-foreground"}`}
              >
                {cat}
              </Button>
            ))}
            <div className="w-[1px] h-6 bg-border/50 mx-2 hidden md:block"></div>
            <Select defaultValue="volume">
              <SelectTrigger className="w-[140px] h-9 rounded-full bg-transparent border-border hidden md:flex" data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volume">High Volume</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="ending">Ending Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p>Failed to load markets. Please try again.</p>
            <Button variant="link" onClick={loadMarkets}>Retry</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[500px]">
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map((market) => (
                <MarketCard key={Number(market.id)} market={market} />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-20" />
                <p>No markets found. Create the first one!</p>
                <Link href="/create">
                  <Button variant="link" data-testid="button-create-market">Create Market</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
