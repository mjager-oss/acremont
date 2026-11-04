import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Legal Notices",
  description: "Acremont company, subsidiary, and investment risk notices.",
  alternates: { canonical: "/notices" },
  openGraph: {
    title: "Legal Notices | Acremont",
    description: "Acremont company, subsidiary, and investment risk notices.",
    url: "/notices",
  },
}

export default function NoticesPage() {
  return null
}
