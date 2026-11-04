import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hajime",
  description: "Hvad der sker af karate i Danmark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#f6ebda]`}
    >
      <body className="min-h-full flex flex-col items-center bg-[#f6ebda] px-1">
        {children}

        <span className="text-3xl text-gray-500 self-center mt-4 font-extralight">af io</span>
        <a
          href="https://github.com/klarstrup/hajime"
          className="text-xs text-red-500 self-center mb-4"
          target="_blank"
          rel="noopener noreferrer"
        >
          se koden
        </a>
      </body>
    </html>
  );
}
