import { StoreHeader } from "@/components/store/header";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <StoreHeader />
      {children}
    </div>
  );
}
