import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import MainLayoutWrapper from "@/components/MainLayoutWrapper";
import { SettingsProvider } from "@/contexts/SettingsContext";

export const metadata: Metadata = {
  title: "Smart Event Registration • SCAN • CHECK-IN • SHOW",
  description: "Next-Gen Event Access & Real-Time Signage Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <body className="bg-cyber-mesh min-h-screen text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <SettingsProvider>
          <Navigation />
          <MainLayoutWrapper>
            {children}
          </MainLayoutWrapper>
        </SettingsProvider>
      </body>
    </html>
  );
}
