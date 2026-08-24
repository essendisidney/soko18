import { TabBar } from "@/components/nav/tab-bar";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg pb-24">
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-4">{children}</div>
      <TabBar />
    </div>
  );
}
