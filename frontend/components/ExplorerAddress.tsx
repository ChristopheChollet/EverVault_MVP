"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

function addressUrl(chainId: number, address: `0x${string}`) {
  if (chainId === 11155111) return `https://sepolia.etherscan.io/address/${address}`;
  if (chainId === 84532) return `https://sepolia.basescan.org/address/${address}`;
  return undefined;
}

function shortAddr(a: `0x${string}`) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function ExplorerAddress({
  chainId,
  address,
  className,
}: {
  chainId: number;
  address: `0x${string}`;
  className?: string;
}) {
  const href = addressUrl(chainId, address);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Adresse copiée");
    } catch {
      toast.error("Impossible de copier l’adresse");
    }
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      {href ? (
        <a className="text-blue-400 hover:underline" href={href} target="_blank" rel="noreferrer">
          {shortAddr(address)}
        </a>
      ) : (
        <span className="text-gray-200">{shortAddr(address)}</span>
      )}
      <button
        type="button"
        onClick={copy}
        className="p-1 rounded hover:bg-gray-800"
        aria-label="Copier l’adresse"
        title="Copier"
      >
        <Copy className="w-4 h-4 text-gray-400" />
      </button>
    </span>
  );
}

