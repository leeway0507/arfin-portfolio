import type { Metadata } from "next";
import { Arimo } from "next/font/google";
import "./globals.css";
import { Nav } from "../components/nav/nav";

// Font files can be colocated inside of `app`
const arimo = Arimo({
    display: "swap",
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
            <body className={`${arimo.className} antialiased h-dvh pt-[3rem] sm:pb-0 pb-[3rem]`}>
                <Nav />
                {children}
            </body>
        </html>
    );
}
