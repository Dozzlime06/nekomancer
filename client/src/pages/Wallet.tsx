import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Wallet as WalletIcon, 
  Loader2,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { useContract } from "@/hooks/useContract";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";

export default function Wallet() {
  const { 
    address, 
    isConnected, 
    loading, 
    error,
    approveUsdc,
    deposit,
    withdraw,
    getContractBalance,
    getUsdcBalance,
    getUsdcAllowance
  } = useContract();
  
  const { openConnectModal } = useConnectModal();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [contractBalance, setContractBalance] = useState("0");
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [allowance, setAllowance] = useState("0");
  const [refreshing, setRefreshing] = useState(false);

  const refreshBalances = async () => {
    if (!isConnected) return;
    setRefreshing(true);
    try {
      const [cb, ub, al] = await Promise.all([
        getContractBalance(),
        getUsdcBalance(),
        getUsdcAllowance()
      ]);
      setContractBalance(cb);
      setUsdcBalance(ub);
      setAllowance(al);
    } catch (e) {
      console.error("Failed to refresh balances:", e);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    refreshBalances();
  }, [isConnected, address]);

  const handleDeposit = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      openConnectModal?.();
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const depositNum = parseFloat(depositAmount);
    const walletNum = parseFloat(usdcBalance);
    
    if (walletNum < depositNum) {
      toast.error(`Insufficient USDC in wallet. You have ${walletNum.toFixed(2)} USDC but tried to deposit ${depositNum.toFixed(2)} USDC.`);
      return;
    }

    const needsApprovalNow = parseFloat(allowance) < depositNum;
    
    if (needsApprovalNow) {
      const toastId = toast.loading("Approving USDC... Please confirm in your wallet");
      const approveSuccess = await approveUsdc(depositAmount);
      toast.dismiss(toastId);
      if (!approveSuccess) {
        if (error) {
          toast.error(error);
        } else {
          toast.error("Approval failed. Make sure you have USDC on Monad network.");
        }
        return;
      }
      toast.success("USDC approved!");
      await refreshBalances();
    }

    const toastId = toast.loading("Depositing USDC... Please confirm in your wallet");
    const success = await deposit(depositAmount);
    toast.dismiss(toastId);
    if (success) {
      toast.success("Deposit successful!");
      setDepositAmount("");
      await refreshBalances();
    } else {
      if (error) {
        toast.error(error);
      } else {
        toast.error("Deposit failed - please try again");
      }
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      openConnectModal?.();
      return;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (parseFloat(withdrawAmount) > parseFloat(contractBalance)) {
      toast.error("Insufficient platform balance");
      return;
    }

    const toastId = toast.loading("Withdrawing USDC...");
    const success = await withdraw(withdrawAmount);
    toast.dismiss(toastId);
    if (success) {
      toast.success("Withdrawal successful!");
      setWithdrawAmount("");
      await refreshBalances();
    } else {
      toast.error("Withdrawal failed - please try again");
    }
  };

  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const needsApproval = parseFloat(allowance) < parseFloat(depositAmount || "0");

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern font-sans">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto bg-card/50 backdrop-blur-xl border-primary/20 shadow-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <WalletIcon className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
                <p className="text-muted-foreground">
                  Connect your wallet to deposit USDC and start trading
                </p>
              </div>
              <Button 
                onClick={() => openConnectModal?.()}
                size="lg"
                className="bg-primary hover:bg-primary/90 font-bold shadow-lg"
                data-testid="button-connect-wallet"
              >
                <WalletIcon className="h-5 w-5 mr-2" />
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern font-sans selection:bg-primary/30">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-wallet-title">
            <WalletIcon className="h-8 w-8 text-primary" />
            Wallet
          </h1>
          <p className="text-muted-foreground">Manage your USDC deposits and withdrawals</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-primary/20 via-card/50 to-card/30 backdrop-blur-xl border-primary/20 shadow-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-widest text-muted-foreground">
                Wallet USDC Balance
              </CardDescription>
              <CardTitle className="flex items-baseline gap-2">
                <span className="text-4xl font-mono font-bold" data-testid="text-usdc-balance">
                  {formatBalance(usdcBalance)}
                </span>
                <span className="text-xl text-muted-foreground">USDC</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Available in your connected wallet
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-monad-green/20 via-card/50 to-card/30 backdrop-blur-xl border-monad-green/20 shadow-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-widest text-muted-foreground">
                Platform Balance
              </CardDescription>
              <CardTitle className="flex items-baseline gap-2">
                <span className="text-4xl font-mono font-bold text-monad-green" data-testid="text-platform-balance">
                  {formatBalance(contractBalance)}
                </span>
                <span className="text-xl text-muted-foreground">USDC</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Available for trading on Monad Markets
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/50 backdrop-blur-xl border-white/10 shadow-xl overflow-hidden">
          <Tabs defaultValue="deposit" className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="w-full max-w-md bg-white/5 border border-white/10 h-12 p-1 rounded-xl">
                <TabsTrigger 
                  value="deposit" 
                  className="flex-1 h-full rounded-lg font-semibold data-[state=active]:bg-monad-green data-[state=active]:text-black transition-all"
                  data-testid="tab-deposit"
                >
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Deposit
                </TabsTrigger>
                <TabsTrigger 
                  value="withdraw" 
                  className="flex-1 h-full rounded-lg font-semibold data-[state=active]:bg-monad-pink data-[state=active]:text-white transition-all"
                  data-testid="tab-withdraw"
                >
                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  Withdraw
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="deposit" className="p-6 space-y-6">
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit-amount">Amount to Deposit</Label>
                  <div className="relative">
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="h-14 text-2xl font-mono bg-white/5 border-white/10 rounded-xl pr-20"
                      data-testid="input-deposit-amount"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      USDC
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[10, 50, 100, 500].map((val) => (
                      <Button
                        key={val}
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-white/5 border-white/10 hover:bg-primary/20 hover:border-primary/30"
                        onClick={() => setDepositAmount(val.toString())}
                      >
                        {val}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled={loading || !depositAmount}
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-monad-green to-emerald-500 hover:from-monad-green/90 hover:to-emerald-500/90 text-black rounded-xl shadow-lg"
                  data-testid="button-deposit"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      {needsApproval ? "Approve & Deposit" : "Deposit USDC"}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Deposits are instant. Your funds will be available for trading immediately.
                </p>

                {parseFloat(usdcBalance) === 0 && (
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center space-y-2">
                    <p className="text-sm text-yellow-500 font-medium">No USDC in your wallet</p>
                    <p className="text-xs text-muted-foreground">
                      You need USDC on Monad to deposit. Bridge USDC from another chain or get some from an exchange.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      USDC Contract: <span className="font-mono text-primary">0x754704...a603</span>
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="withdraw" className="p-6 space-y-6">
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Amount to Withdraw</Label>
                  <div className="relative">
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="h-14 text-2xl font-mono bg-white/5 border-white/10 rounded-xl pr-24"
                      data-testid="input-withdraw-amount"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:bg-primary/20 font-bold"
                      onClick={() => setWithdrawAmount(contractBalance)}
                      data-testid="button-max-withdraw"
                    >
                      MAX
                    </Button>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="text-foreground font-medium">
                      {formatBalance(contractBalance)} USDC
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={loading || !withdrawAmount}
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-monad-pink to-rose-500 hover:from-monad-pink/90 hover:to-rose-500/90 text-white rounded-xl shadow-lg"
                  data-testid="button-withdraw"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ArrowUpFromLine className="h-5 w-5 mr-2" />
                      Withdraw to Wallet
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Withdrawals are instant. USDC will be sent directly to your wallet.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
