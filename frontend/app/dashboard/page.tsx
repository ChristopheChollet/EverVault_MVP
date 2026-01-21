import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="container mx-auto p-8 pt-20 pb-20 max-w-5xl">
        <Dashboard />
      </main>
      <Footer />
    </div>
  );
}


