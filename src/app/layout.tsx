import type { Metadata } from "next";
import AuthProvider from "@/components/AuthProvider";
import ToastProvider from "@/components/ToastProvider";
import SplashWrapper from "@/components/SplashWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "מהרשת למדף",
  description: "צוד. שמור. בשל. — שמרו מתכונים מהרשתות החברתיות",
  openGraph: {
    title: "מהרשת למדף",
    description: "צוד. שמור. בשל. — שמרו מתכונים מהרשתות החברתיות",
    type: "website",
    locale: "he_IL",
  },
  icons: {
    icon: "/brand/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased min-h-screen">
        <AuthProvider>
          <SplashWrapper>
            <ToastProvider>{children}</ToastProvider>
          </SplashWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
