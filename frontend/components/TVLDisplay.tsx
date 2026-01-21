// frontend/components/TVLDisplay.tsx
"use client";
import { useReadContract } from "wagmi";
import { contractAbi } from "@/constants";
import { formatUnits } from "viem";
import { DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChainId } from "wagmi";
import { getVaultAddress } from "@/constants/addresses";

export default function TVLDisplay() {
  const chainId = useChainId();
  const contractAddress = getVaultAddress(chainId);

  const { data: tvl, isLoading, error, refetch, isRefetching } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "totalValueLocked",
    query: {
      enabled: Boolean(contractAddress),
      refetchInterval: 10000, // Rafraîchit toutes les 10 secondes
      staleTime: 5000, // Considère les données comme "fraîches" pendant 5s
    },
  });

  if (!contractAddress) {
    return <p className="text-gray-400">Sélectionne un réseau supporté (Sepolia / Base Sepolia).</p>;
  }
  if (isLoading) return <p className="text-gray-400">Chargement du TVL...</p>;
  if (error) return <p className="text-red-500">Erreur: {error.message}</p>;

  return (
    <div className="pt-4 mt-4 border-t border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2 items-center">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold">Total Value Locked (TVL)</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="px-2 h-6"
        >
          <RefreshCw className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <p className="text-lg">
        {tvl ? parseFloat(formatUnits(tvl as bigint, 6)).toFixed(2) : "0.00"} <span className="text-gray-400">USDC</span>
      </p>
    </div>
  );
}
