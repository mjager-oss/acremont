import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact Acremont",
  description: "Contact the Acremont investor support team for account and investment assistance.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact Acremont", description: "Contact the Acremont investor support team for account and investment assistance.", url: "/contact", images: [{ url: "/acremont-og-share.png", width: 1200, height: 630, alt: "Contact Acremont" }] },
  twitter: { card: "summary_large_image", title: "Contact Acremont", description: "Contact the Acremont investor support team for account and investment assistance.", images: ["/acremont-og-share.png"] },
}

export default function ContactPage() { return null }
