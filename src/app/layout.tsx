import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CleanAir & Clear Streets",
  description:
    "Report. Predict. Resolve. Verify. — A civic-tech pollution reporting platform with AI-powered hotspot detection and worker routing.",
  keywords: [
    "pollution",
    "civic tech",
    "clean city",
    "garbage reporting",
    "municipal",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="cleanairday">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
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
      <body>
        <Providers>
          <Navbar />
          <main style={{ minHeight: "calc(100vh - 64px)" }}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
