// frontend/components/Header.tsx
"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-800">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">GreenVault</h1>
        <nav className="text-sm text-gray-300 flex gap-3">
          <Link href="/" className="hover:text-white">
            Vault
          </Link>
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
        </nav>
      </div>
      <ConnectButton />
    </header>
  );
}
