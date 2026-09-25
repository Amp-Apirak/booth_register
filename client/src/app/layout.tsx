import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Navigation from "@/components/Navigation";
import MainLayoutWrapper from "@/components/MainLayoutWrapper";
import SiteFooter from "@/components/SiteFooter";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { SiteBackdropProvider } from "@/components/SiteBackdrop";
import { DEFAULT_LANG, DEFAULT_THEME, LANG_COOKIE, THEME_COOKIE, isLang, isTheme } from "@/i18n";

export const metadata: Metadata = {
  title: "Smart Event Registration • SCAN • CHECK-IN • SHOW",
  description: "Next-Gen Event Access & Real-Time Signage Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Language/theme come from cookies so the server renders the right text and colors on first paint
  const cookieStore = await cookies();
  const langCookie = cookieStore.get(LANG_COOKIE)?.value;
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const lang = isLang(langCookie) ? langCookie : DEFAULT_LANG;
  const theme = isTheme(themeCookie) ? themeCookie : DEFAULT_THEME;

  return (
    <html lang={lang} data-theme={theme} className={theme === "dark" ? "dark" : undefined} style={{ colorScheme: theme }}>
      <body className="bg-cyber-mesh min-h-screen flex flex-col text-slate-100 antialiased selection:bg-indigo-500 selection:text-on-accent">
        <PreferencesProvider initialLang={lang} initialTheme={theme}>
          <SettingsProvider>
            <SiteBackdropProvider>
              <Navigation />
              <MainLayoutWrapper>
                {children}
              </MainLayoutWrapper>
              <SiteFooter />
            </SiteBackdropProvider>
          </SettingsProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
