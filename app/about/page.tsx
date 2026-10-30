import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Acremont",
  description: "Learn about Acremont’s approach to private investment management and investor service.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About Acremont", description: "Learn about Acremont’s approach to private investment management and investor service.", url: "/about", images: [{ url: "/acremont-og-share.png", width: 1200, height: 630, alt: "About Acremont" }] },
  twitter: { card: "summary_large_image", title: "About Acremont", description: "Learn about Acremont’s approach to private investment management and investor service.", images: ["/acremont-og-share.png"] },
}

export default function AboutPage() { return null }
