import { ethers } from "ethers";

export const MONAD_TESTNET = {
  chainId: 10143,
  chainIdHex: "0x27AF",
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  blockExplorer: "https://explorer.testnet.monad.xyz",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
};

export const MONAD_MAINNET = {
  chainId: 143,
  chainIdHex: "0x8F",
  name: "Monad",
  rpcUrl: "https://rpc.monad.xyz",
  blockExplorer: "https://monadvision.com",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
};

export const ACTIVE_NETWORK = MONAD_MAINNET;

export async function getProvider(): Promise<ethers.BrowserProvider | null> {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

export async function getSigner(): Promise<ethers.Signer | null> {
  const provider = await getProvider();
  if (!provider) return null;
  return provider.getSigner();
}

export async function switchToMonad(): Promise<boolean> {
  if (!window.ethereum) return false;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ACTIVE_NETWORK.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: ACTIVE_NETWORK.chainIdHex,
              chainName: ACTIVE_NETWORK.name,
              nativeCurrency: ACTIVE_NETWORK.nativeCurrency,
              rpcUrls: [ACTIVE_NETWORK.rpcUrl],
              blockExplorerUrls: [ACTIVE_NETWORK.blockExplorer],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Monad network:", addError);
        return false;
      }
    }
    console.error("Failed to switch network:", switchError);
    return false;
  }
}

export async function getMonBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(ACTIVE_NETWORK.rpcUrl);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Failed to get balance:", error);
    return "0";
  }
}

export async function sendDeposit(
  amount: string
): Promise<{ hash: string } | null> {
  try {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available");

    const tx = await signer.sendTransaction({
      to: "0x0000000000000000000000000000000000000000",
      value: ethers.parseEther(amount),
    });

    await tx.wait();
    return { hash: tx.hash };
  } catch (error) {
    console.error("Deposit failed:", error);
    return null;
  }
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isMetaMaskInstalled(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}
