// frontend/components/DepositForm.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { contractAbi } from "@/constants";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useChainId } from "wagmi";
import { getVaultAddress } from "@/constants/addresses";

// ABI minimal pour approve et allowance
const erc20Abi = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

function txUrl(chainId: number, hash: string) {
  if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${hash}`;
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${hash}`;
  return undefined;
}

export default function DepositForm() {
  const [amount, setAmount] = useState("");
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getVaultAddress(chainId);
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read USDC address directly from the vault contract (avoids hardcoding per-chain USDC)
  const { data: usdcAddress } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "USDC",
    query: { enabled: Boolean(contractAddress) },
  });

  const { data: usdcBalance } = useReadContract({
    address: usdcAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address && usdcAddress ? [address] : undefined,
    query: { enabled: Boolean(address && usdcAddress) },
  });

  // Vérifie l'allowance actuelle
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && contractAddress ? [address, contractAddress] : undefined,
    query: { enabled: Boolean(address && contractAddress && usdcAddress) },
  });

  // Rafraîchit l'allowance après une transaction réussie
  useEffect(() => {
    if (isSuccess) {
      const href = hash ? txUrl(chainId, hash) : undefined;
      toast.success(
        href ? (
          <span>
            Transaction confirmée —{" "}
            <a className="underline" href={href} target="_blank" rel="noreferrer">
              voir sur l’explorer
            </a>
          </span>
        ) : (
          "Transaction confirmée"
        )
      );
      refetchAllowance();
    }
  }, [isSuccess, refetchAllowance, hash, chainId]);

  // Calcule le montant en wei (6 décimales pour USDC)
  const amountInWei = amount ? parseUnits(amount, 6) : BigInt(0);
  
  // Vérifie si l'approbation est nécessaire
  const needsApproval = !allowance || (allowance as bigint) < amountInWei;

  // Affiche les erreurs
  useEffect(() => {
    if (writeError) {
      toast.error(`Erreur: ${writeError.message}`);
    }
  }, [writeError]);

  // Fonction pour approuver
  const handleApprove = () => {
    if (!amount || !address || !contractAddress || !usdcAddress) {
      toast.error("Montant ou adresse manquant");
      return;
    }
    
    toast.info("Envoi de la transaction d'approbation...");
    
    writeContract({
      address: usdcAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [contractAddress, amountInWei],
    } as any);
  };

  // Fonction pour déposer
  const handleDeposit = () => {
    if (!amount || !address || !contractAddress) {
      toast.error("Montant ou adresse manquant");
      return;
    }
    
    toast.info("Envoi de la transaction de dépôt...");
    
    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "deposit",
      args: [amountInWei],
    } as any);
  };

  const balanceFormatted = usdcBalance ? formatUnits(usdcBalance as bigint, 6) : "0";
  const allowanceFormatted = allowance ? formatUnits(allowance as bigint, 6) : "0";

  return (
    <div className="space-y-4">
      {!contractAddress && (
        <p className="text-sm text-gray-400">Sélectionne un réseau supporté (Sepolia / Base Sepolia).</p>
      )}
      <Input
        type="number"
        placeholder="Montant en USDC"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={isPending || isConfirming}
        className="px-3 py-2 w-full bg-gray-800 rounded-md border"
      />
      
      <div className="flex justify-between items-center text-xs text-gray-400">
        <div className="space-y-1">
          <p>Solde USDC: <span className="text-gray-300">{balanceFormatted}</span></p>
          <p>Allowance: <span className="text-gray-300">{allowanceFormatted}</span></p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setAmount(balanceFormatted)}
          disabled={!usdcBalance || isPending || isConfirming}
          className="px-2 h-7 text-xs"
        >
          Max
        </Button>
      </div>

      {/* Bouton Approuver si nécessaire */}
      {amount && needsApproval && (
        <Button
          variant="default"
          size="default"
          onClick={handleApprove}
          disabled={isPending || isConfirming || !amount || !contractAddress || !usdcAddress}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isPending ? "Approbation..." : "1. Approuver USDC"}
        </Button>
      )}

      {/* Bouton Déposer */}
      <Button
        variant="default"
        size="default"
        onClick={handleDeposit}
        disabled={isPending || isConfirming || !amount || needsApproval || !contractAddress}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "En attente..." : isConfirming ? "Confirmation..." : needsApproval ? "2. Déposer (approuver d'abord)" : "Déposer"}
      </Button>
    </div>
  );
}
