import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SalonSelector } from "@/components/master/SalonSelector";

export const metadata: Metadata = { title: "Selecionar Salão — MSB Master" };

export default async function SelecionarSalaoPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "MASTER") redirect("/dashboard");

  return <SalonSelector />;
}
