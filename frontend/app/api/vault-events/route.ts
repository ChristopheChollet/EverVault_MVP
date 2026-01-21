import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia, baseSepolia } from "viem/chains";
import { getVaultAddress } from "@/constants/addresses";

function getChain(chainId: number) {
  if (chainId === sepolia.id) return sepolia;
  if (chainId === baseSepolia.id) return baseSepolia;
  return undefined;
}

function getRpcUrl(chainId: number) {
  if (chainId === sepolia.id) {
    return (
      process.env.SEPOLIA_RPC_URL ??
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
      "https://sepolia.infura.io/v3/c2a56aff241e4685a2810ebededbf7a6"
    );
  }
  if (chainId === baseSepolia.id) {
    return process.env.BASE_SEPOLIA_RPC_URL ?? process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
  }
  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const chainId = Number(searchParams.get("chainId") ?? sepolia.id);
  const chain = getChain(chainId);
  const rpcUrl = getRpcUrl(chainId);

  if (!chain || !rpcUrl) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const address = getVaultAddress(chainId);
  if (!address) {
    return NextResponse.json({ error: "Vault address not configured for this chain" }, { status: 400 });
  }

  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  const latest = await client.getBlockNumber();
  const fromBlockParam = searchParams.get("fromBlock");
  const lookbackParam = searchParams.get("lookback");
  const lookback = BigInt(lookbackParam ?? "50000");
  const fromBlock =
    fromBlockParam !== null
      ? BigInt(fromBlockParam)
      : latest > lookback
        ? latest - lookback
        : BigInt(0);

  const toBlockParam = searchParams.get("toBlock");
  const toBlock = toBlockParam !== null ? BigInt(toBlockParam) : latest;

  const depositedEvent = parseAbiItem(
    "event Deposited(address indexed user, uint256 usdcAmount, uint256 shares)"
  );
  const withdrawnEvent = parseAbiItem(
    "event Withdrawn(address indexed user, uint256 shares, uint256 usdcAmount)"
  );

  const [deposits, withdrawals] = await Promise.all([
    client.getLogs({ address, event: depositedEvent, fromBlock, toBlock }),
    client.getLogs({ address, event: withdrawnEvent, fromBlock, toBlock }),
  ]);

  const events = [...deposits, ...withdrawals]
    .map((log) => ({
      chainId,
      address,
      blockNumber: log.blockNumber?.toString(),
      transactionHash: log.transactionHash,
      logIndex: log.logIndex?.toString(),
      eventName: log.eventName,
      args: Object.fromEntries(
        Object.entries(log.args ?? {}).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v])
      ),
    }))
    .sort((a, b) => {
      const bnA = BigInt(a.blockNumber ?? "0");
      const bnB = BigInt(b.blockNumber ?? "0");
      if (bnA !== bnB) return bnA > bnB ? -1 : 1;
      const liA = BigInt(a.logIndex ?? "0");
      const liB = BigInt(b.logIndex ?? "0");
      return liA > liB ? -1 : 1;
    });

  return NextResponse.json({
    chainId,
    vaultAddress: address,
    fromBlock: fromBlock.toString(),
    toBlock: toBlock.toString(),
    count: events.length,
    events,
  });
}


