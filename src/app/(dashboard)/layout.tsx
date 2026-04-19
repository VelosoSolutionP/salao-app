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

  if (session.user.role === "OWNER") {
    // Resolve salonId even when JWT was created before salon existed
    const salonId = session.user.salonId ?? (
      await prisma.salon.findFirst({
        where: { ownerId: session.user.id },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      })
    )?.id ?? null;

    if (salonId) {
      const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { termoAceito: true },
      });
      if (!salon?.termoAceito) redirect("/termos");
    }
  }

  return <DashboardShell>{children}</DashboardShell>;
}
