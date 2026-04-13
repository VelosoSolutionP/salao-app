import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";
import { PwaInit } from "@/components/shared/PwaInit";
import { InstallBanner } from "@/components/shared/InstallBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Veloso Solution", template: "%s | Veloso Solution" },
  description: "Sistema completo de gestão para salão e barbearia — agenda, equipe, financeiro.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Veloso Solution",
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
          {children}
          <InstallBanner />
        </Providers>
      </body>
    </html>
  );
}
