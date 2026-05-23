'use client';
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/marketing/Navbar";
import dynamic from "next/dynamic";

// Dynamic imports — Home is 56KB, Footer loads below fold
const Home = dynamic(() => import("@/components/marketing/sections/Home"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 animate-pulse">
        <div className="h-12 w-96 mx-auto rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-6 w-64 mx-auto rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  ),
});
const Footer = dynamic(
  () => import("@/components/marketing/Footer").then(mod => ({ default: mod.Footer })),
  { ssr: false }
);

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Home />
          </main>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
