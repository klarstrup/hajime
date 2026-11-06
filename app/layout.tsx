import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const radianceSemibold = localFont({
  display: "block",
  src: [
    {
      path: "../fonts/radiance.ttf",
      style: "normal",
      weight: "400",
    },
    {
      path: "../fonts/radiance-semibold.ttf",
      style: "normal",
      weight: "600",
    },
    {
      path: "../fonts/radiance-bold.ttf",
      style: "normal",
      weight: "700",
    },
  ],
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
      className={`${radianceSemibold.className} h-full antialiased bg-[#f6ebda]`}
    >
      <body className="min-h-full flex flex-col items-center bg-[#f6ebda] px-1">
        {children}

        <span className="text-3xl text-gray-500 self-center mt-4 font-extralight">
          af io
        </span>
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
