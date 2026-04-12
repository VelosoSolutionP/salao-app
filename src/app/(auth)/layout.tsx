import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user) {
    if (session.user.role === "CLIENT") redirect("/agendar");
    redirect("/dashboard");
  }
  return <>{children}</>;
}
