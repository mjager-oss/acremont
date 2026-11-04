import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how Acremont collects, uses, stores, and shares personal information.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Acremont",
    description: "Learn how Acremont collects, uses, stores, and shares personal information.",
    url: "/privacy",
  },
}

export default function PrivacyPage() {
  return null
}
