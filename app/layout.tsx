import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "../components/nav/nav";
import localFont from "next/font/local";

// Font files can be colocated inside of `app`
const marionNormal = localFont({ src: "./fonts/marion-normal.ttf", display: "swap", variable: "--font-normal" });

// const arimo = Arimo({
//     subsets: ["latin"],
//     display: "swap",
// });

export const metadata: Metadata = {
    title: "Arfin Yoon",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="px-[0.5rem] sm:px-[2rem] relative ">
            <body className={`${marionNormal.className} antialiased flex sm:pb-0`}>
                <Nav />
                <div className="min-h-dvh w-full">{children}</div>
            </body>
        </html>
    );
}
