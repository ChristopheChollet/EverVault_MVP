"use client";

import { useAccount, useChainId, useReadContract } from "wagmi";
import { contractAbi } from "@/constants";
import { getVaultAddress, isSupportedChainId } from "@/constants/addresses";
import { formatUnits } from "viem";
import { useEffect, useMemo, useState } from "react";
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

function txUrl(chainId: number, hash: string) {
  if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${hash}`;
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${hash}`;
  return undefined;
}

function formatUsdc(valueWei: bigint, decimals = 2) {
  const n = Number(formatUnits(valueWei, 6));
  return n.toFixed(decimals);
}

export default function Dashboard() {
  const { address } = useAccount();
  const chainId = useChainId();
  const vaultAddress = getVaultAddress(chainId);

  const [events, setEvents] = useState<VaultEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [lookbackBlocks, setLookbackBlocks] = useState(50_000);
  const [scanRange, setScanRange] = useState<{ fromBlock: string; toBlock: string } | null>(null);

  const { data: tvl } = useReadContract({
    address: vaultAddress,
    abi: contractAbi,
    functionName: "totalValueLocked",
    query: { enabled: Boolean(vaultAddress) },
  });

  const { data: shares } = useReadContract({
    address: vaultAddress,
    abi: contractAbi,
    functionName: "balanceOf",
    args: address && vaultAddress ? [address] : undefined,
    query: { enabled: Boolean(address && vaultAddress) },
  });

  const { data: withdrawalFeeBps } = useReadContract({
    address: vaultAddress,
    abi: contractAbi,
    functionName: "WITHDRAWAL_FEE",
    query: { enabled: Boolean(vaultAddress) },
  });

  const { data: feeRecipient } = useReadContract({
    address: vaultAddress,
    abi: contractAbi,
    functionName: "feeRecipient",
    query: { enabled: Boolean(vaultAddress) },
  });

  async function fetchEvents() {
    if (!vaultAddress) return;
    setIsLoadingEvents(true);
    setEventsError(null);
    try {
      const res = await fetch(`/api/vault-events?chainId=${chainId}&lookback=${lookbackBlocks}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEvents((json.events ?? []) as VaultEvent[]);
      if (json.fromBlock && json.toBlock) {
        setScanRange({ fromBlock: String(json.fromBlock), toBlock: String(json.toBlock) });
      }
    } catch (e: any) {
      setEventsError(e?.message ?? "Failed to load events");
    } finally {
      setIsLoadingEvents(false);
    }
  }

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultAddress, chainId, lookbackBlocks]);

  const myEvents = useMemo(() => {
    if (!address) return [];
    const a = address.toLowerCase();
    return events.filter((e) => (e.args.user ?? "").toLowerCase() === a);
  }, [events, address]);

  const totalFeesWei = useMemo(() => {
    // Fee for Withdrawn event = shares (gross) - usdcAmount (net)
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

  if (!isSupportedChainId(chainId)) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-gray-400">Réseau non supporté. Passe sur Sepolia (ou Base Sepolia).</p>
      </div>
    );
  }

  if (!vaultAddress) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-gray-400">
          Vault non configuré pour ce réseau. Sur Vercel, ajoute{" "}
          <code className="px-1 py-0.5 bg-gray-800 rounded">NEXT_PUBLIC_VAULT_ADDRESS_SEPOLIA</code> (ou{" "}
          <code className="px-1 py-0.5 bg-gray-800 rounded">NEXT_PUBLIC_VAULT_ADDRESS_BASE_SEPOLIA</code>) puis redeploie.
        </p>
        <p className="text-xs text-gray-500">chainId détecté: {chainId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-baseline">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-gray-400">
            Vault: <ExplorerAddress chainId={chainId} address={vaultAddress} />{" "}
            <span className="text-gray-500">(chain {chainId})</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="p-4 card">
          <p className="text-sm text-gray-400">TVL</p>
          <p className="text-2xl font-semibold">
            {tvl ? Number(formatUnits(tvl as bigint, 6)).toFixed(2) : "0.00"}{" "}
            <span className="text-base text-gray-400">USDC</span>
          </p>
        </div>
        <div className="p-4 card">
          <p className="text-sm text-gray-400">Mes parts</p>
          <p className="text-2xl font-semibold">
            {shares ? Number(formatUnits(shares as bigint, 6)).toFixed(6) : "0.000000"}{" "}
            <span className="text-base text-gray-400">gvUSDC</span>
          </p>
          {!address && <p className="mt-1 text-sm text-gray-400">Connecte ton wallet pour voir ta position.</p>}
        </div>
      </div>

      <div className="p-4 card">
        <h3 className="mb-2 font-semibold">Impact (MVP)</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-400">Treasury (fee recipient)</p>
            <p className="text-sm">
              {feeRecipient ? <ExplorerAddress chainId={chainId} address={feeRecipient as `0x${string}`} /> : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Fees estimés (sur la fenêtre scannée)</p>
            <p className="text-sm text-gray-200">
              {formatUsdc(totalFeesWei, 4)} <span className="text-gray-400">USDC</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Intégrations prévues</p>
            <p className="text-sm text-gray-200">
              DAO (gouvernance treasury) • RECs registry (impact)
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Note: “fees estimés” = somme de <span className="text-gray-400">shares - usdcAmount</span> sur les events{" "}
          <span className="text-gray-400">Withdrawn</span> trouvés dans la plage scannée (champ{" "}
          <span className="text-gray-400">Scan last</span>).
        </p>
      </div>

      <div className="p-4 card">
        <div className="flex gap-3 justify-between items-center mb-3">
          <h3 className="font-semibold">Historique (global)</h3>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-400">Scan last</label>
            <input
              className="px-2 py-1 w-24 text-sm bg-gray-800 rounded-md border border-gray-700"
              type="number"
              min={1000}
              step={1000}
              value={lookbackBlocks}
              onChange={(e) => setLookbackBlocks(Number(e.target.value))}
              disabled={isLoadingEvents}
            />
            <span className="text-xs text-gray-400">blocks</span>
            <button
              className="px-3 py-1 text-sm rounded-md btn-primary"
              onClick={fetchEvents}
              disabled={isLoadingEvents}
            >
              {isLoadingEvents ? "Chargement…" : "Rafraîchir"}
            </button>
          </div>
        </div>

        {scanRange && (
          <p className="mb-2 text-xs text-gray-400">
            Scan: blocks {scanRange.fromBlock} → {scanRange.toBlock} • events: {events.length}
          </p>
        )}

        {eventsError && <p className="text-sm text-red-400">Erreur: {eventsError}</p>}
        {!eventsError && isLoadingEvents && <p className="text-sm text-gray-400">Chargement des events…</p>}

        {!eventsError && !isLoadingEvents && events.length === 0 && (
          <p className="text-sm text-gray-400">Aucun event trouvé (essaie après un dépôt/retrait).</p>
        )}

        {!eventsError && events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-400">
                <tr className="text-left border-b border-gray-700">
                  <th className="py-2">Type</th>
                  <th className="py-2">User</th>
                  <th className="py-2">Montant (USDC)</th>
                  <th className="py-2">Tx</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 20).map((e) => {
                  const isDeposit = e.eventName === "Deposited";
                  const user = e.args.user ? `${e.args.user.slice(0, 6)}…${e.args.user.slice(-4)}` : "-";

                  // Deposit: show usdcAmount
                  // Withdraw: event contains shares (gross) + usdcAmount (net after fee)
                  const usdcAmount = e.args.usdcAmount ? BigInt(e.args.usdcAmount) : undefined;
                  const sharesGross = e.args.shares ? BigInt(e.args.shares) : undefined;
                  const fee =
                    !isDeposit && sharesGross !== undefined && usdcAmount !== undefined
                      ? sharesGross - usdcAmount
                      : undefined;

                  const amountFmt = usdcAmount !== undefined ? formatUsdc(usdcAmount, 2) : "-";
                  // Fee is usually very small on test values; show more precision.
                  const feeFmt = fee !== undefined ? formatUsdc(fee, 4) : undefined;
                  const href = e.transactionHash ? txUrl(chainId, e.transactionHash) : undefined;
                  return (
                    <tr key={`${e.blockNumber}-${e.logIndex}-${e.transactionHash}`} className="border-b border-gray-800">
                      <td className="py-2">{isDeposit ? "Deposit" : "Withdraw"}</td>
                      <td className="py-2">{user}</td>
                      <td className="py-2">
                        {amountFmt}
                        {!isDeposit && feeFmt !== undefined && (
                          <span className="text-xs text-gray-400"> (fee {feeFmt})</span>
                        )}
                      </td>
                      <td className="py-2">
                        {href ? (
                          <a className="text-blue-400 hover:underline" href={href} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {address && (
        <div className="p-4 card">
          <h3 className="mb-2 font-semibold">Mon activité</h3>
          {myEvents.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune activité trouvée pour ton adresse.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {myEvents.slice(0, 10).map((e) => {
                const isDeposit = e.eventName === "Deposited";
                const usdcAmount = e.args.usdcAmount ? BigInt(e.args.usdcAmount) : undefined;
                const sharesGross = e.args.shares ? BigInt(e.args.shares) : undefined;
                const fee =
                  !isDeposit && sharesGross !== undefined && usdcAmount !== undefined
                    ? sharesGross - usdcAmount
                    : undefined;
                const amountFmt = usdcAmount ? Number(formatUnits(usdcAmount, 6)).toFixed(2) : "-";
                const feeFmt = fee !== undefined ? Number(formatUnits(fee, 6)).toFixed(2) : undefined;
                return (
                  <li key={`${e.blockNumber}-${e.logIndex}-${e.transactionHash}`}>
                    <span className="text-gray-300">{isDeposit ? "Deposit" : "Withdraw"}</span>{" "}
                    <span className="text-gray-400">
                      {amountFmt} USDC
                      {!isDeposit && feeFmt !== undefined && <span className="text-gray-500"> (fee {feeFmt})</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


