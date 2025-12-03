import { Navbar } from "@/components/layout/Navbar";
import { motion } from "framer-motion";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-8" data-testid="text-privacy-title">Privacy Policy</h1>
          
          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <p className="text-muted-foreground text-lg">
              Last updated: December 2025
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nekomancer is a decentralized prediction market protocol. We are committed to protecting your privacy. 
                This policy explains what information we collect and how we use it.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Information We Collect</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p><strong className="text-white">Wallet Address:</strong> Your public blockchain address when you connect your wallet. This is publicly visible on the blockchain.</p>
                <p><strong className="text-white">Transaction Data:</strong> All trades and interactions are recorded on the Monad blockchain. This data is public and immutable.</p>
                <p><strong className="text-white">Usage Analytics:</strong> We may collect anonymized usage data to improve the platform experience.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">What We Don't Collect</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Personal identification information (name, email, phone)</li>
                <li>Private keys or seed phrases</li>
                <li>Off-chain financial information</li>
                <li>Location data</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Blockchain Transparency</h2>
              <p className="text-muted-foreground leading-relaxed">
                All transactions on Nekomancer occur on the public Monad blockchain. This means your wallet address 
                and trading activity are publicly visible to anyone. We do not control or own this data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                We integrate with third-party wallet providers (MetaMask, WalletConnect, etc.). 
                These services have their own privacy policies. We recommend reviewing them.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your funds are secured by smart contracts on the Monad blockchain. We never have access to your 
                private keys or the ability to move your funds. You maintain full custody at all times.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For privacy-related inquiries, contact us at{" "}
                <a href="mailto:privacy@nekomancer.fun" className="text-primary hover:underline">
                  privacy@nekomancer.fun
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
