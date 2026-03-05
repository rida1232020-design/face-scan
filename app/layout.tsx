import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediPi Health – AI Face Scan",
  description: "تطبيق صحي ذكي مدمج مع Pi Network – فحص الوجه، العمر البيولوجي، وتحليل الصحة بالذكاء الاصطناعي",
  generator: "v0.app",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#7C3AED" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
        {/* Pi Network SDK – required for Pi Browser payments and auth */}
        <script src="https://sdk.minepi.com/pi-sdk.js" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
