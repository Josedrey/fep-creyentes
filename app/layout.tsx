import type { Metadata, Viewport } from "next";
import { Modak, Nunito, Fraunces, Bagel_Fat_One } from "next/font/google";
import "./globals.css";

const modak = Modak({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-modak",
  display: "swap",
});

const nunito = Nunito({
  weight: ["300", "400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const fraunces = Fraunces({
  weight: ["300", "400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const bagel = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bagel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Iniciación de Creyentes — FEP 2026",
  description: "Encuentra la identidad sonora de tu grupo en el Festival Estéreo Picnic 2026.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0612",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${modak.variable} ${nunito.variable} ${fraunces.variable} ${bagel.variable}`}
    >
      <body className="min-h-screen antialiased font-body">
        {children}
      </body>
    </html>
  );
}
