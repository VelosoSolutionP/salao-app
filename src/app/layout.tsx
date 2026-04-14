import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";
import { PwaInit } from "@/components/shared/PwaInit";
import { InstallBanner } from "@/components/shared/InstallBanner";
import { NotificationInit } from "@/components/shared/NotificationInit";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "TOQE", template: "%s | TOQE" },
  description: "TOQE — gestão precisa para salões e barbearias. Agenda, equipe, estoque e financeiro num só lugar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TOQE",
    startupImage: "/icon-512.png",
  },
  icons: {
    apple: "/icon-192.png",
    icon: "/icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} h-full antialiased`}>
        <Providers>
          <PwaInit />
          <NotificationInit />
          {children}
          <InstallBanner />
        </Providers>
      </body>
    </html>
  );
}
