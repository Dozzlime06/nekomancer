import { Link, useLocation } from "wouter";
import { Bell, Search, Menu, Home as HomeIcon, Trophy, Briefcase, ChevronRight, TrendingUp, Plus, Wallet, LogOut, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import logoImage from "@assets/IMG_9377_1764744730481.jpeg";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const activeWallet = wallets[0];
  const address = activeWallet?.address || user?.wallet?.address;
  const isConnected = ready && authenticated && !!address;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const navLinks = [
    { href: "/markets", label: "Markets", icon: TrendingUp },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
    { href: "/wallet", label: "Wallet", icon: Wallet },
  ];

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied!");
    }
  };

  const openExplorer = () => {
    if (address) {
      window.open(`https://monadvision.com/address/${address}`, "_blank");
    }
  };

  return (
    <nav className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? "border-b border-white/10 bg-background/90 backdrop-blur-xl shadow-lg" : "bg-background/50 backdrop-blur-sm border-b border-white/5"}`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90 shrink-0" data-testid="link-home">
            <img 
              src={logoImage} 
              alt="Nekomancer" 
              className="h-10 w-10 rounded-lg shadow-lg shadow-primary/30"
            />
            <span className="text-xl font-black tracking-wide bg-gradient-to-r from-purple-400 via-primary to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(131,110,249,0.5)]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              NEKOMANCER
            </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 mx-4 bg-white/5 p-1 rounded-full border border-white/5 backdrop-blur-sm">
          {navLinks.map(link => (
             <Link 
               key={link.href} 
               href={link.href}
               className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${location === link.href ? 'bg-primary/20 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
               data-testid={`link-${link.label.toLowerCase()}`}
             >
                 {link.label}
             </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center relative w-64 mr-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search markets..." 
              className="pl-9 bg-white/5 border-transparent focus-visible:ring-primary/50 h-9 font-mono text-sm rounded-full transition-all focus:bg-white/10 focus:w-full"
              data-testid="input-search-nav"
            />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/create">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground hidden sm:flex hover:bg-white/10 rounded-full"
              data-testid="button-create-prediction"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </Link>

          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hidden sm:flex hover:bg-white/10 rounded-full" data-testid="button-notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse"></span>
          </Button>

          {!ready ? (
            <Button
              disabled
              className="font-mono font-bold h-9 rounded-full bg-primary/50"
              data-testid="button-wallet"
            >
              Loading...
            </Button>
          ) : !isConnected ? (
            <Button
              onClick={login}
              className="font-mono font-bold h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(131,110,249,0.4)] hover:shadow-[0_0_25px_rgba(131,110,249,0.6)] hover:scale-105 transition-all duration-300"
              data-testid="button-wallet"
            >
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="font-mono font-bold h-9 rounded-full border-primary/30 text-primary hover:bg-primary/10 transition-all duration-300"
                  data-testid="button-wallet"
                >
                  <span className="hidden sm:inline">{shortenAddress(address!)}</span>
                  <span className="sm:hidden">{address?.slice(0, 6)}...</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-xl border-white/10">
                <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Address
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openExplorer} className="cursor-pointer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Explorer
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-400 focus:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0 -mr-2 hover:bg-white/10 rounded-full" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] border-l border-white/10 bg-background/95 backdrop-blur-xl p-6">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2 mb-6">
                  <img 
                    src={logoImage} 
                    alt="Nekomancer" 
                    className="h-10 w-10 rounded-lg shadow-lg shadow-primary/30"
                  />
                  <SheetTitle className="text-xl font-black tracking-wide bg-gradient-to-r from-purple-400 via-primary to-purple-300 bg-clip-text text-transparent" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    NEKOMANCER
                  </SheetTitle>
                </div>
              </SheetHeader>
              
              <div className="flex flex-col gap-6 mt-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                    placeholder="Search markets..." 
                    className="pl-9 bg-white/5 border-transparent focus-visible:ring-primary/50 h-10 font-mono text-sm w-full rounded-full"
                    />
                </div>

                <nav className="flex flex-col space-y-2">
                    <Link href="/" className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors group ${location === '/' ? 'bg-white/10 text-foreground' : 'hover:bg-white/5'}`}>
                        <div className="flex items-center gap-3">
                            <HomeIcon className={`h-5 w-5 transition-colors ${location === '/' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                            <span className="font-medium">Home</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </Link>
                    {navLinks.map(link => (
                        <Link key={link.href} href={link.href} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors group ${location === link.href ? 'bg-white/10 text-foreground' : 'hover:bg-white/5'}`}>
                            <div className="flex items-center gap-3">
                                <link.icon className={`h-5 w-5 transition-colors ${location === link.href ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                                <span className="font-medium">{link.label}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        </Link>
                    ))}
                    <Link href="/create" className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors group ${location === '/create' ? 'bg-white/10 text-foreground' : 'hover:bg-white/5'}`}>
                        <div className="flex items-center gap-3">
                            <Plus className={`h-5 w-5 transition-colors ${location === '/create' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                            <span className="font-medium">Create Prediction</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </Link>
                </nav>

                <Separator className="bg-white/10" />

                <div className="px-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Community</h4>
                    <div className="flex gap-3">
                        <a href="https://nekomancer-dex.gitbook.io/docs/" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-white/10 bg-white/5 hover:bg-white/10">
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.806 5 19c0-.101.009-.191.024-.273.112-.576.584-.717.988-.727H21V4a2 2 0 0 0-2-2zm0 9-2-1-2 1V4h4v7z"/></svg>
                            </Button>
                        </a>
                        <a href="https://x.com/nekomancerhq" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-white/10 bg-white/5 hover:bg-white/10">
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </Button>
                        </a>
                        <a href="https://t.me/nekomancerHQ" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-white/10 bg-white/5 hover:bg-white/10">
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                            </Button>
                        </a>
                    </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
