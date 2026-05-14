import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { LanguageProvider } from "@/components/i18n/language-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VocabVault",
  description: "Learn English vocabulary by your own topics."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
