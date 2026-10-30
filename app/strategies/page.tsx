import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Investment Strategies",
  description: "Explore Acremont investment strategies, plan terms, and portfolio options.",
  alternates: { canonical: "/strategies" },
  openGraph: {
    title: "Investment Strategies | Acremont",
    description: "Explore Acremont investment strategies, plan terms, and portfolio options.",
    url: "/strategies",
    images: [{ url: "/acremont-og-share.png", width: 1200, height: 630, alt: "Acremont investment strategies" }],
  },
  twitter: { card: "summary_large_image", title: "Investment Strategies | Acremont", description: "Explore Acremont investment strategies, plan terms, and portfolio options.", images: ["/acremont-og-share.png"] },
}

export default function StrategiesPage() { return null }
