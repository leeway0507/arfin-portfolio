import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "./nav";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Arfin Yoon",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="px-[2rem] relative">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased h-dvh pt-[3rem] sm:pb-0 pb-[3rem]`}
            >
                <Nav />
                {children}
            </body>
        </html>
    );
}
