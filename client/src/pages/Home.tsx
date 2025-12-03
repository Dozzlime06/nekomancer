import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Activity, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import heroBg from "@assets/IMG_9375_1764744382242.jpeg";

export default function Home() {

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30 overflow-x-hidden">
      <Navbar />
      
      <section className="relative pt-32 pb-40 overflow-hidden min-h-[90vh] flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
            <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>

        <div className="container relative z-10 mx-auto px-4 flex flex-col items-center text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-monad-green/50 text-sm font-medium text-monad-green mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(0,255,136,0.2)]"
            >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-monad-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-monad-green"></span>
                </span>
                Live on Monad Mainnet
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white mb-6 max-w-5xl leading-[1.1] drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                data-testid="text-hero-title"
            >
                THE FUTURE OF <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-monad-green via-[#00ff88] to-[#88ffcc] drop-shadow-[0_0_30px_rgba(0,255,136,0.5)]">PREDICTION</span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl text-white/90 max-w-2xl mb-10 leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
                Bet on crypto, sports, politics, and more. 
                100% on-chain. No middlemen. Winners get paid instantly.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
                <Link href="/markets">
                    <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(131,110,249,0.4)] transition-transform hover:scale-105" data-testid="button-start-trading">
                        Start Trading <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex gap-3 justify-center w-full sm:w-auto">
                    <a href="https://nekomancer-dex.gitbook.io/docs/" target="_blank" rel="noopener noreferrer">
                        <Button size="lg" variant="outline" className="h-14 w-14 rounded-full border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm p-0 flex items-center justify-center" data-testid="button-docs">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.806 5 19c0-.101.009-.191.024-.273.112-.576.584-.717.988-.727H21V4a2 2 0 0 0-2-2zm0 9-2-1-2 1V4h4v7z"/></svg>
                        </Button>
                    </a>
                    <a href="https://x.com/nekomancerhq" target="_blank" rel="noopener noreferrer">
                        <Button size="lg" variant="outline" className="h-14 w-14 rounded-full border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm p-0 flex items-center justify-center" data-testid="button-twitter">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </Button>
                    </a>
                    <a href="https://t.me/nekomancerHQ" target="_blank" rel="noopener noreferrer">
                        <Button size="lg" variant="outline" className="h-14 w-14 rounded-full border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm p-0 flex items-center justify-center" data-testid="button-telegram">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        </Button>
                    </a>
                </div>
            </motion.div>
        </div>
      </section>

      
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for Speed & Trust</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                    We redesigned prediction markets from the ground up to leverage Monad's high throughput architecture.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    {
                        icon: Zap,
                        color: "text-yellow-400",
                        title: "Instant Settlement",
                        desc: "No more waiting. Payouts land in your wallet the second the oracle confirms the outcome."
                    },
                    {
                        icon: ShieldCheck,
                        color: "text-monad-green",
                        title: "Trustless Oracles",
                        desc: "Powered by ERC-8004 agents that verify real-world data without centralized intermediaries."
                    },
                    {
                        icon: Activity,
                        color: "text-monad-pink",
                        title: "Deep Liquidity",
                        desc: "Our AMM model ensures you can always enter and exit positions with minimal slippage."
                    }
                ].map((feature, i) => (
                    <div key={i} className="group p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 transition-all duration-300">
                        <div className={`h-14 w-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 ${feature.color} group-hover:scale-110 transition-transform`}>
                            <feature.icon className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {feature.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                    <span className="text-xl font-black tracking-wide bg-gradient-to-r from-purple-400 via-primary to-purple-300 bg-clip-text text-transparent" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        NEKOMANCER
                    </span>
                </div>
                <div className="flex gap-8 text-sm text-muted-foreground">
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                    <a href="https://nekomancer-dex.gitbook.io/docs/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</a>
                    <a href="https://x.com/nekomancerhq" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
                    <a href="https://t.me/nekomancerHQ" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram</a>
                </div>
            </div>
            <div className="mt-8 text-center text-xs text-muted-foreground/50">
                © 2025 Nekomancer Protocol.
            </div>
        </div>
      </footer>
    </div>
  );
}
