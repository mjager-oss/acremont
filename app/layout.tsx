import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import localFont from "next/font/local"
import AppClient from "../src/app-client"
import "./globals.css"

const sans = localFont({ src: "../node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2", variable: "--font-ibm", display: "swap", weight: "100 700" })
const display = localFont({ src: "../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2", variable: "--font-space", display: "swap", weight: "300 700" })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://acremontfinance.online"
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Acremont",
  url: siteUrl,
  logo: `${siteUrl}/brand/acremont-full-green.svg`,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Acremont",
  title: {
    default: "Acremont | Private Investment Management",
    template: "%s | Acremont",
  },
  description: "Explore professionally managed investment strategies and securely manage your Acremont investor account.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Acremont",
    title: "Acremont | Private Investment Management",
    description: "Explore professionally managed investment strategies and securely manage your Acremont investor account.",
    url: siteUrl,
    images: [{ url: "/acremont-og-share.png", width: 1200, height: 630, alt: "Acremont private investment management" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acremont | Private Investment Management",
    description: "Explore professionally managed investment strategies and securely manage your Acremont investor account.",
    images: ["/acremont-og-share.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
}

export const viewport: Viewport = {
  themeColor: "#183C32",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <AppClient />
      </body>
    </html>
  )
}
