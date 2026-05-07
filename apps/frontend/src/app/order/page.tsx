import Orders from "@/components/Orders";
import Depth from "@/components/Depth";

export default function OrderPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <div className="flex gap-4">
        <Orders />
        <Depth />
      </div>
    </div>
  );
}