import type { MetadataRoute } from "next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://acremontfinance.online"

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/strategies`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contact`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ]
}
