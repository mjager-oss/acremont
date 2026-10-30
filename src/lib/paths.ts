export type PublicPage = "home" | "strategies" | "about" | "contact"
export type DashboardPage = "overview" | "invest" | "withdraw" | "support" | "settings" | "review"

export function publicPath(page: PublicPage): string {
  return page === "home" ? "/" : `/${page}`
}

export function dashboardPath(page: DashboardPage): string {
  return `/app/${page}`
}

export function dashboardPageFromPath(pathname: string): DashboardPage {
  const page = pathname.split("/")[2]
  return [
    "overview",
    "invest",
    "withdraw",
    "support",
    "settings",
    "review",
  ].includes(page)
    ? page as DashboardPage
    : "overview"
}
