// frontend/app/page.tsx
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DepositForm from "@/components/DepositForm";
import WithdrawForm from "@/components/WithdrawForm";
import TVLDisplay from "@/components/TVLDisplay";


export default function Home() {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="container mx-auto p-8 pt-20 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="border p-6 rounded-lg bg-gray-800/50">
            <h2 className="text-xl font-semibold mb-4">Déposer</h2>
            <DepositForm contractAddress={contractAddress} />
          </div>
          <div className="border p-6 rounded-lg bg-gray-800/50">
            <h2 className="text-xl font-semibold mb-4">Retirer</h2>
            <WithdrawForm contractAddress={contractAddress} />
            <TVLDisplay contractAddress={contractAddress} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
