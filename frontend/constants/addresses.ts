import { getAddress } from "viem";

type Address = `0x${string}`;

function safeGetAddress(value: string | undefined): Address | undefined {
  if (!value) return undefined;
  try {
    return getAddress(value) as Address;
  } catch {
    return undefined;
  }
}

/**
 * Returns the deployed GreenVault contract address for a given chain.
 * Configure via env:
 * - NEXT_PUBLIC_VAULT_ADDRESS_SEPOLIA
 * - NEXT_PUBLIC_VAULT_ADDRESS_BASE_SEPOLIA
 */
export function getVaultAddress(chainId?: number): Address | undefined {
  if (!chainId) return undefined;

  // Sepolia
  if (chainId === 11155111) {
    return (
      safeGetAddress(process.env.NEXT_PUBLIC_VAULT_ADDRESS_SEPOLIA) ??
      // Backward compat with the original repo env var
      safeGetAddress(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS)
    );
  }

  // Base Sepolia
  if (chainId === 84532) {
    return safeGetAddress(process.env.NEXT_PUBLIC_VAULT_ADDRESS_BASE_SEPOLIA);
  }

  return undefined;
}


