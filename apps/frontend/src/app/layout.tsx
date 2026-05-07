import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Providers from "@/components/provider";
import { Nav } from "@/components/Navbar";
import { cn } from "@/lib/utils";
import NextTopLoader from "nextjs-toploader";

const geist = Geist({
  weight: "variable",
  subsets: ["latin"],
});

export const metadata = {
  title: "TradeX",
  description: "Trading System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          "min-h-screen max-w-7xl border mx-auto bg-background text-foreground",
          geist.className,
        )}
      >
        <NextTopLoader />
        <Providers>
          <Nav />
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
