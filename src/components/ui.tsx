import type { ReactNode } from "react"

export type IconName = "arrow" | "chart" | "check" | "chevron" | "close" | "eye" | "home" | "invest" | "logout" | "menu" | "refresh" | "settings" | "support" | "user" | "wallet" | "withdraw"

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    chart: <path d="M4 19V9m6 10V5m6 14v-7m5 9H3" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    invest: (
      <path d="M12 22V2m-5 5h7.5a3.5 3.5 0 0 1 0 7H9.5a3.5 3.5 0 0 0 0 7H17" />
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5m5 5H3" />
        <path d="M15 3h6v18h-6" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    refresh: <path d="M20 7v5h-5M4 17v-5h5m9-4a7 7 0 0 0-12-2L4 7m16 10-2 1a7 7 0 0 1-12-2" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09a1.7 1.7 0 0 0-1.1-1.58 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09a1.7 1.7 0 0 0 1.58-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09a1.7 1.7 0 0 0 1.1 1.58 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.38.36.72.65 1 .3.26.67.4 1.06.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
      </>
    ),
    support: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Zm16 0a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Zm0 2v1a4 4 0 0 1-4 4h-2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    wallet: (
      <>
        <path d="M3 6h16a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V6Zm0 0 3-3h11v3" />
        <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" />
      </>
    ),
    withdraw: (
      <>
        <path d="M12 2v14m-5-5 5 5 5-5" />
        <path d="M4 21h16" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  )
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <img
      alt="Acremont"
      className="h-7 w-[174px] object-contain object-left"
      height="96"
      src={light ? "/brand/acremont-full-cream.svg" : "/brand/acremont-full-green.svg"}
      width="600"
    />
  )
}

function LoadingMark({ size = 44 }: { size?: number }) {
  return (
    <span className="loading-mark" style={{ width: size, height: size }} aria-hidden="true">
      <span className="loading-mark-core" />
    </span>
  )
}

export function LoadingIndicator({
  label = "Loading…",
  centered = false,
}: {
  label?: string
  centered?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 text-sm font-medium text-forest ${centered ? "justify-center py-12" : ""}`}
      role="status"
      aria-live="polite"
    >
      <LoadingMark size={32} />
      <span>{label}</span>
    </div>
  )
}

export function LoadingOverlay({
  title = "Please wait",
  description = "Your information is being saved securely.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-panel">
        <LoadingMark size={54} />
        <div>
          <p className="font-display text-xl font-semibold tracking-[-0.03em] text-forest">{title}</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink/55">{description}</p>
        </div>
        <div className="loading-progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  )
}

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
  disabled = false,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "quiet"
  className?: string
  type?: "button" | "submit"
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  )
}
