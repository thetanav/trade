import Chart from "@/components/Chart";
import MakeOrder from "@/components/MakeOrder";
import Depth from "@/components/Depth";

export default function TradePage() {
  return (
    <div className="px-2 py-6">
      <div className="flex gap-2">
        <div className="flex-1">
          <Chart />
        </div>
        <div className="w-96 flex flex-col gap-2 h-full">
          <MakeOrder />
          <Depth />
        </div>
      </div>
    </div>
  );
}
