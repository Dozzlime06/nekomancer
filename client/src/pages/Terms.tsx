import { Navbar } from "@/components/layout/Navbar";
import { motion } from "framer-motion";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-8" data-testid="text-terms-title">Terms of Service</h1>
          
          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <p className="text-muted-foreground text-lg">
              Last updated: December 2025
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Nekomancer, you agree to be bound by these Terms of Service. 
                If you disagree with any part, you may not access the protocol.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Protocol Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nekomancer is a decentralized prediction market protocol deployed on the Monad blockchain. 
                Users can create markets, buy and sell outcome shares, and participate in resolution through 
                a permissionless oracle system.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                You must be at least 18 years old and legally permitted to use blockchain-based services 
                in your jurisdiction. You are responsible for compliance with local laws.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Risk Disclosure</h2>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 space-y-3">
                <p className="text-red-400 font-semibold">Important Risks:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li><strong className="text-white">Smart Contract Risk:</strong> Bugs in smart contracts could result in loss of funds.</li>
                  <li><strong className="text-white">Market Risk:</strong> Prediction markets involve speculation. You may lose your entire stake.</li>
                  <li><strong className="text-white">Oracle Risk:</strong> Resolution depends on correct outcome proposals and challenges.</li>
                  <li><strong className="text-white">Regulatory Risk:</strong> Prediction markets may not be legal in all jurisdictions.</li>
                  <li><strong className="text-white">Volatility:</strong> Share prices can change rapidly based on market sentiment.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">No Financial Advice</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nothing on Nekomancer constitutes financial, investment, or legal advice. 
                All trading decisions are your own responsibility. Only trade with funds you can afford to lose.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Prohibited Activities</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Manipulating markets through wash trading or collusion</li>
                <li>Creating markets on illegal or harmful outcomes</li>
                <li>Exploiting smart contract vulnerabilities</li>
                <li>Using automated bots to gain unfair advantage</li>
                <li>Violating applicable laws or regulations</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Nekomancer brand, logo, and interface design are proprietary. 
                The smart contracts are open source and available on GitHub.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nekomancer is provided "as is" without warranties. We are not liable for any losses 
                resulting from your use of the protocol, including but not limited to trading losses, 
                smart contract failures, or oracle errors.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Modifications</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms at any time. Continued use after changes constitutes acceptance. 
                Smart contract upgrades follow protocol governance procedures.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these terms, contact us at{" "}
                <a href="mailto:legal@nekomancer.fun" className="text-primary hover:underline">
                  legal@nekomancer.fun
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
