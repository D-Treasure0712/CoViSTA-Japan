import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoViSTA-Japan",
  description: "COVID-19 Visualization Tool for Japan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
