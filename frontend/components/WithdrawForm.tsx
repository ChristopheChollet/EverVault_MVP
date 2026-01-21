// frontend/components/WithdrawForm.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { contractAbi } from "@/constants";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useChainId } from "wagmi";
import { getVaultAddress } from "@/constants/addresses";

function txUrl(chainId: number, hash: string) {
  if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${hash}`;
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${hash}`;
  return undefined;
}

export default function WithdrawForm() {
  const [shares, setShares] = useState("");
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getVaultAddress(chainId);
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: balance } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "balanceOf",
    args: address && contractAddress ? [address] : undefined,
    query: { enabled: Boolean(address && contractAddress) },
  });

  useEffect(() => {
    if (isSuccess) {
      const href = hash ? txUrl(chainId, hash) : undefined;
      toast.success(
        href ? (
          <span>
            Retrait confirmé —{" "}
            <a className="underline" href={href} target="_blank" rel="noreferrer">
              voir sur l’explorer
            </a>
          </span>
        ) : (
          "Retrait confirmé"
        )
      );
    }
  }, [isSuccess, hash, chainId]);

  const balanceFormatted = balance ? formatUnits(balance as bigint, 6) : "0";
  const sharesInWei = shares ? parseUnits(shares, 6) : BigInt(0);

  const { data: withdrawalFeeBps } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "WITHDRAWAL_FEE",
    query: { enabled: Boolean(contractAddress) },
  });

  const feeBps = withdrawalFeeBps ? BigInt(withdrawalFeeBps as bigint) : BigInt(50);
  const feeWei = (sharesInWei * feeBps) / BigInt(10_000);
  const netWei = sharesInWei - feeWei;
  const netFormatted = shares ? formatUnits(netWei, 6) : "0";
  // Fee is often small; show 4 decimals for readability.
  const feeFormatted = shares ? Number(formatUnits(feeWei, 6)).toFixed(4) : "0.0000";

  const handleWithdraw = () => {
    if (!shares || !contractAddress) return;
    writeContract({
      address: contractAddress,
      abi: contractAbi as any,
      functionName: "withdraw",
      // Shares have the same decimals as USDC in this MVP (6)
      args: [parseUnits(shares, 6)],
    } as any);
  };

  return (
    <div className="space-y-4">
      {!contractAddress ? (
        <p className="text-sm text-gray-400">Sélectionne un réseau supporté (Sepolia / Base Sepolia).</p>
      ) : (
        <p className="text-sm text-gray-400">
          Ton solde: {balanceFormatted} parts
        </p>
      )}
      <p className="text-xs text-gray-500">
        Format attendu: montant lisible (ex: <span className="text-gray-400">0.2</span>). Les parts utilisent{" "}
        <span className="text-gray-400">6 décimales</span> (0.2 = 200000 unités).
      </p>
      {shares && (
        <p className="text-xs text-gray-400">
          Estimation: tu recevras <span className="text-gray-200">{netFormatted} USDC</span>{" "}
          <span className="text-gray-500">(fee {feeFormatted})</span>
        </p>
      )}
      <Input
        type="number"
        placeholder="Nombre de parts (ex: 0.2)"
        value={shares}
        onChange={(e) => setShares(e.target.value)}
        disabled={isPending || isConfirming}
        className="w-full px-3 py-2 border rounded-md bg-gray-800"
      />
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setShares(balanceFormatted)}
          disabled={!balance || isPending || isConfirming}
          className="h-7 px-2 text-xs"
        >
          Max
        </Button>
      </div>
      <Button
        variant="default"
        size="default"
        onClick={handleWithdraw}
        disabled={isPending || isConfirming || !shares || !contractAddress}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isPending ? "En attente..." : isConfirming ? "Confirmation..." : "Retirer"}
      </Button>
    </div>
  );
}