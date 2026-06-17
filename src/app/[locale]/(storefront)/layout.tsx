import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <StoreHeader />
      <div className="flex-1">{children}</div>
      <StoreFooter />
    </div>
  );
}
