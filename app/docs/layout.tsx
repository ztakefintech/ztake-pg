export const metadata = { title: 'ZTake API Docs', description: 'ZTake Payment Gateway API Documentation' };
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
