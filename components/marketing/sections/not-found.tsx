import { GlassCard } from "@/components/marketing/GlassCard";
import { PillButton } from "@/components/marketing/PillButton";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <GlassCard className="p-12 text-center" glow>
          <div className="text-8xl font-bold bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent mb-4">
            404
          </div>
          <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
          <p className="text-xl text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PillButton variant="default" size="lg" href="/" testId="notfound-home">
              <Home className="w-5 h-5 mr-2" />
              Go Home
            </PillButton>
            <PillButton variant="outline" size="lg" onClick={() => window.history.back()} testId="notfound-back">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </PillButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
