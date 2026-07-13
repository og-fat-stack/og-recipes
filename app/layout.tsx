import type { Metadata } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "../components/NavBar";
import { getSessionUserId } from "../lib/auth";
import { db } from "../lib/db";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OG Recipes",
  description: "Persönliche Koch- und Abnehm-App",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await getSessionUserId();
  const user = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
    : null;

  return (
    <html
      lang="de"
      className={`${figtree.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-page text-ink">
        <NavBar userName={user?.name ?? null} />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-28 md:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
