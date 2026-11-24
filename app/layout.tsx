import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "./_component/Header";
import Footer from "./_component/Footer";
import "./globals.css";


const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NutriGo",
  description: "Fuel a healthier you",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "#1F8A4C", fontFamily: "var(--font-jakarta)", borderRadius: "0.75rem" },
      }}
    >
      <html
        lang="en"
        className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-[#FAFAF8] text-[#101814]">
          {/* Header reads the current URL, so it streams in (keeps the same height meanwhile) */}
          <Suspense fallback={<div className="h-16 border-b border-black/5" />}>
            <Header />
          </Suspense>
          {children}
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
