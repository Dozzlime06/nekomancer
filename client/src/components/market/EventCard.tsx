import { motion } from "framer-motion";
import { type Event } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, TrendingUp, Users, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EventVoteChart } from "./EventVoteChart";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface EventCardProps {
  event: Event;
  featured?: boolean;
}

export function EventCard({ event, featured = false }: EventCardProps) {
  const { toast } = useToast();
  
  const volume = parseFloat(event.volume);
  const yesPrice = parseFloat(event.yesPrice);
  const noPrice = parseFloat(event.noPrice);
  
  const totalVotes = Math.floor(volume / 10); 
  const yesVotes = Math.floor(totalVotes * yesPrice);
  const noVotes = totalVotes - yesVotes;

  const handleBet = (e: React.MouseEvent, type: "YES" | "NO") => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: `Bet Placed: ${type}`,
      description: `You placed a bet on ${type} for "${event.question}"`,
      variant: "default", 
      className: type === "YES" ? "border-monad-green text-monad-green" : "border-monad-pink text-monad-pink"
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="h-full"
    >
      <Link href={`/event/${event.id}`}>
        <Card 
          className={`h-full flex flex-col overflow-hidden border bg-card/40 backdrop-blur-md transition-all duration-300 group cursor-pointer ${featured ? "border-primary/30 shadow-[0_0_30px_rgba(131,110,249,0.15)]" : "border-white/5 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(131,110,249,0.1)]"}`}
          data-testid={`card-event-${event.id}`}
        >
          <CardHeader className="pb-2 space-y-3 relative z-10">
            <div className="flex justify-between items-start">
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-white/5 text-xs font-mono text-muted-foreground border-white/10">
                  {event.category}
                </Badge>
                {event.resolved && (
                  <Badge variant="default" className="bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Resolved
                  </Badge>
                )}
              </div>
              <div className="flex items-center text-xs text-muted-foreground font-mono">
                <Clock className="w-3 h-3 mr-1" />
                {formatDistanceToNow(new Date(event.deadline), { addSuffix: true })}
              </div>
            </div>
            
            <h3 className={`font-bold leading-tight text-foreground/90 group-hover:text-primary transition-colors ${featured ? "text-2xl md:text-3xl" : "text-lg"}`}>
              {event.question}
            </h3>

            <div className="flex justify-between text-xs text-muted-foreground font-mono pt-1">
              <div className="flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 text-primary" />
                ${(volume / 1000).toFixed(1)}k Vol
              </div>
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-1" />
                {Math.floor(volume / 50)} Traders
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-2 flex-grow relative z-10">
            <div className="space-y-4">
              <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                  <EventVoteChart 
                      yesVotes={yesVotes} 
                      noVotes={noVotes} 
                      outcome={event.outcome as "YES" | "NO" | undefined}
                  />
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-4 px-4 relative z-10">
            <div className="w-full grid grid-cols-2 gap-3">
              <Button 
                onClick={(e) => handleBet(e, "YES")}
                variant="outline" 
                className="h-10 border-white/5 bg-white/5 text-monad-green hover:bg-monad-green/10 hover:border-monad-green/30 font-mono font-bold transition-all active:scale-95"
                disabled={event.resolved}
                data-testid={`button-bet-yes-${event.id}`}
              >
                BET YES
              </Button>
              <Button 
                onClick={(e) => handleBet(e, "NO")}
                variant="outline" 
                className="h-10 border-white/5 bg-white/5 text-monad-pink hover:bg-monad-pink/10 hover:border-monad-pink/30 font-mono font-bold transition-all active:scale-95"
                disabled={event.resolved}
                data-testid={`button-bet-no-${event.id}`}
              >
                BET NO
              </Button>
            </div>
          </CardFooter>
          
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </Card>
      </Link>
    </motion.div>
  );
}
