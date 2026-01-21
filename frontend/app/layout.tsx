// frontend/app/layout.tsx
"use client";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Inter } from "next/font/google";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "wagmi";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

const config = getDefaultConfig({
  appName: "GreenVault",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [sepolia, baseSepolia],
  transports: {
    // Fallbacks avoid a blank env breaking local dev.
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
        "https://sepolia.infura.io/v3/c2a56aff241e4685a2810ebededbf7a6"
    ),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"
    ),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              {children}
              <Toaster richColors />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}