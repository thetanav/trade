import Transactions from "@/components/Transactions";

export default function TransactionsPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Transactions</h1>
      <Transactions />
    </div>
  );
}