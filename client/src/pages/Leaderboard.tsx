import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, TrendingUp, ArrowUpRight, Loader2, User as UserIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard, type User } from "@/lib/api";
import { useState } from "react";

type TimeFilter = "weekly" | "monthly" | "alltime";

export default function Leaderboard() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("weekly");

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["leaderboard", timeFilter],
    queryFn: () => fetchLeaderboard(20),
    refetchInterval: 30000,
  });

  const getInitials = (address: string) => {
    return address.slice(2, 4).toUpperCase();
  };

  const getShortAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background bg-grid-pattern font-sans selection:bg-primary/30">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-leaderboard-title">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    Leaderboard
                </h1>
                <p className="text-muted-foreground">Top performing predictors on Monad Markets</p>
            </div>
            <div className="flex gap-2">
                 <Button 
                   variant={timeFilter === "weekly" ? "outline" : "ghost"} 
                   className={timeFilter === "weekly" ? "bg-secondary" : ""}
                   onClick={() => setTimeFilter("weekly")}
                   data-testid="button-weekly"
                 >
                   Weekly
                 </Button>
                 <Button 
                   variant={timeFilter === "monthly" ? "outline" : "ghost"}
                   className={timeFilter === "monthly" ? "bg-secondary" : ""}
                   onClick={() => setTimeFilter("monthly")}
                   data-testid="button-monthly"
                 >
                   Monthly
                 </Button>
                 <Button 
                   variant={timeFilter === "alltime" ? "outline" : "ghost"}
                   className={timeFilter === "alltime" ? "bg-secondary" : ""}
                   onClick={() => setTimeFilter("alltime")}
                   data-testid="button-alltime"
                 >
                   All Time
                 </Button>
            </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 border-border/50 bg-card/30">
            <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No Leaders Yet</h3>
            <p className="text-muted-foreground text-center">
              Be the first to make predictions and claim the top spot!
            </p>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
                {leaderboard.slice(0, 3).map((user: User, i: number) => (
                    <Card 
                      key={user.id} 
                      className={`relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm ${i === 0 ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : ''}`}
                      data-testid={`card-top-${i + 1}`}
                    >
                        <div className={`absolute top-0 right-0 p-4 opacity-10`}>
                             <Trophy className="h-24 w-24" />
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                 <Badge variant="outline" className={`${i === 0 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' : i === 1 ? 'bg-slate-300/20 text-slate-300 border-slate-300/50' : 'bg-amber-700/20 text-amber-700 border-amber-700/50'}`}>
                                    Rank #{i + 1}
                                 </Badge>
                                 {i === 0 && <Medal className="h-6 w-6 text-yellow-500" />}
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center text-center space-y-4 pt-4">
                            <Avatar className="h-20 w-20 border-2 border-background ring-2 ring-border">
                                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-monad-purple/30 text-xl font-bold">
                                  <UserIcon className="h-10 w-10 text-primary" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-bold text-lg font-mono">{getShortAddress(user.walletAddress)}</div>
                                <div className="text-sm text-muted-foreground">Trader</div>
                            </div>
                            <div className="grid grid-cols-2 gap-8 w-full pt-4 border-t border-border/50">
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Profit</div>
                                    <div className="font-mono font-bold text-green-400 text-lg">
                                      +${parseFloat(user.totalProfit).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</div>
                                    <div className="font-mono font-bold text-primary text-lg">
                                      {parseFloat(user.winRate).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {leaderboard.length > 3 && (
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
                  <CardContent className="p-0">
                      <div className="relative w-full overflow-auto">
                          <table className="w-full caption-bottom text-sm">
                              <thead className="[&_tr]:border-b">
                                  <tr className="border-b border-border/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rank</th>
                                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Trader</th>
                                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Total Profit</th>
                                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Win Rate</th>
                                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Volume</th>
                                  </tr>
                              </thead>
                              <tbody className="[&_tr:last-child]:border-0">
                                  {leaderboard.slice(3).map((user: User, i: number) => (
                                      <tr key={user.id} className="border-b border-border/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted" data-testid={`row-rank-${i + 4}`}>
                                          <td className="p-4 align-middle font-mono font-bold text-muted-foreground">#{i + 4}</td>
                                          <td className="p-4 align-middle">
                                              <div className="flex items-center gap-3">
                                                  <Avatar className="h-8 w-8">
                                                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-monad-purple/20">
                                                        <UserIcon className="h-4 w-4 text-primary" />
                                                      </AvatarFallback>
                                                  </Avatar>
                                                  <div className="font-medium font-mono">{getShortAddress(user.walletAddress)}</div>
                                              </div>
                                          </td>
                                          <td className="p-4 align-middle text-right font-mono text-green-400">+${parseFloat(user.totalProfit).toLocaleString()}</td>
                                          <td className="p-4 align-middle text-right font-mono">{parseFloat(user.winRate).toFixed(0)}%</td>
                                          <td className="p-4 align-middle text-right font-mono text-muted-foreground">${parseFloat(user.totalVolume).toLocaleString()}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
