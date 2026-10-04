import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CivicPulse — Environmental Civic Intelligence",
  description:
    "Report. Track. Improve. — A citizen-powered environmental pollution reporting and response platform.",
  keywords: [
    "CivicPulse",
    "pollution reporting",
    "civic tech",
    "environmental monitoring",
    "air quality",
    "waste management",
    "municipal response",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="cleanairday" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'cleanairday';
                  var lang = localStorage.getItem('language') || 'en';
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.setAttribute('data-lang', lang);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        <Providers>
          <Navbar />
          <main style={{ minHeight: "calc(100vh - 64px)", position: "relative", zIndex: 1 }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
