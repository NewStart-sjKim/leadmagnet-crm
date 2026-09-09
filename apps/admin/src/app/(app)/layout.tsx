import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  return (
    <div className="flex min-h-screen">
      <Sidebar operator={operator} />
      <main className="min-w-0 flex-1 p-6 lg:p-10">{children}</main>
    </div>
  );
}
