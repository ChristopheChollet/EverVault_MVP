"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useChainId, useReadContract } from "wagmi";
import { contractAbi } from "@/constants";
import { getVaultAddress, isSupportedChainId } from "@/constants/addresses";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { ExplorerAddress } from "@/components/ExplorerAddress";

type VaultEvent = {
  chainId: number;
  address: `0x${string}`;
  blockNumber?: string;
  transactionHash?: `0x${string}`;
  logIndex?: string;
  eventName: "Deposited" | "Withdrawn";
  args: Record<string, string>;
};

function formatUsdc(valueWei: bigint, decimals = 4) {
  const n = Number(formatUnits(valueWei, 6));
  return n.toFixed(decimals);
}

export default function ImpactPage() {
  const chainId = useChainId();
  const vaultAddress = getVaultAddress(chainId);

  const [events, setEvents] = useState<VaultEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookbackBlocks, setLookbackBlocks] = useState(50_000);

  const { data: feeRecipient } = useReadContract({
    address: vaultAddress,
    abi: contractAbi,
    functionName: "feeRecipient",
    query: { enabled: Boolean(vaultAddress) },
  });

  const totalFeesWei = useMemo(() => {
    let sum = BigInt(0);
    for (const e of events) {
      if (e.eventName !== "Withdrawn") continue;
      const sharesGross = e.args.shares ? BigInt(e.args.shares) : undefined;
      const usdcNet = e.args.usdcAmount ? BigInt(e.args.usdcAmount) : undefined;
      if (sharesGross === undefined || usdcNet === undefined) continue;
      if (sharesGross > usdcNet) sum += sharesGross - usdcNet;
    }
    return sum;
  }, [events]);

  async function fetchEvents() {
    if (!vaultAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vault-events?chainId=${chainId}&lookback=${lookbackBlocks}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEvents((json.events ?? []) as VaultEvent[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load events");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultAddress, chainId, lookbackBlocks]);

  return (
    <div className="min-h-screen text-white bg-gray-900">
      <Header />
      <main className="container p-8 pt-20 pb-20 mx-auto space-y-6 max-w-5xl">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Impact</h2>
          <p className="text-sm text-gray-400">
            Cette page résume le “fil rouge” entre GreenVault (treasury), la future DAO (gouvernance) et le registry de
            certificats (RECs).
          </p>
        </div>

        {!isSupportedChainId(chainId) && (
          <div className="p-4 card">
            <p className="text-gray-400">Réseau non supporté. Passe sur Sepolia (ou Base Sepolia).</p>
          </div>
        )}

        {isSupportedChainId(chainId) && !vaultAddress && (
          <div className="p-4 card">
            <p className="text-gray-400">
              Vault non configuré pour ce réseau. Configure{" "}
              <code className="px-1 py-0.5 bg-gray-800 rounded">NEXT_PUBLIC_VAULT_ADDRESS_SEPOLIA</code> (ou{" "}
              <code className="px-1 py-0.5 bg-gray-800 rounded">NEXT_PUBLIC_VAULT_ADDRESS_BASE_SEPOLIA</code>).
            </p>
          </div>
        )}

        {vaultAddress && (
          <div className="p-4 space-y-3 card">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-sm text-gray-400">Vault</p>
                <p className="text-sm">
                  <ExplorerAddress chainId={chainId} address={vaultAddress} />
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Treasury (fee recipient)</p>
                <p className="text-sm">{feeRecipient ? <ExplorerAddress chainId={chainId} address={feeRecipient as `0x${string}`} /> : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Fees estimés (fenêtre scannée)</p>
                <p className="text-sm text-gray-200">
                  {formatUsdc(totalFeesWei, 4)} <span className="text-gray-400">USDC</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-center text-sm">
              <span className="text-gray-400">Scan last</span>
              <input
                className="px-2 py-1 w-28 text-sm bg-gray-800 rounded-md border border-gray-700"
                type="number"
                min={1000}
                step={1000}
                value={lookbackBlocks}
                onChange={(e) => setLookbackBlocks(Number(e.target.value))}
                disabled={isLoading}
              />
              <span className="text-gray-400">blocks</span>
              <button className="px-3 py-1 text-sm rounded-md btn-primary" onClick={fetchEvents} disabled={isLoading}>
                {isLoading ? "Chargement…" : "Rafraîchir"}
              </button>
            </div>

            {error && <p className="text-sm text-red-400">Erreur: {error}</p>}
            {!error && (
              <p className="text-xs text-gray-500">
                Note: “fees estimés” = somme de <span className="text-gray-400">shares - usdcAmount</span> sur les events{" "}
                <span className="text-gray-400">Withdrawn</span> trouvés dans la fenêtre.
              </p>
            )}
          </div>
        )}

        <div className="p-4 space-y-3 card">
          <h3 className="font-semibold">Intégrations (sans doublon)</h3>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>
              <span className="text-gray-200">energy-governance-dao</span>: la DAO gouverne la treasury (fees, paramètres,
              destination).
            </li>
            <li>
              <span className="text-gray-200">green-recs-registry</span>: le “vrai” impact (certificats RECs) vit dans un
              registry dédié; GreenVault s’y connecte.
            </li>
            <li>
              <span className="text-gray-200">grid-flex-market</span>: marché énergie (matching) que la DAO peut financer
              et que le registry peut certifier.
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}

