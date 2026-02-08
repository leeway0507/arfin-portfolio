import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Nav } from '../components/nav/nav'
import { Toaster } from 'sonner'

const marionNormal = localFont({
    src: './fonts/marion-normal.ttf',
    variable: '--font-marion',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'Arfin Yoon',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="ko" className={`${marionNormal.variable} px-[0.5rem] sm:px-[2rem] relative`} suppressHydrationWarning>
            <body className="font-sans antialiased flex sm:pb-0">
                <Nav />
                <div className="min-h-dvh w-full">{children}</div>
                <Toaster richColors position="bottom-center" />
            </body>
        </html>
    )
}
