import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role === "CLIENT") redirect("/agendar");

  if (session.user.role === "OWNER" && session.user.salonId) {
    const salon = await prisma.salon.findUnique({
      where: { id: session.user.salonId },
      select: { termoAceito: true },
    });
    if (!salon?.termoAceito) redirect("/termos");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
