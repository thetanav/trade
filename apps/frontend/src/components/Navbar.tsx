import Link from "next/link";
import { TrendingUp } from "lucide-react";
import Auth from "./Auth";

export const Nav = () => {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TradeX</span>
          </Link>
        </div>
        <Auth /> 
      </div>
    </nav>
  );
};
