"use client"

import {
  createContext,
  FormEvent,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js"

import type { User } from "@supabase/supabase-js"

import { supabase, supabaseConfigured } from "./lib/supabase-browser"

import { QRCodeSVG } from "qrcode.react"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { dashboardPageFromPath, dashboardPath, publicPath } from "./lib/paths"

import {
  Brand,
  Button,
  Icon,
  LoadingIndicator,
  LoadingOverlay,
} from "./components/ui"

import type { PublicPage } from "./lib/paths"

import type { DashboardPage } from "./lib/paths"

type Region = "uk" | "us"

type InvestmentPlan = {
  id: string

  slug: string

  name: string

  annual_rate_percent: number

  term_months: number

  minimum_amount: number

  currency: string

  enabled: boolean

  description?: string | null

  features?: string[] | null
}

type CryptoWallet = {
  id: string

  asset: "BTC" | "ETH" | "USDT" | "SOL" | "XRP"

  network: string

  address: string

  quote_usd_per_unit: number

  enabled: boolean
}

type TransactionRequest = {
  id: string

  user_id: string

  kind: "investment" | "withdrawal"

  amount: number

  currency: string

  status: "pending_payment" | "pending_review" | "approved" | "rejected" | "paid" | "expired" | "cancelled"

  payment_asset: string | null

  payment_network: string | null

  payment_quote_amount: number | null

  payment_quote_expires_at: string | null

  payment_tx_hash: string | null

  payment_method?: "crypto" | "bank" | null

  payment_reference?: string | null

  bank_payment_account_id?: string | null

  plan: { name: string } | null

  created_at: string

  profile?: { full_name: string; email: string } | null
}

type BankPaymentAccount = {
  id: string
  bank_name: string
  account_name: string
  account_number: string
  bank_country: string
  currency: string
  routing_number: string | null
  swift_code: string | null
  enabled: boolean
}

type PositionAccrual = {
  id: string

  principal: number

  accrued_gain: number

  currency: string

  annual_rate_percent: number

  term_months: number

  starts_at: string
}

type OfficerAccrualPosition = PositionAccrual & {
  user_id: string
  plan_id: string
  plan: { name: string } | null
}

type AccrualAdjustment = {
  id: string
  position_id: string
  previous_amount: number
  target_amount: number
  adjustment_amount: number
  reason: string
  officer_id: string
  created_at: string
}

type PayoutMethod = {
  id: string

  kind: "bank" | "crypto"

  label: string

  details: Record<string, string>

  status: "pending_verification" | "verified" | "rejected"

  is_default: boolean
}

function displayRequestPlan(request: TransactionRequest): string {
  return request.plan?.name ?? ""
}

const supportedCryptoNetworks: Record<string, string[]> = {
  BTC: ["Bitcoin"],

  ETH: ["Ethereum (ERC-20)"],

  USDT: ["Ethereum (ERC-20)", "Tron (TRC-20)", "Solana"],

  SOL: ["Solana"],

  XRP: ["XRP Ledger"],
}

const countryDisplayNames =
  typeof Intl.DisplayNames !== "undefined"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : undefined

const phoneCountryOptions = getCountries()

  .map((country) => ({
    country,

    label: countryDisplayNames?.of(country) ?? country,

    callingCode: getCountryCallingCode(country),
  }))

  .sort((first, second) => first.label.localeCompare(second.label))

const RegionContext = createContext<Region>("uk")

const companyDetails = {
  uk: {
    label: "United Kingdom office",

    phone: "+44 20 7946 0821",

    telephone: "+442079460821",

    address: ["18 St James’s Place", "London SW1A 1NH", "United Kingdom"],

    hours: "Monday–Friday, 8am–6pm",
  },

  us: {
    label: "United States office",

    phone: "+1 (765) 216-5458",

    telephone: "+17652165458",

    address: ["120 Park Ave", "New York, NY 10117", "United States"],

    hours: "Monday–Friday, 8am–6pm ET",
  },
}

function getDefaultRegion(): Region {
  if (typeof window === "undefined") return "uk"

  try {
    const browserRegion = new Intl.Locale(navigator.language).region

    if (browserRegion === "US") return "us"

    if (browserRegion === "GB" || browserRegion === "UK") return "uk"

    return Intl.DateTimeFormat().resolvedOptions().timeZone ===
      "America/New_York"
      ? "us"
      : "uk"
  } catch {
    return navigator.language.toLowerCase().endsWith("-us") ? "us" : "uk"
  }
}

function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegion] = useState<Region>("uk")

  useEffect(() => {
    setRegion(getDefaultRegion())
  }, [])

  return (
    <RegionContext.Provider value={region}>{children}</RegionContext.Provider>
  )
}

import type { IconName } from "./components/ui"

function getUserPlan(user: User): string {
  const plan = user.user_metadata?.selected_plan

  return typeof plan === "string" ? plan : ""
}

const strategyStories = [
  {
    name: "Capital Preservation",

    number: "01",

    summary:
      "High-quality income assets selected to protect capital and provide dependable distributions.",

    allocation: "Global fixed income · Real assets",

    image:
      "https://images.unsplash.com/photo-1644953417898-6ca5133bf160?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1600",

    media: "Photography",
  },

  {
    name: "Responsible Growth",

    number: "02",

    summary:
      "Long-term ownership in businesses positioned to benefit from durable economic and environmental change.",

    allocation: "Public equity · Private markets",

    image:
      "https://images.unsplash.com/photo-1565599573128-ae3ef5c9f478?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1600",

    media: "Investment film · 02:18",
  },

  {
    name: "Strategic Opportunities",

    number: "03",

    summary:
      "Selective investments where complexity, dislocation, or patient capital create an attractive entry point.",

    allocation: "Special situations · Alternatives",

    image:
      "https://images.unsplash.com/photo-1652893365217-d3b541b04baf?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1600",

    media: "Field perspective",
  },
]

const testimonials: {
  audience: "personal" | "business"
  quote: string
  name: string
  role: string
}[] = [
  {
    audience: "personal",
    quote:
      "The clarity is what stands out. I always know where my capital is, why it is invested, and what happens next.",
    name: "Elena Marlow",
    role: "Investor since 2021",
  },
  {
    audience: "personal",
    quote:
      "Acremont gives us the discipline of an institution without losing the direct, personal relationship.",
    name: "David Chen",
    role: "Private client",
  },
  {
    audience: "business",
    quote:
      "A clear view of our allocation and regular reporting make it easier to keep our investment decisions aligned.",
    name: "Illustrative business investor",
    role: "Sample perspective",
  },
  {
    audience: "business",
    quote:
      "Having a consistent point of contact helps our team understand the process and plan around our time horizon.",
    name: "Illustrative business investor",
    role: "Sample perspective",
  },
]

const team: { name: string; role: string; image: string }[] = []

function PublicHeader({
  onLogin,

  onNavigate,

  onOpenAccount,
}: {
  onLogin: () => void

  onNavigate: (page: PublicPage) => void

  onOpenAccount: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[#f3f0e7]/95 backdrop-blur-sm">
      <div className="site-shell flex h-[76px] items-center justify-between">
        <button onClick={() => onNavigate("home")} aria-label="Acremont home">
          <Brand />
        </button>
        <nav className="hidden items-center gap-8 text-sm text-ink/65 md:flex">
          <button
            className="transition-colors hover:text-forest"
            onClick={() => onNavigate("home")}
          >
            Home
          </button>
          <button
            className="transition-colors hover:text-forest"
            onClick={() => onNavigate("strategies")}
          >
            Strategies
          </button>
          <button
            className="transition-colors hover:text-forest"
            onClick={() => onNavigate("about")}
          >
            About
          </button>
          <button
            className="transition-colors hover:text-forest"
            onClick={() => onNavigate("contact")}
          >
            Contact
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <details className="relative md:hidden">
            <summary
              className="icon-button list-none"
              aria-label="Public navigation"
            >
              <Icon name="menu" size={18} />
            </summary>
            <nav className="absolute right-0 top-12 flex w-44 flex-col rounded-xl border border-line bg-white p-2 text-left text-sm shadow-lg">
              {(["home", "strategies", "about", "contact"] as PublicPage[]).map(
                (page) => (
                  <button
                    className="rounded-lg px-3 py-2.5 text-left capitalize hover:bg-[#edf1ec]"
                    key={page}
                    onClick={() => onNavigate(page)}
                  >
                    {page}
                  </button>
                ),
              )}
            </nav>
          </details>
          <Button
            className="hidden sm:inline-flex"
            onClick={onLogin}
            variant="quiet"
          >
            Sign in
          </Button>
          <Button onClick={onOpenAccount}>
            Open an account <Icon name="arrow" size={16} />
          </Button>
        </div>
      </div>
    </header>
  )
}

function PublicFooter({
  onNavigate,
}: {
  onNavigate: (page: PublicPage) => void
}) {
  const region = useContext(RegionContext)

  const office = companyDetails[region]

  return (
    <footer className="bg-forest py-12 text-white">
      <div className="site-shell flex flex-col gap-9">
        <div className="grid gap-10 border-b border-white/12 pb-10 md:grid-cols-[1fr_auto_auto]">
          <Brand light />
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-xs text-white/55 md:max-w-72">
            <button onClick={() => onNavigate("strategies")}>Strategies</button>
            <button onClick={() => onNavigate("about")}>About</button>
            <button onClick={() => onNavigate("contact")}>Contact</button>
            <a href="mailto:support@acremontfinance.online">Support</a>
          </div>
          <address className="text-xs not-italic leading-6 text-white/50">
            <a className="block text-white/75" href={`tel:${office.telephone}`}>
              {office.phone}
            </a>
            {office.address.map((line) => (
              <span className="block" key={line}>
                {line}
              </span>
            ))}
          </address>
        </div>
        <div className="flex flex-col justify-between gap-3 text-[10px] leading-5 text-white/35 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Acremont Investments. All rights
            reserved.
          </p>
          <p>Investing involves risk. Returns are not guaranteed.</p>
        </div>
      </div>
    </footer>
  )
}

function TeamSection({
  compact = false,

  onNavigate,
}: {
  compact?: boolean

  onNavigate: (page: PublicPage) => void
}) {
  if (team.length === 0) return null

  return (
    <section className="bg-[#f3f0e7] py-20 lg:py-28" data-reveal>
      <div className="site-shell">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="section-label">Meet the team</p>
            <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] text-forest sm:text-5xl">
              Experience, made accessible.
            </h2>
          </div>
          {compact && (
            <button
              className="flex items-center gap-2 text-xs font-semibold text-forest"
              onClick={() => onNavigate("about")}
            >
              Meet our wider team <Icon name="arrow" size={16} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {team.map((person) => (
            <article key={person.name}>
              <div className="aspect-[4/5] overflow-hidden bg-[#e7e9e4]">
                <img
                  alt={person.name}
                  className="h-full w-full object-cover object-top grayscale-[15%] transition-transform duration-700 hover:scale-[1.025]"
                  src={person.image}
                />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-forest">
                {person.name}
              </h3>
              <p className="mt-1 text-xs text-ink/45">{person.role}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PublicHome({
  onLogin,

  onPlan,

  onNavigate,

  onOpenAccount,
}: {
  onLogin: () => void

  onPlan: (plan: string) => void

  onNavigate: (page: PublicPage) => void

  onOpenAccount: () => void
}) {
  const [activeStrategy, setActiveStrategy] = useState(0)

  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const [testimonialAudience, setTestimonialAudience] = useState<"personal" | "business">("personal")

  const [publicPlans, setPublicPlans] = useState<InvestmentPlan[]>([])

  const strategy = strategyStories[activeStrategy]

  const visibleTestimonials = testimonials.filter((item) => item.audience === testimonialAudience)

  const testimonial = visibleTestimonials[activeTestimonial] ?? visibleTestimonials[0]

  useEffect(() => {
    if (!supabase) return

    void supabase

      .from("investment_plans")

      .select(
        "id,slug,name,annual_rate_percent,term_months,minimum_amount,currency,enabled,description,features",
      )

      .eq("enabled", true)

      .order("minimum_amount")

      .then(({ data }) => setPublicPlans((data ?? []) as InvestmentPlan[]))
  }, [])

  return (
    <div className="min-h-screen bg-[#f3f0e7] text-ink">
      <PublicHeader
        onLogin={onLogin}
        onNavigate={onNavigate}
        onOpenAccount={onOpenAccount}
      />

      <main>
        <section className="relative isolate overflow-hidden bg-forest text-white">
          <img
            alt="Acremont team collaborating in a modern office"
            className="absolute inset-0 z-0 h-full w-full object-cover object-center"
            src="https://images.unsplash.com/photo-1758518726609-c551f858cd5c?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1800"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-forest/95 via-forest/85 to-forest/55 md:bg-gradient-to-r md:from-forest md:via-forest/90 md:to-forest/20" />
          <div className="site-shell relative z-20 flex min-h-[560px] items-center py-12 sm:min-h-[580px] lg:min-h-[640px]">
            <div className="max-w-2xl">
              <h1 className="max-w-[720px] font-display text-[clamp(3.25rem,6.4vw,6.4rem)] font-medium leading-[0.95] tracking-[-0.065em] text-white">
                Put your money to work, simply.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">
                Choose a professionally managed plan, track your performance,
                and stay in control from one straightforward account.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="min-h-12 px-6"
                  onClick={() =>
                    document.getElementById("plans")?.scrollIntoView()
                  }
                  variant="secondary"
                >
                  View investment plans <Icon name="arrow" size={17} />
                </Button>
                <Button
                  className="min-h-12 border border-white/40 bg-white/10 px-6 text-white hover:bg-white/20 hover:text-white"
                  onClick={onLogin}
                  variant="quiet"
                >
                  Go to dashboard
                </Button>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/75">
                <span className="flex items-center gap-2">
                  <Icon name="check" size={15} /> Clear, fixed terms
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="check" size={15} /> No hidden fees
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="check" size={15} /> Dedicated support
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          className="site-shell py-8 lg:py-10"
          aria-label="Portfolio reporting"
        >
          <div className="flex flex-col justify-between gap-5 bg-forest p-6 text-white shadow-[0_20px_60px_-40px_rgba(24,60,50,0.4)] sm:flex-row sm:items-end sm:p-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">
                Portfolio reporting
              </p>
              <p className="mt-2 font-display text-2xl tracking-[-0.045em]">
                Clear view of your investments.
              </p>
            </div>
            <p className="max-w-md text-xs leading-5 text-white/60">
              Verified positions and accrued gains appear in your secure
              investor dashboard after officer approval.
            </p>
          </div>
        </section>

        <section
          className="border-y border-line bg-white py-20 lg:py-24"
          id="plans"
        >
          <div className="site-shell">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="section-label">Investment plans</p>
                <h2 className="mt-4 font-display text-4xl font-medium tracking-[-0.045em] text-forest sm:text-5xl">
                  Choose what fits your goals.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-ink/55">
                Simple terms, transparent target returns, and no complicated fee
                structure.
              </p>
            </div>

            {publicPlans.length === 0 ? (
              <p className="mt-10 border border-line bg-[#f3f0e7] p-5 text-sm leading-6 text-ink/55">
                Investment plans will appear here once they have been configured
                and approved.
              </p>
            ) : (
              <div className="mt-12 grid gap-5 lg:grid-cols-3">
                {publicPlans.map((plan) => (
                  <article className="plan-card" key={plan.id}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{plan.name}</p>
                        {plan.description && (
                          <p className="mt-2 text-sm text-ink/50">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-9">
                      <span className="font-display text-5xl font-medium tracking-[-0.06em]">
                        {plan.annual_rate_percent}%
                      </span>
                      <span className="ml-2 text-xs text-ink/45">
                        target p.a.
                      </span>
                    </div>
                    <div className="mt-8 grid grid-cols-2 border-y border-line py-4">
                      <div>
                        <p className="plan-meta">Minimum</p>
                        <p className="mt-1 text-sm font-semibold">
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: plan.currency,
                          }).format(plan.minimum_amount)}
                        </p>
                      </div>
                      <div className="border-l border-line pl-5">
                        <p className="plan-meta">Term</p>
                        <p className="mt-1 text-sm font-semibold">
                          {plan.term_months} months
                        </p>
                      </div>
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="mt-7 space-y-3">
                        {plan.features.map((feature) => (
                          <li
                            className="flex items-center gap-2.5 text-sm text-ink/62"
                            key={feature}
                          >
                            <Icon name="check" size={16} /> {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      className="mt-8 w-full justify-between"
                      onClick={() => onPlan(plan.slug)}
                    >
                      Select {plan.name} <Icon name="arrow" size={16} />
                    </Button>
                  </article>
                ))}
              </div>
            )}
            <p className="mt-6 text-center text-[11px] leading-5 text-ink/40">
              Target returns are not guaranteed. Your capital is at risk and
              investment values can fall as well as rise.
            </p>
          </div>
        </section>

        <section className="site-shell py-20 lg:py-28" id="how-it-works">
          <div className="grid gap-14 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="section-label">How it works</p>
              <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] text-forest sm:text-5xl">
                Invest without the guesswork.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-ink/55">
                From opening an account to tracking returns, every step is
                designed to feel clear and manageable.
              </p>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {[
                [
                  "01",

                  "Create your account",

                  "Set up your profile and verify your details in a few minutes.",
                ],

                [
                  "02",

                  "Choose a plan",

                  "Compare target returns, terms, and minimum investments.",
                ],

                [
                  "03",

                  "Track your progress",

                  "See performance, request withdrawals, and get help anytime.",
                ],
              ].map(([number, title, copy]) => (
                <div
                  className="grid gap-3 py-7 sm:grid-cols-[56px_1fr_1.2fr] sm:items-center"
                  key={number}
                >
                  <span className="text-xs font-semibold text-forest/35">
                    {number}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-forest">
                    {title}
                  </h3>
                  <p className="text-sm leading-6 text-ink/52">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden bg-forest py-20 text-white lg:py-28">
          <div className="site-shell">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Our investment strategies
                </p>
                <h2 className="mt-4 max-w-2xl font-display text-4xl tracking-[-0.045em] sm:text-5xl">
                  A clear role for every investment.
                </h2>
              </div>
              <button
                className="flex items-center gap-2 text-xs font-semibold text-[#b9d8c1]"
                onClick={() => onNavigate("strategies")}
              >
                Explore all strategies <Icon name="arrow" size={16} />
              </button>
            </div>

            <div className="grid overflow-hidden rounded-2xl border border-white/12 lg:grid-cols-[1.35fr_.65fr]">
              <div className="relative min-h-[430px] overflow-hidden lg:min-h-[560px]">
                <img
                  alt={`${strategy.name} investment strategy`}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                  key={strategy.image}
                  src={strategy.image}
                />
                <div className="absolute inset-0 bg-forest/25" />
                <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] backdrop-blur-sm">
                  {strategy.media.includes("film") && (
                    <span className="h-0 w-0 border-y-[4px] border-l-[7px] border-y-transparent border-l-white" />
                  )}
                  {strategy.media}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-black/35 p-6 backdrop-blur-[2px] sm:p-8">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">
                    {strategy.allocation}
                  </p>
                  <h3 className="mt-2 font-display text-3xl tracking-[-0.04em] sm:text-4xl">
                    {strategy.name}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                    {strategy.summary}
                  </p>
                </div>
              </div>
              <div className="flex flex-col divide-y divide-white/12">
                {strategyStories.map((item, index) => (
                  <button
                    className={`group flex flex-1 items-center gap-5 p-6 text-left transition-colors ${
                      activeStrategy === index
                        ? "bg-white text-forest"
                        : "text-white hover:bg-white/[0.06]"
                    }`}
                    key={item.name}
                    onClick={() => setActiveStrategy(index)}
                  >
                    <span
                      className={`text-[10px] font-semibold ${
                        activeStrategy === index
                          ? "text-forest/40"
                          : "text-white/35"
                      }`}
                    >
                      {item.number}
                    </span>
                    <span className="font-display text-lg font-medium tracking-[-0.025em]">
                      {item.name}
                    </span>
                    <span className="ml-auto opacity-50">
                      <Icon name="chevron" size={15} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 lg:py-20">
            <div className="site-shell">
              <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div className="max-w-xl">
                  <p className="section-label">Investor perspectives</p>
                  <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] text-forest sm:text-5xl">
                    Trusted for the long view.
                  </h2>
                </div>
                <div aria-label="Investor type" className="flex w-full gap-1 rounded-lg bg-[#ecefe9] p-1 sm:w-auto" role="tablist">
                  {(["personal", "business"] as const).map((audience) => (
                    <button
                      aria-selected={testimonialAudience === audience}
                      className={`settings-tab ${testimonialAudience === audience ? "settings-tab-active" : ""}`}
                      id={`testimonial-tab-${audience}`}
                      key={audience}
                      onClick={() => {
                        setTestimonialAudience(audience)
                        setActiveTestimonial(0)
                      }}
                      role="tab"
                      type="button"
                    >
                      {audience === "personal" ? "Personal investors" : "Business investors"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-w-4xl">
                <figure
                  aria-live="polite"
                  className="flex min-h-[220px] flex-col justify-between bg-[#edf1ec] p-6 sm:min-h-[200px] sm:p-9"
                  key={`${testimonialAudience}-${testimonial.name}`}
                  aria-labelledby={`testimonial-tab-${testimonialAudience}`}
                  role="tabpanel"
                >
                  <blockquote className="max-w-3xl font-display text-xl leading-8 tracking-[-0.03em] text-forest sm:text-2xl sm:leading-9">
                    <span aria-hidden="true" className="mr-1 text-forest/30">
                      “
                    </span>
                    {testimonial.quote}
                    <span aria-hidden="true" className="ml-1 text-forest/30">
                      ”
                    </span>
                  </blockquote>
                  <figcaption className="mt-6 flex items-end justify-between gap-5">
                    <div>
                      <p className="text-sm font-semibold text-forest">
                        {testimonial.name}
                      </p>
                      <p className="mt-1 text-xs text-ink/45">
                        {testimonial.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="mr-2 text-[10px] tabular-nums text-ink/40">
                        {String(activeTestimonial + 1).padStart(2, "0")} /{" "}
                        {String(visibleTestimonials.length).padStart(2, "0")}
                      </span>
                      <button
                        aria-label="Previous testimonial"
                        className="icon-button"
                        onClick={() =>
                          setActiveTestimonial(
                            (activeTestimonial + visibleTestimonials.length - 1) %
                              visibleTestimonials.length,
                          )
                        }
                        type="button"
                      >
                        <span className="rotate-180">
                          <Icon name="chevron" size={17} />
                        </span>
                      </button>
                      <button
                        aria-label="Next testimonial"
                        className="icon-button"
                        onClick={() =>
                          setActiveTestimonial(
                            (activeTestimonial + 1) % visibleTestimonials.length,
                          )
                        }
                        type="button"
                      >
                        <Icon name="chevron" size={17} />
                      </button>
                    </div>
                  </figcaption>
                </figure>
              </div>
              <p className="mt-5 text-[10px] leading-5 text-ink/45">
                {testimonialAudience === "business" && "Business stories are illustrative examples, not verified client endorsements. "}
                Testimonials reflect individual experiences and are not a guarantee of future investment results.
              </p>
            </div>
          </section>

        <section className="border-y border-line bg-[#f3f0e7] py-20 lg:py-28">
          <div className="site-shell">
            <div className="mb-10 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="section-label">Inside Acremont</p>
                <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] text-forest sm:text-5xl">
                  The company behind the portfolio.
                </h2>
              </div>
              <p className="max-w-md self-end text-sm leading-7 text-ink/52">
                Research, debate, and direct partnership shape how we work
                together every day.
              </p>
            </div>
            <div className="grid h-[620px] grid-cols-2 grid-rows-2 gap-2 lg:h-[560px] lg:grid-cols-[1.35fr_.65fr_.65fr]">
              <figure className="col-span-2 row-span-1 overflow-hidden lg:col-span-1 lg:row-span-2">
                <img
                  alt="Acremont colleagues meeting in the office"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1758518727820-28491c194bee?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1400"
                />
              </figure>
              <figure className="overflow-hidden">
                <img
                  alt="Reviewing investment documents"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1758518731462-d091b0b4ed0d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900"
                />
              </figure>
              <figure className="overflow-hidden">
                <img
                  alt="Portfolio research discussion"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1758519289013-9442fb2aeac6?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900"
                />
              </figure>
              <figure className="col-span-2 overflow-hidden">
                <img
                  alt="Acremont team collaborating"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1758519289022-5f9dea0d8cdc?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200"
                />
              </figure>
            </div>
          </div>
        </section>

        <TeamSection compact onNavigate={onNavigate} />

        <section className="bg-[#edf1ec] py-16" id="security">
          <div className="site-shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <p className="section-label">Designed around your confidence</p>
              <h2 className="mt-3 font-display text-3xl tracking-[-0.04em] text-forest">
                Clear information. Secure access. Human support.
              </h2>
            </div>
            <Button
              className="min-h-12"
              onClick={() => document.getElementById("plans")?.scrollIntoView()}
            >
              Choose a plan <Icon name="arrow" size={16} />
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  )
}

function PublicPageLayout({
  children,

  onLogin,

  onNavigate,

  onOpenAccount,
}: {
  children: React.ReactNode

  onLogin: () => void

  onNavigate: (page: PublicPage) => void

  onOpenAccount: () => void
}) {
  return (
    <div className="min-h-screen bg-[#f3f0e7] text-ink">
      <PublicHeader
        onLogin={onLogin}
        onNavigate={onNavigate}
        onOpenAccount={onOpenAccount}
      />
      <main>{children}</main>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  )
}

function StrategiesPage({
  onLogin,

  onNavigate,

  onOpenAccount,
}: {
  onLogin: () => void

  onNavigate: (page: PublicPage) => void

  onOpenAccount: () => void
}) {
  return (
    <PublicPageLayout
      onLogin={onLogin}
      onNavigate={onNavigate}
      onOpenAccount={onOpenAccount}
    >
      <section className="site-shell grid gap-10 py-20 lg:grid-cols-[.8fr_1.2fr] lg:py-28">
        <p className="section-label">Investment strategies</p>
        <div>
          <h1 className="font-display text-[clamp(3.2rem,6vw,6rem)] leading-[0.96] tracking-[-0.06em] text-forest">
            Purposeful portfolios for real goals.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-ink/58">
            Each strategy has a distinct job. Together, they can form a
            resilient portfolio built around your time horizon, liquidity needs,
            and appetite for risk.
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        {strategyStories.map((strategy, index) => (
          <article
            className="site-shell grid gap-8 border-b border-line py-12 lg:grid-cols-[72px_.82fr_1.18fr] lg:items-center lg:py-16"
            key={strategy.name}
          >
            <span className="text-xs font-semibold text-forest/30">
              {strategy.number}
            </span>
            <div className={index % 2 ? "lg:order-3" : ""}>
              <p className="section-label">{strategy.allocation}</p>
              <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] text-forest">
                {strategy.name}
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-ink/55">
                {strategy.summary}
              </p>
              <div className="mt-7 grid grid-cols-2 gap-5 border-t border-line pt-5">
                <div>
                  <p className="plan-meta">Typical horizon</p>
                  <p className="mt-1.5 text-sm font-semibold">3–7 years</p>
                </div>
                <div>
                  <p className="plan-meta">Liquidity</p>
                  <p className="mt-1.5 text-sm font-semibold">
                    Strategy dependent
                  </p>
                </div>
              </div>
              <Button className="mt-7" onClick={() => onNavigate("contact")}>
                Discuss this strategy <Icon name="arrow" size={16} />
              </Button>
            </div>
            <div
              className={`relative min-h-[330px] overflow-hidden rounded-2xl ${
                index % 2 ? "lg:order-2" : ""
              }`}
            >
              <img
                alt={`${strategy.name} visual`}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                src={strategy.image}
              />
              <span className="absolute bottom-5 left-5 rounded-full bg-black/35 px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-white backdrop-blur-sm">
                {strategy.media}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="bg-[#edf1ec] py-16">
        <div className="site-shell flex flex-col justify-between gap-7 md:flex-row md:items-center">
          <div>
            <p className="section-label">Start with your objectives</p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.04em] text-forest">
              Not sure which strategy is right?
            </h2>
          </div>
          <Button onClick={() => onNavigate("contact")}>
            Speak with our team <Icon name="arrow" size={16} />
          </Button>
        </div>
      </section>
    </PublicPageLayout>
  )
}

function AboutPage({
  onLogin,

  onNavigate,

  onOpenAccount,
}: {
  onLogin: () => void

  onNavigate: (page: PublicPage) => void

  onOpenAccount: () => void
}) {
  return (
    <PublicPageLayout
      onLogin={onLogin}
      onNavigate={onNavigate}
      onOpenAccount={onOpenAccount}
    >
      <section className="site-shell grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <p className="section-label">About Acremont</p>
          <h1 className="mt-5 font-display text-[clamp(3.2rem,6vw,5.8rem)] leading-[0.96] tracking-[-0.06em] text-forest">
            Investing should feel considered, not complicated.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-ink/58">
            Acremont was built to give individuals the clarity, access, and
            long-term discipline usually reserved for institutions.
          </p>
        </div>
        <div className="relative min-h-[520px] overflow-hidden rounded-2xl">
          <img
            alt="Sustainable modern architecture within a forest"
            className="absolute inset-0 h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1760570317619-0bad6e3dd4f1?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1400"
          />
        </div>
      </section>

      <section className="bg-forest py-20 text-white">
        <div className="site-shell grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <h2 className="font-display text-4xl tracking-[-0.045em]">
            What guides us.
          </h2>
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {[
              [
                "Clarity first",

                "We explain what you own, why you own it, and how it is performing in plain language.",
              ],

              [
                "Aligned decisions",

                "Our interests are designed to move with yours, with transparent terms and patient ownership.",
              ],

              [
                "Selective access",

                "We focus on a small number of researched opportunities rather than an endless product shelf.",
              ],

              [
                "Human support",

                "Technology should make investing easier, while experienced people remain available when it matters.",
              ],
            ].map(([title, copy], index) => (
              <div className="border-t border-white/15 pt-5" key={title}>
                <span className="text-[10px] text-white/35">0{index + 1}</span>
                <h3 className="mt-4 font-display text-xl">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="site-shell grid gap-12 py-20 lg:grid-cols-[.72fr_1.28fr] lg:py-28">
        <div>
          <p className="section-label">Our approach</p>
          <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] text-forest">
            Investment decisions with a long-term view.
          </h2>
        </div>
        <div className="space-y-6 text-base leading-8 text-ink/58">
          <p>
            We aim to make investment information clear, accessible, and useful
            to clients evaluating long-term opportunities.
          </p>
          <p>
            Plan terms, payment destinations, and investor account activity are
            shown from configured account records rather than sample balances.
          </p>
          <p>
            Transaction requests remain subject to review. Investment returns
            are not guaranteed and capital is at risk.
          </p>
        </div>
      </section>

      <TeamSection onNavigate={onNavigate} />
    </PublicPageLayout>
  )
}

function SignupPage({
  initialPlan,

  onLogin,

  onNavigate,

  onOpenAccount,

  onAuthenticated,

  onOtpVerified,

  onNavigateToSignIn,
}: {
  initialPlan: string

  onLogin: () => void

  onNavigate: (page: PublicPage) => void

  onOpenAccount: () => void

  onAuthenticated: (user: User) => void

  onOtpVerified: (email: string, token: string) => Promise<string | null>

  onNavigateToSignIn: (notice: string) => void
}) {
  const region = useContext(RegionContext)

  const [step, setStep] = useState(0)

  const [selectedPlan, setSelectedPlan] = useState(initialPlan)

  const [signupPlans, setSignupPlans] = useState<InvestmentPlan[]>([])

  const [fullName, setFullName] = useState("")

  const [email, setEmail] = useState("")

  const [phone, setPhone] = useState("")

  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(
    region === "us" ? "US" : "GB",
  )

  const [detailsAttempted, setDetailsAttempted] = useState(false)

  const [emailTouched, setEmailTouched] = useState(false)

  const [phoneTouched, setPhoneTouched] = useState(false)

  const [password, setPassword] = useState("")

  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)

  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [accountAttempted, setAccountAttempted] = useState(false)

  const [termsAccepted, setTermsAccepted] = useState(false)

  const [authError, setAuthError] = useState("")

  const [authToastSuccess, setAuthToastSuccess] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [verificationEmailSent, setVerificationEmailSent] = useState(false)

  const [verificationCode, setVerificationCode] = useState("")

  const [verificationSubmitting, setVerificationSubmitting] = useState(false)

  const office = companyDetails[region]

  const selectedSignupPlan = signupPlans.find(
    (plan) => plan.slug === selectedPlan,
  )

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())

  const phoneIsValid =
    phone.length > 0 && isValidPhoneNumber(phone, phoneCountry)

  const parsedPhone = phone
    ? parsePhoneNumberFromString(phone, phoneCountry)
    : undefined

  const internationalPhone = parsedPhone?.isValid()
    ? parsedPhone.formatInternational()
    : ""

  const selectedPhoneCountry = phoneCountryOptions.find(
    (option) => option.country === phoneCountry,
  )

  const fullNameError =
    fullName.trim().length < 2
      ? "Enter your full name (at least 2 characters)."
      : ""

  const emailError = emailIsValid
    ? ""
    : "Enter a valid email address, such as name@example.com."

  const phoneError = phoneIsValid
    ? ""
    : `Enter a valid ${selectedPhoneCountry?.label ?? "international"} phone number.`

  const passwordError =
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
      ? "Use at least 8 characters, including uppercase, lowercase, and a number."
      : ""

  const confirmPasswordError =
    confirmPassword && confirmPassword !== password
      ? "Passwords do not match. Re-enter your password."
      : ""

  useEffect(() => {
    if (!supabase) return

    void supabase

      .from("investment_plans")

      .select(
        "id,slug,name,annual_rate_percent,term_months,minimum_amount,currency,enabled,description,features",
      )

      .eq("enabled", true)

      .order("minimum_amount")

      .then(({ data }) => {
        const configuredPlans = (data ?? []) as InvestmentPlan[]

        setSignupPlans(configuredPlans)

        if (!configuredPlans.some((plan) => plan.slug === selectedPlan)) {
          setSelectedPlan(configuredPlans[0]?.slug ?? "")
        }
      })
  }, [])

  function continueDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setDetailsAttempted(true)

    if (fullNameError || emailError || phoneError) return

    setStep(2)

    window.scrollTo(0, 0)
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setAccountAttempted(true)

    if (
      passwordError ||
      confirmPasswordError ||
      !confirmPassword ||
      !termsAccepted
    )
      return

    setAuthError("")

    setAuthToastSuccess(false)

    if (!supabase || !supabaseConfigured) {
      setAuthError(
        "Authentication is not configured. Add the Supabase project URL and public anon key to the app environment.",
      )

      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),

        password,

        options: {
          emailRedirectTo: `${window.location.origin}/?auth=verified`,

          data: {
            full_name: fullName.trim(),

            phone: internationalPhone,

            selected_plan: selectedPlan,
          },
        },
      })

      if (error) {
        setAuthError(error.message)

        return
      }

      if (data.session && data.user?.email_confirmed_at) {
        onAuthenticated(data.user)

        return
      }

      setVerificationEmailSent(true)

      setStep(3)

      window.scrollTo(0, 0)
    } catch {
      setAuthError(
        "Could not reach the authentication service. Check your connection and try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function resendVerificationEmail() {
    setAuthError("")

    try {
      if (!supabase) throw new Error("Authentication is not configured.")

      const { error } = await supabase.auth.resend({
        type: "signup",

        email: email.trim(),

        options: {
          emailRedirectTo: `${window.location.origin}/?auth=verified`,
        },
      })

      if (error) throw error

      setAuthToastSuccess(true)

      setAuthError("A new verification email has been sent.")
    } catch (error) {
      setAuthToastSuccess(false)

      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to resend the verification email.",
      )
    }
  }

  async function verifyEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setAuthError("")

    setAuthToastSuccess(false)

    if (!/^\d{6}$/.test(verificationCode)) {
      setAuthError("Enter the 6-digit code from your verification email.")

      return
    }

    setVerificationSubmitting(true)

    try {
      const error = await onOtpVerified(email.trim(), verificationCode)

      if (error) {
        setAuthError(error)

        return
      }

      onNavigateToSignIn(
        "Email verified. Sign in to continue to your investor dashboard.",
      )
    } catch {
      setAuthError(
        "Could not verify the code. Check your connection and try again.",
      )
    } finally {
      setVerificationSubmitting(false)
    }
  }

  return (
    <>
      {isSubmitting && (
        <LoadingOverlay
          title="Creating your account"
          description="We’re securing your details and preparing your verification email."
        />
      )}
      {verificationSubmitting && (
        <LoadingOverlay
          title="Verifying your email"
          description="Please wait while we confirm your verification code."
        />
      )}
      <PublicPageLayout
      onLogin={onLogin}
      onNavigate={onNavigate}
      onOpenAccount={onOpenAccount}
    >
      <section className="site-shell max-w-5xl py-12 sm:py-16 lg:py-20">
        <>
          <div className="mx-auto max-w-2xl">
            <p className="section-label">Open an account</p>
            <h1 className="mt-3 font-display text-4xl tracking-[-0.05em] text-forest sm:text-5xl">
              A considered start to investing.
            </h1>
            <p className="mt-4 text-sm leading-6 text-ink/55">
              Choose a plan, share a few details, and set up your secure
              account.
            </p>
          </div>

          <ol className="mx-auto mt-9 grid max-w-2xl grid-cols-3 border-y border-line py-4">
            {["Choose a plan", "Your details", "Create account"].map(
              (label, index) => (
                <li
                  aria-current={step === index ? "step" : undefined}
                  className={`flex items-center gap-2 text-[10px] font-semibold sm:text-xs ${
                    step === index ? "text-forest" : "text-ink/35"
                  }`}
                  key={label}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      step === index
                        ? "border-forest bg-forest text-white"
                        : "border-line"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>{label}</span>
                </li>
              ),
            )}
          </ol>

          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-[0_24px_70px_-52px_rgba(24,60,50,0.5)] sm:p-9">
            {authError && (
              <div
                className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border bg-white p-4 text-left text-sm shadow-xl ${
                  authToastSuccess
                    ? "border-[#cfe0d1] text-forest"
                    : "border-[#f0c7c2] text-[#8e3027]"
                }`}
                role={authToastSuccess ? "status" : "alert"}
                aria-live={authToastSuccess ? "polite" : "assertive"}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf1ec] font-bold">
                  {authToastSuccess ? "✓" : "!"}
                </span>
                <p className="flex-1 text-xs leading-5">{authError}</p>
                <button
                  aria-label="Dismiss message"
                  className="text-[#8e3027]/60"
                  onClick={() => setAuthError("")}
                  type="button"
                >
                  ×
                </button>
              </div>
            )}
            {step === 3 && verificationEmailSent && (
              <div className="text-center" role="status">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf1ec] text-forest">
                  <Icon name="check" />
                </span>
                <p className="section-label mt-5">Verify your email</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-forest">
                  Verify your email to continue.
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink/55">
                  We sent an email to <strong>{email}</strong>. Use the secure
                  link, or enter the 6-digit code below. Your account stays
                  locked until your email is verified.
                </p>
                <p className="mt-2 text-xs leading-5 text-ink/45">
                  The code appears in the email only when the Supabase Email
                  template includes the{" "}
                  <span className="font-semibold">Token</span> variable.
                </p>
                <form
                  className="mx-auto mt-7 max-w-sm"
                  onSubmit={verifyEmailCode}
                >
                  <label
                    className="field-label block text-left"
                    htmlFor="signup-email-code"
                  >
                    6-digit verification code
                  </label>
                  <input
                    aria-label="Six-digit email verification code"
                    autoComplete="one-time-code"
                    className="field-input mt-2 h-16 text-center font-display text-3xl font-semibold tracking-[0.55em] text-forest"
                    id="signup-email-code"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) =>
                      setVerificationCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    pattern="[0-9]{6}"
                    placeholder="••••••"
                    required
                    value={verificationCode}
                  />
                  <p className="mt-2 text-left text-[10px] leading-5 text-ink/40">
                    Numbers only. If your email only has a link, open it to
                    verify instead.
                  </p>
                  <Button
                    className="mt-5 w-full justify-between"
                    disabled={verificationSubmitting}
                    type="submit"
                  >
                    {verificationSubmitting ? "Verifying…" : "Verify email"}
                    {!verificationSubmitting && <Icon name="arrow" size={16} />}
                  </Button>
                </form>
                <Button
                  className="mt-6"
                  onClick={resendVerificationEmail}
                  variant="secondary"
                >
                  Resend email link and code
                </Button>
                <button
                  className="mx-auto mt-4 block text-xs font-semibold text-forest"
                  onClick={() => {
                    setVerificationEmailSent(false)

                    setStep(2)

                    setAuthError("")
                  }}
                  type="button"
                >
                  Return to account details
                </button>
                <button
                  className="mx-auto mt-3 block text-xs font-semibold text-forest"
                  onClick={() =>
                    onNavigateToSignIn(
                      "Sign in after verifying your email address.",
                    )
                  }
                  type="button"
                >
                  Go to sign in
                </button>
              </div>
            )}
            {step === 0 && (
              <>
                <p className="text-xs text-ink/45">Step 1 of 3</p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] text-forest">
                  Choose your investment plan
                </h2>
                {signupPlans.length === 0 ? (
                  <p className="mt-6 border border-line bg-[#f3f0e7] p-4 text-sm leading-6 text-ink/55">
                    No investment plans are currently available. Please contact
                    our team.
                  </p>
                ) : (
                  <div className="mt-6 grid gap-3">
                    {signupPlans.map((plan) => (
                      <button
                        aria-pressed={selectedPlan === plan.slug}
                        className={`rounded-xl border p-4 text-left transition-colors sm:p-5 ${
                          selectedPlan === plan.slug
                            ? "border-forest bg-[#f1f5f0] ring-1 ring-forest"
                            : "border-line hover:border-forest/40"
                        }`}
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.slug)}
                        type="button"
                      >
                        <span className="flex items-start justify-between gap-4">
                          <span>
                            <span className="font-display text-lg font-semibold text-forest">
                              {plan.name}
                            </span>
                            {plan.description && (
                              <span className="mt-1 block text-xs text-ink/50">
                                {plan.description}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block font-display text-xl font-semibold text-forest">
                              {plan.annual_rate_percent}%
                            </span>
                            <span className="text-[10px] text-ink/45">
                              target p.a.
                            </span>
                          </span>
                        </span>
                        <span className="mt-4 block border-t border-line pt-3 text-[10px] text-ink/50">
                          {plan.term_months} months · Minimum{" "}
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: plan.currency,
                          }).format(plan.minimum_amount)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  className="mt-6 w-full justify-between"
                  disabled={!selectedPlan}
                  onClick={() => setStep(1)}
                >
                  Continue with {selectedSignupPlan?.name ?? "selected plan"}{" "}
                  <Icon name="arrow" size={16} />
                </Button>
                <p className="mt-4 text-[10px] leading-5 text-ink/40">
                  Target returns are not guaranteed. Your capital is at risk.
                </p>
              </>
            )}

            {step === 1 && (
              <form noValidate onSubmit={continueDetails}>
                <p className="text-xs text-ink/45">
                  Step 2 of 3 · {selectedSignupPlan?.name ?? "Investment"} plan
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] text-forest">
                  Tell us about yourself
                </h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <label className="field-label sm:col-span-2">
                    Full name
                    <input
                      autoComplete="name"
                      aria-describedby={
                        fullNameError && detailsAttempted
                          ? "signup-name-hint"
                          : undefined
                      }
                      aria-invalid={Boolean(fullNameError && detailsAttempted)}
                      className="field-input mt-2"
                      onChange={(event) => setFullName(event.target.value)}
                      value={fullName}
                    />
                    {fullNameError && detailsAttempted && (
                      <span
                        className="mt-1 block text-xs text-[#a33d32]"
                        id="signup-name-hint"
                      >
                        {fullNameError}
                      </span>
                    )}
                  </label>
                  <label className="field-label sm:col-span-2">
                    Email address
                    <input
                      aria-describedby={
                        emailError && (emailTouched || detailsAttempted)
                          ? "signup-email-hint"
                          : "signup-email-help"
                      }
                      aria-invalid={Boolean(
                        emailError && (emailTouched || detailsAttempted),
                      )}
                      autoComplete="email"
                      className="field-input mt-2"
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      type="email"
                      value={email}
                    />
                    {emailError && (emailTouched || detailsAttempted) ? (
                      <span
                        className="mt-1 block text-xs text-[#a33d32]"
                        id="signup-email-hint"
                        role="alert"
                      >
                        {emailError}
                      </span>
                    ) : (
                      <span
                        className="mt-1 block text-xs font-normal text-ink/40"
                        id="signup-email-help"
                      >
                        Use an email address you can access; we’ll use it for
                        account communication.
                      </span>
                    )}
                  </label>
                  <label className="field-label sm:col-span-2">
                    Phone number
                    <span className="mt-2 grid grid-cols-[minmax(130px,0.7fr)_1fr] gap-2">
                      <select
                        aria-label="Phone country and calling code"
                        autoComplete="off"
                        className="field-input px-3"
                        onChange={(event) =>
                          setPhoneCountry(event.target.value as CountryCode)
                        }
                        value={phoneCountry}
                      >
                        {phoneCountryOptions.map((option) => (
                          <option key={option.country} value={option.country}>
                            {option.label} (+{option.callingCode})
                          </option>
                        ))}
                      </select>
                      <span className="flex min-w-0">
                        <span
                          aria-hidden="true"
                          className="flex shrink-0 items-center rounded-l border border-r-0 border-line bg-[#f3f0e7] px-3 text-sm font-medium text-forest"
                        >
                          +{selectedPhoneCountry?.callingCode ?? "1"}
                        </span>
                        <input
                          id="signup-phone"
                          aria-describedby={
                            phoneError && (phoneTouched || detailsAttempted)
                              ? "signup-phone-hint"
                              : "signup-phone-help"
                          }
                          aria-invalid={Boolean(
                            phoneError && (phoneTouched || detailsAttempted),
                          )}
                          autoComplete="tel-national"
                          className="field-input min-w-0 rounded-l-none"
                          onBlur={() => setPhoneTouched(true)}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="Enter your phone number"
                          type="tel"
                          value={phone}
                        />
                      </span>
                    </span>
                    {phoneError && (phoneTouched || detailsAttempted) ? (
                      <span
                        className="mt-1 block text-xs text-[#a33d32]"
                        id="signup-phone-hint"
                        role="alert"
                      >
                        {phoneError}
                      </span>
                    ) : (
                      <span
                        className="mt-1 block text-xs font-normal text-ink/40"
                        id="signup-phone-help"
                      >
                        The + country code is added automatically. Enter your
                        number without the code.
                      </span>
                    )}
                  </label>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => setStep(0)}
                    variant="secondary"
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 justify-between"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    Continue <Icon name="arrow" size={16} />
                  </Button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form noValidate onSubmit={createAccount}>
                <p className="text-xs text-ink/45">
                  Step 3 of 3 · {office.label}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] text-forest">
                  Set up your account
                </h2>
                <div className="mt-6 rounded-xl bg-[#f3f0e7] p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-ink/50">Selected plan</span>
                    <span className="font-semibold text-forest">
                      {selectedSignupPlan?.name ?? "Not selected"}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between gap-4">
                    <span className="text-ink/50">Name</span>
                    <span className="font-semibold text-forest">
                      {fullName}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between gap-4">
                    <span className="text-ink/50">Email</span>
                    <span className="break-all text-right font-semibold text-forest">
                      {email}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between gap-4">
                    <span className="text-ink/50">Phone</span>
                    <span className="text-right font-semibold text-forest">
                      {internationalPhone}
                    </span>
                  </div>
                </div>
                <label className="field-label mt-6 block">
                  Create a password
                  <span className="relative mt-2 block">
                    <input
                      id="signup-password"
                      aria-describedby="signup-password-hint"
                      aria-invalid={Boolean(
                        passwordError &&
                          (password.length > 0 || accountAttempted),
                      )}
                      autoComplete="new-password"
                      className="field-input pr-12"
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <button
                      aria-controls="signup-password"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink/50 hover:text-forest"
                      onClick={() => setShowPassword((visible) => !visible)}
                      type="button"
                    >
                      <Icon name="eye" size={17} />
                    </button>
                  </span>
                  {passwordError &&
                  (password.length > 0 || accountAttempted) ? (
                    <span
                      className="mt-1 block text-xs text-[#a33d32]"
                      id="signup-password-hint"
                      role="alert"
                    >
                      {passwordError}
                    </span>
                  ) : (
                    <span
                      className="mt-1 block text-xs font-normal text-ink/40"
                      id="signup-password-hint"
                    >
                      Use at least 8 characters, including uppercase, lowercase,
                      and a number.
                    </span>
                  )}
                </label>
                <label className="field-label mt-5 block">
                  Confirm password
                  <span className="relative mt-2 block">
                    <input
                      id="signup-confirm-password"
                      aria-describedby="signup-confirm-password-hint"
                      aria-invalid={Boolean(
                        confirmPasswordError ||
                          (!confirmPassword && accountAttempted),
                      )}
                      autoComplete="new-password"
                      className="field-input pr-12"
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                    />
                    <button
                      aria-controls="signup-confirm-password"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      aria-pressed={showConfirmPassword}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink/50 hover:text-forest"
                      onClick={() =>
                        setShowConfirmPassword((visible) => !visible)
                      }
                      type="button"
                    >
                      <Icon name="eye" size={17} />
                    </button>
                  </span>
                  {confirmPasswordError ||
                  (!confirmPassword && accountAttempted) ? (
                    <span
                      className="mt-1 block text-xs text-[#a33d32]"
                      id="signup-confirm-password-hint"
                      role="alert"
                    >
                      {confirmPasswordError ||
                        "Confirm your password to continue."}
                    </span>
                  ) : (
                    <span
                      className="mt-1 block text-xs font-normal text-ink/40"
                      id="signup-confirm-password-hint"
                    >
                      Re-enter the same password to confirm it.
                    </span>
                  )}
                </label>
                <label className="mt-5 flex items-start gap-2 text-xs leading-5 text-ink/55">
                  <input
                    aria-describedby={
                      accountAttempted && !termsAccepted
                        ? "signup-terms-hint"
                        : undefined
                    }
                    aria-invalid={accountAttempted && !termsAccepted}
                    checked={termsAccepted}
                    className="mt-1"
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    type="checkbox"
                  />
                  I agree to the terms and acknowledge the investment risks.
                </label>
                {accountAttempted && !termsAccepted && (
                  <p
                    className="mt-1 text-xs text-[#a33d32]"
                    id="signup-terms-hint"
                    role="alert"
                  >
                    Please accept the terms and risk acknowledgement to
                    continue.
                  </p>
                )}
                <div className="mt-6 flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => setStep(1)}
                    variant="secondary"
                  >
                    Back
                  </Button>
                  <Button className="flex-1 justify-between" type="submit">
                    {isSubmitting ? "Creating account…" : "Create account"}
                    {!isSubmitting && <Icon name="arrow" size={16} />}
                  </Button>
                </div>
                <p className="mt-4 text-[10px] leading-5 text-ink/40">
                  Your password is handled securely by Supabase and is never
                  stored by this app.
                </p>
              </form>
            )}
          </div>
        </>
      </section>
      </PublicPageLayout>
    </>
  )
}

function ContactPage({
  onLogin,

  onNavigate,

  onOpenAccount,
}: {
  onLogin: () => void

  onNavigate: (page: PublicPage) => void

  onOpenAccount: () => void
}) {
  const region = useContext(RegionContext)

  const office = companyDetails[region]

  const [redirecting, setRedirecting] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    const subject = encodeURIComponent(
      String(formData.get("topic") ?? "Investor enquiry"),
    )

    const body = encodeURIComponent(
      `Name: ${formData.get("first-name")} ${formData.get("last-name")}\nEmail: ${formData.get("email")}\n\n${formData.get("message")}`,
    )

    setRedirecting(true)
    window.setTimeout(() => {
      window.location.href = `mailto:invest@acremontfinance.online?subject=${subject}&body=${body}`
      window.setTimeout(() => setRedirecting(false), 1800)
    }, 120)
  }

  return (
    <PublicPageLayout
      onLogin={onLogin}
      onNavigate={onNavigate}
      onOpenAccount={onOpenAccount}
    >
      {redirecting && (
        <LoadingOverlay
          title="Opening your email app"
          description="Your enquiry is ready to review and send."
        />
      )}
      <section className="site-shell grid gap-14 py-20 lg:grid-cols-[.78fr_1.22fr] lg:py-28">
        <div>
          <p className="section-label">Contact</p>
          <h1 className="mt-5 font-display text-[clamp(3.2rem,6vw,5.8rem)] leading-[0.96] tracking-[-0.06em] text-forest">
            Let’s talk about your goals.
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-ink/55">
            Whether you are ready to invest or simply have a question, our
            investor team is here to help.
          </p>
          <div className="mt-10 space-y-6 border-t border-line pt-7 text-sm">
            <div>
              <p className="plan-meta">Investor enquiries</p>
              <a
                className="mt-2 block font-semibold text-forest"
                href="mailto:invest@acremontfinance.online"
              >
                invest@acremontfinance.online
              </a>
            </div>
            <div>
              <p className="plan-meta">Existing investors</p>
              <a
                className="mt-2 block font-semibold text-forest"
                href="mailto:support@acremontfinance.online"
              >
                support@acremontfinance.online
              </a>
            </div>
            <div>
              <p className="plan-meta">Telephone</p>
              <a
                className="mt-2 block font-semibold text-forest"
                href={`tel:${office.telephone}`}
              >
                {office.phone}
              </a>
              <p className="mt-1 text-xs text-ink/45">{office.hours}</p>
            </div>
            <div>
              <p className="plan-meta">{office.label}</p>
              <address className="mt-2 text-sm not-italic leading-6 text-forest">
                {office.address.map((line, index) => (
                  <span className="block" key={`${line}-${index}`}>
                    {line}
                  </span>
                ))}
              </address>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 sm:p-9">
          <form onSubmit={submit}>
            <h2 className="dashboard-title">Send an enquiry</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="field-label">
                First name
                <input
                  className="field-input mt-2"
                  name="first-name"
                  required
                />
              </label>
              <label className="field-label">
                Last name
                <input className="field-input mt-2" name="last-name" required />
              </label>
              <label className="field-label sm:col-span-2">
                Email address
                <input
                  className="field-input mt-2"
                  name="email"
                  required
                  type="email"
                />
              </label>
              <label className="field-label sm:col-span-2">
                I would like to discuss
                <select className="field-input mt-2" name="topic">
                  <option>Choosing an investment plan</option>
                  <option>Investment strategies</option>
                  <option>Existing account support</option>
                  <option>Something else</option>
                </select>
              </label>
              <label className="field-label sm:col-span-2">
                Message
                <textarea
                  className="field-input mt-2 min-h-32 resize-y"
                  name="message"
                  required
                />
              </label>
            </div>
            <Button className="mt-6" type="submit">
              Send enquiry <Icon name="arrow" size={16} />
            </Button>
            <p className="mt-3 text-xs leading-5 text-ink/45">
              This opens your email app so you can review and send the enquiry
              directly.
            </p>
          </form>
        </div>
      </section>
    </PublicPageLayout>
  )
}

const navItems: { label: string; page: DashboardPage; icon: IconName }[] = [
  { label: "Overview", page: "overview", icon: "home" },

  { label: "Invest", page: "invest", icon: "invest" },

  { label: "Withdraw", page: "withdraw", icon: "withdraw" },

  { label: "Support", page: "support", icon: "support" },

  { label: "Settings", page: "settings", icon: "settings" },

  { label: "Investment officer admin", page: "review", icon: "check" },
]

function PageHeader({
  eyebrow,

  title,

  copy,
}: {
  eyebrow: string

  title: string

  copy: string
}) {
  return (
    <div className="mb-8">
      <p className="section-label">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-forest sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink/52">{copy}</p>
    </div>
  )
}

function OverviewPage({
  setPage,
  onRefresh,
  refreshing,

  user,

  positions,

  requests,
}: {
  setPage: (page: DashboardPage) => void
  onRefresh: () => void
  refreshing: boolean

  user: User

  positions: PositionAccrual[]

  requests: TransactionRequest[]
}) {
  const portfolioValue = positions.reduce(
    (sum, item) => sum + Number(item.principal) + Number(item.accrued_gain),
    0,
  )

  const portfolioCurrency = positions[0]?.currency ?? "USD"

  const investorFirstName = String(user.user_metadata.full_name ?? "").trim().split(/\s+/)[0] || "Investor"

  const formatMoney = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: portfolioCurrency,
    }).format(value)

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-ink/50">Good morning,</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.04em] text-forest sm:text-4xl">
            Welcome back, {investorFirstName}
            .
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Refresh dashboard values"
            className="icon-button gap-2 px-3 text-xs font-semibold"
            disabled={refreshing}
            onClick={onRefresh}
            type="button"
          >
            <span className={refreshing ? "animate-spin" : ""}>
              <Icon name="refresh" size={15} />
            </span>
            <span>{refreshing ? "Updating…" : "Refresh"}</span>
          </button>
          <Button onClick={() => setPage("invest")}>
            Make an investment <Icon name="arrow" size={16} />
          </Button>
        </div>
      </div>

      <section className="rounded-2xl bg-forest p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <p className="text-sm text-white/55">Total portfolio value</p>
            <p className="mt-2 font-display text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
              {formatMoney(portfolioValue)}
            </p>
            <p className="mt-3 text-xs font-medium text-[#a6d5af]">
              Based on {positions.length} approved position
              {positions.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex gap-2 self-start">
            <button
              className="icon-button border-white/15 text-white hover:bg-white/10"
              aria-label="Show or hide balance"
            >
              <Icon name="eye" size={17} />
            </button>
            <button
              className="icon-button border-white/15 text-white hover:bg-white/10"
              aria-label="Portfolio analytics"
            >
              <Icon name="chart" size={17} />
            </button>
          </div>
        </div>
        {positions.length === 0 && (
          <p className="mt-6 text-xs text-white/55">
            No approved investments yet. Submitted requests appear in activity
            while pending review.
          </p>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <section className="dashboard-card">
          <div className="flex items-center justify-between">
            <h2 className="dashboard-title">Active investment</h2>
            <span className="status-pill">
              {positions.length
                ? `${positions.length} active`
                : "No active positions"}
            </span>
          </div>
          {positions.length === 0 ? (
            <p className="mt-5 text-sm text-ink/50">
              No approved positions are currently active.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-line">
              {positions.map((position) => (
                <article
                  className="grid gap-3 py-4 sm:grid-cols-4"
                  key={position.id}
                >
                  <div>
                    <p className="metric-label">Principal</p>
                    <p className="metric-value">
                      {formatMoney(Number(position.principal))}
                    </p>
                  </div>
                  <div>
                    <p className="metric-label">Annual rate</p>
                    <p className="metric-value">
                      {position.annual_rate_percent}% p.a.
                    </p>
                  </div>
                  <div>
                    <p className="metric-label">Accrued gain</p>
                    <p className="metric-value">
                      {formatMoney(Number(position.accrued_gain))}
                    </p>
                  </div>
                  <div>
                    <p className="metric-label">Maturity</p>
                    <p className="metric-value">
                      {new Date(
                        new Date(position.starts_at).setMonth(
                          new Date(position.starts_at).getMonth() +
                            position.term_months,
                        ),
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="dashboard-card">
          <h2 className="dashboard-title">Accrued gains</h2>
          <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-forest">
            {formatMoney(
              positions.reduce(
                (sum, item) => sum + Number(item.accrued_gain),
                0,
              ),
            )}
          </p>
          <p className="mt-1 text-xs text-ink/45">
            Calculated from approved positions
          </p>
          <div className="mt-7 grid grid-cols-2 gap-2">
            <Button onClick={() => setPage("invest")}>Invest</Button>
            <Button onClick={() => setPage("withdraw")} variant="secondary">
              Withdraw
            </Button>
          </div>
        </section>
      </div>

      <section className="dashboard-card mt-5">
        <div className="flex items-center justify-between">
          <h2 className="dashboard-title">Recent activity</h2>
          <button
            className="text-xs font-semibold text-forest"
            onClick={() => setPage("review")}
          >
            View requests
          </button>
        </div>
        <div className="mt-5 divide-y divide-line">
          {requests.map((item) => (
            <div className="flex items-center gap-4 py-4" key={item.id}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf1ec] text-forest">
                <Icon
                  name={item.kind === "withdrawal" ? "withdraw" : "invest"}
                  size={17}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {item.kind === "investment"
                    ? `Investment · ${displayRequestPlan(item) || "Plan"}`
                    : "Withdrawal"}
                </p>
                <p className="mt-0.5 text-[11px] text-ink/42">
                  {new Date(item.created_at).toLocaleString()} ·{" "}
                  {item.status.replace(/_/g, " ")}
                </p>
              </div>
              <p
                className={`text-sm font-semibold ${
                  item.kind === "investment" ? "text-[#34704a]" : "text-ink"
                }`}
              >
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: item.currency,
                }).format(item.amount)}
              </p>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="py-4 text-sm text-ink/50">
              No transactions have been submitted.
            </p>
          )}
        </div>
      </section>
    </>
  )
}

function InvestPage({
  initialPlan,

  onPaymentSubmitted,
  requests,
}: {
  initialPlan: string

  onPaymentSubmitted: (message: string) => void
  requests: TransactionRequest[]
}) {
  const router = useRouter()

  const [plans, setPlans] = useState<InvestmentPlan[]>([])

  const [wallets, setWallets] = useState<CryptoWallet[]>([])

  const [bankAccounts, setBankAccounts] = useState<BankPaymentAccount[]>([])

  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "bank">("crypto")

  const [walletId, setWalletId] = useState("")

  const [bankAccountId, setBankAccountId] = useState("")

  const [selected, setSelected] = useState(initialPlan)

  const [amount, setAmount] = useState("")

  const [requestId, setRequestId] = useState("")

  const [paymentQuote, setPaymentQuote] = useState<TransactionRequest | null>(
    null,
  )

  const [quoteSecondsRemaining, setQuoteSecondsRemaining] = useState(0)

  const [transactionHash, setTransactionHash] = useState("")

  const [loading, setLoading] = useState(true)

  const [busy, setBusy] = useState(false)

  const [error, setError] = useState("")

  const selectedDetails = plans.find((plan) => plan.slug === selected)

  const availableWallets = selectedDetails?.currency === "USD" ? wallets : []

  const availableBankAccounts = bankAccounts.filter((account) => account.currency === selectedDetails?.currency)

  useEffect(() => {
    if (paymentMethod === "crypto" && availableWallets.length === 0 && availableBankAccounts.length > 0) setPaymentMethod("bank")
    else if (paymentMethod === "bank" && availableBankAccounts.length === 0 && availableWallets.length > 0) setPaymentMethod("crypto")
  }, [paymentMethod, selectedDetails?.currency, wallets.length, bankAccounts.length])

  const quotedWallet = paymentQuote
    ? wallets.find(
        (wallet) =>
          wallet.asset === paymentQuote.payment_asset &&
          wallet.network === paymentQuote.payment_network,
      )
    : undefined

  const quotedBank = paymentQuote?.bank_payment_account_id
    ? bankAccounts.find((account) => account.id === paymentQuote.bank_payment_account_id)
    : undefined

  const minimum = selectedDetails?.minimum_amount ?? 0

  useEffect(() => {
    let active = true

    async function loadOptions() {
      if (!supabase) {
        setError(
          "Supabase is not configured. Investment requests are unavailable.",
        )

        setLoading(false)

        return
      }

      const [planResult, walletResult, bankResult] = await Promise.all([
        supabase
          .from("investment_plans")
          .select(
            "id,slug,name,annual_rate_percent,term_months,minimum_amount,currency,enabled,description,features",
          )
          .eq("enabled", true)
          .order("minimum_amount"),

        supabase
          .from("crypto_wallets")
          .select("id,asset,network,address,enabled,quote_usd_per_unit")
          .eq("enabled", true)
          .order("asset"),

        supabase.from("bank_payment_accounts").select("*").eq("enabled", true).order("bank_name"),
      ])

      if (!active) return

      if (planResult.error || walletResult.error || bankResult.error) {
        setError(
          planResult.error?.message ??
            walletResult.error?.message ??
            bankResult.error?.message ??
            "Unable to load payment configuration.",
        )
      } else {
        const configuredPlans = (planResult.data ?? []) as InvestmentPlan[]

        setPlans(configuredPlans)

        setWallets((walletResult.data ?? []) as CryptoWallet[])

        setBankAccounts((bankResult.data ?? []) as BankPaymentAccount[])

        setWalletId(walletResult.data?.[0]?.id ?? "")

        setBankAccountId(bankResult.data?.[0]?.id ?? "")

        if (!(walletResult.data?.length)) setPaymentMethod("bank")

        setSelected(initialPlan)
      }

      setLoading(false)
    }

    void loadOptions()

    return () => {
      active = false
    }
  }, [initialPlan])

  useEffect(() => {
    const client = supabase

    if (!client || !requestId) return

    let active = true

    const fetchQuote = async () => {
      const { data } = await client

        .from("transaction_requests")

        .select(
          "id,user_id,kind,amount,currency,status,payment_asset,payment_network,payment_quote_amount,payment_quote_expires_at,payment_tx_hash,payment_method,payment_reference,bank_payment_account_id,created_at,plan:investment_plans(name)",
        )

        .eq("id", requestId)

        .single()

      if (active && data) setPaymentQuote(data as unknown as TransactionRequest)
    }

    void fetchQuote()

    const poll = window.setInterval(() => void fetchQuote(), 8000)

    return () => {
      active = false
      window.clearInterval(poll)
    }
  }, [requestId])

  useEffect(() => {
    const expiresAt = paymentQuote?.payment_quote_expires_at

    if (!expiresAt) {
      setQuoteSecondsRemaining(0)
      return
    }

    const updateRemaining = () =>
      setQuoteSecondsRemaining(
        Math.max(
          0,
          Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
        ),
      )

    updateRemaining()

    const interval = window.setInterval(updateRemaining, 1000)

    return () => window.clearInterval(interval)
  }, [paymentQuote?.payment_quote_expires_at])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    if (!supabase || !selectedDetails) return

    const selectedWallet = wallets.find((wallet) => wallet.id === walletId)
    const selectedBank = bankAccounts.find((account) => account.id === bankAccountId)
    if ((paymentMethod === "crypto" && !selectedWallet) || (paymentMethod === "bank" && !selectedBank)) {
      setError("Choose an available payment option before continuing.")
      return
    }

    if (Number(amount) < minimum) {
      setError(
        `The minimum investment is ${new Intl.NumberFormat(undefined, { style: "currency", currency: selectedDetails.currency }).format(minimum)}.`,
      )

      return
    }

    setBusy(true)

    const { data, error: requestError } = paymentMethod === "crypto"
      ? await supabase.functions.invoke("create-investment-payment-quote", {
          body: { p_plan_slug: selectedDetails.slug, p_amount: Number(amount), p_crypto_wallet_id: selectedWallet?.id },
        })
      : await supabase.rpc("create_investment_payment_request", {
          p_plan_slug: selectedDetails.slug,
          p_amount: Number(amount),
          p_payment_method: paymentMethod,
          p_crypto_wallet_id: null,
          p_bank_account_id: selectedBank?.id ?? null,
        })

    setBusy(false)

    if (requestError) {
      setError(requestError.message)

      return
    }

    setPaymentQuote(null)

    setRequestId(typeof data === "string" ? data : data.request_id as string)

    onPaymentSubmitted("Your payment quote is ready. Use the details shown on this page to complete payment.")
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    if (
      !supabase ||
      !paymentQuote ||
      !paymentQuote.payment_quote_expires_at ||
      quoteSecondsRemaining <= 0 ||
      !requestId
    )
      return

    setBusy(true)

    const { error: paymentError } = paymentQuote.payment_method === "bank"
      ? await supabase.rpc("submit_bank_payment", { p_request_id: requestId, p_reference: transactionHash.trim() })
      : await supabase.rpc("submit_crypto_payment", {
          p_request_id: requestId,
          p_asset: quotedWallet!.asset,
          p_network: quotedWallet!.network,
          p_tx_hash: transactionHash.trim(),
        })

    setBusy(false)

    if (paymentError) {
      setError(paymentError.message)

      return
    }

    setPaymentQuote((current) => current ? {
      ...current,
      status: "pending_review",
      payment_tx_hash: transactionHash.trim(),
    } : current)

    onPaymentSubmitted(
      "Payment transaction submitted. Your investment request is pending officer verification.",
    )
  }

  return (
    <>
      {busy && (
        <LoadingOverlay
          title="Submitting your investment request"
          description="We’re preparing the payment request. Keep this page open until it’s ready."
        />
      )}
      <PageHeader
        eyebrow="Invest"
        title={
          requestId
            ? "Complete your investment request."
            : "Choose your next investment."
        }
        copy={requestId
          ? "Your payment quote is ready. Follow the selected payment option below and keep this page open to track its status."
          : "Choose an active plan and payment option. We’ll generate a payment quote automatically from the plan and configured payment details."}
      />
      {error && (
        <p
          className="mb-5 border border-[#f0c7c2] bg-[#fff4f2] p-3 text-xs leading-5 text-[#8e3027]"
          role="alert"
        >
          {error}
        </p>
      )}
      {loading ? (
        <section className="dashboard-card">
          <LoadingIndicator label="Loading plans and payment methods…" centered />
        </section>
      ) : requestId &&
        (!paymentQuote?.payment_quote_amount || !paymentQuote.payment_quote_expires_at || (paymentQuote.payment_method === "crypto" && !quotedWallet) || (paymentQuote.payment_method === "bank" && !quotedBank)) ? (
        <section className="dashboard-card max-w-2xl">
          <span className="status-pill">Pending quote</span>
          <h2 className="mt-4 dashboard-title">
            Waiting for payment instructions
          </h2>
          <LoadingIndicator label="Loading secure payment details…" />
          <p className="mt-2 text-sm leading-6 text-ink/55">
            We’re loading your payment quote. Do not send funds until all payment details appear here.
          </p>
        </section>
      ) : requestId ? (
        <form className="dashboard-card max-w-2xl" onSubmit={submitPayment}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-label">Configured payment method</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-forest">
              {paymentQuote?.plan?.name ?? selectedDetails?.name} · {paymentQuote?.payment_method === "bank" ? "Bank transfer" : quotedWallet?.asset}
              </h2>
              <p className="mt-1 text-xs text-ink/50">
                {quotedWallet ? `Network: ${quotedWallet.network}` : `${quotedBank?.bank_name} · ${quotedBank?.bank_country}`}
              </p>
            </div>
            <div className="text-right">
              <span className="status-pill">Quote active</span>
              <p className="mt-2 font-mono text-lg font-semibold text-[#8e3027]">
                {String(Math.floor(quoteSecondsRemaining / 60)).padStart(
                  2,
                  "0",
                )}
                :{String(quoteSecondsRemaining % 60).padStart(2, "0")}
              </p>
              <p className="text-[10px] text-ink/45">remaining</p>
            </div>
          </div>
          {quotedWallet ? <div className="mt-6 flex flex-col items-center gap-4 rounded-xl bg-[#f3f0e7] p-5 sm:flex-row">
            <div className="bg-white p-3">
              <QRCodeSVG
                value={quotedWallet!.address}
                size={144}
                level="M"
                includeMargin
              />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold text-forest">
                Send exactly {paymentQuote!.payment_quote_amount}{" "}
                {quotedWallet!.asset} on {quotedWallet!.network}
              </p>
              <p className="mt-2 break-all rounded border border-line bg-white p-3 font-mono text-xs text-ink">
                {quotedWallet!.address}
              </p>
              <p className="mt-2 text-[10px] leading-5 text-[#8e3027]">
                Verify asset, amount, network and address. Blockchain transfers
                may be irreversible. Payment requires independent officer
                verification.
              </p>
            </div>
          </div> : <div className="mt-6 rounded-xl bg-[#f3f0e7] p-5">
            <p className="text-xs font-semibold text-forest">Transfer exactly {paymentQuote?.payment_quote_amount} {paymentQuote?.currency} to this account</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-ink/45">Bank</dt><dd className="mt-1 font-medium">{quotedBank?.bank_name}</dd></div>
              <div><dt className="text-xs text-ink/45">Account name</dt><dd className="mt-1 font-medium">{quotedBank?.account_name}</dd></div>
              <div><dt className="text-xs text-ink/45">Account number</dt><dd className="mt-1 font-mono font-medium">{quotedBank?.account_number}</dd></div>
              {quotedBank?.routing_number && <div><dt className="text-xs text-ink/45">Routing number</dt><dd className="mt-1 font-mono font-medium">{quotedBank.routing_number}</dd></div>}
              {quotedBank?.swift_code && <div><dt className="text-xs text-ink/45">SWIFT / BIC</dt><dd className="mt-1 font-mono font-medium">{quotedBank.swift_code}</dd></div>}
            </dl>
            <p className="mt-4 text-xs text-ink/55">Use this payment reference: <strong className="font-mono text-forest">{paymentQuote?.payment_reference}</strong></p>
          </div>}
          <p className="mt-4 rounded-xl bg-[#f3f0e7] p-4 text-sm text-ink/65">
            Request amount:{" "}
            <strong className="text-forest">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: paymentQuote?.currency ?? selectedDetails?.currency ?? "USD",
              }).format(Number(paymentQuote?.amount ?? amount))}
            </strong>
          </p>
          {paymentQuote!.status !== "pending_payment" ? (
            <div className="mt-5 border border-[#d7e3d8] bg-white p-4" role="status">
              <p className="text-sm font-semibold text-forest">
                {paymentQuote!.status === "pending_review"
                  ? "Payment pending verification"
                  : `Payment ${paymentQuote!.status.replace(/_/g, " ")}`}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-ink/55">Transaction: {paymentQuote!.payment_tx_hash}</p>
              <p className="mt-2 text-xs leading-5 text-ink/50">
                {paymentQuote!.status === "pending_review"
                  ? "Your QR payment details remain here while an investment officer verifies the transaction."
                  : "The request status updates here as the payment review is completed."}
              </p>
            </div>
          ) : (
            <>
              <label
                className="field-label mt-5 block"
                htmlFor="payment-transaction-hash"
              >
                {quotedWallet ? "Blockchain transaction ID / hash" : "Bank transfer reference or receipt ID"}
                <input
                  className="field-input mt-2 font-mono"
                  id="payment-transaction-hash"
                  minLength={quotedWallet ? 16 : 3}
                  onChange={(event) => setTransactionHash(event.target.value)}
                  required
                  value={transactionHash}
                />
              </label>
              <p className="mt-2 text-xs text-ink/45">
                Submitting details does not confirm payment. Your request remains pending until verified by an investment officer.
              </p>
              <Button
                className="mt-6 w-full"
                disabled={busy || quoteSecondsRemaining <= 0}
                type="submit"
              >
                {busy ? "Submitting…" : "Submit payment for verification"}
              </Button>
            </>
          )}
        </form>
      ) : plans.length === 0 ? (
        <section className="dashboard-card text-sm leading-6 text-ink/55">
          No investment plans have been configured by an authorized officer yet.
          Requests are disabled until plans are approved.
        </section>
      ) : !selectedDetails ? (
        <section className="dashboard-card max-w-2xl">
          <p className="section-label">Choose your plan first</p>
          <h2 className="mt-2 dashboard-title">Set an investment plan to continue</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">
            Select your preferred plan in Settings before creating an investment request.
          </p>
          <Button className="mt-5" onClick={() => router.push(`${dashboardPath("settings")}?tab=plan`)}>
            Choose an investment plan <Icon name="arrow" size={16} />
          </Button>
        </section>
      ) : (
        <form className="dashboard-card mt-5 max-w-2xl" onSubmit={submit}>
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[#f2f4f0] p-4">
            <div>
              <p className="section-label">Selected plan</p>
              <h2 className="mt-1 dashboard-title">{selectedDetails.name}</h2>
              <p className="mt-1 text-xs text-ink/55">{selectedDetails.annual_rate_percent}% annual · {selectedDetails.term_months} months · minimum {new Intl.NumberFormat(undefined, { style: "currency", currency: selectedDetails.currency }).format(minimum)}</p>
            </div>
            <button className="text-xs font-semibold text-forest underline underline-offset-2" onClick={() => router.push(`${dashboardPath("settings")}?tab=plan`)} type="button">Change plan</button>
          </div>
          <fieldset className="mt-6">
            <legend className="field-label">How would you like to pay?</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {availableWallets.length > 0 && <button type="button" onClick={() => setPaymentMethod("crypto")} className={`rounded-xl border p-4 text-left ${paymentMethod === "crypto" ? "border-forest bg-[#f2f4f0]" : "border-line"}`}><span className="block text-sm font-semibold text-forest">Cryptocurrency</span><span className="mt-1 block text-xs text-ink/50">Pay to a configured wallet</span></button>}
              {availableBankAccounts.length > 0 && <button type="button" onClick={() => setPaymentMethod("bank")} className={`rounded-xl border p-4 text-left ${paymentMethod === "bank" ? "border-forest bg-[#f2f4f0]" : "border-line"}`}><span className="block text-sm font-semibold text-forest">Bank transfer</span><span className="mt-1 block text-xs text-ink/50">Pay to a configured bank account</span></button>}
            </div>
          </fieldset>
          {paymentMethod === "crypto" && availableWallets.length > 0 && <label className="field-label mt-5 block">Wallet and network<select className="field-input mt-2" onChange={(event) => setWalletId(event.target.value)} required value={availableWallets.some((wallet) => wallet.id === walletId) ? walletId : availableWallets[0].id}>{availableWallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.asset} · {wallet.network}</option>)}</select></label>}
          {paymentMethod === "bank" && availableBankAccounts.length > 0 && <label className="field-label mt-5 block">Bank account<select className="field-input mt-2" onChange={(event) => setBankAccountId(event.target.value)} required value={availableBankAccounts.some((account) => account.id === bankAccountId) ? bankAccountId : availableBankAccounts[0].id}>{availableBankAccounts.map((account) => <option key={account.id} value={account.id}>{account.bank_name} · {account.currency} · {account.bank_country}</option>)}</select></label>}
          <label className="field-label mt-6" htmlFor="amount">
            Amount to invest
          </label>
          <div className="input-prefix mt-2">
            <span>{selectedDetails?.currency ?? "USD"}</span>
            <input
              id="amount"
              min={minimum}
              step="0.01"
              placeholder="Enter amount"
              onChange={(event) => setAmount(event.target.value)}
              required
              type="number"
              value={amount}
            />
          </div>
          <Button
            className="mt-6 w-full"
            disabled={busy || (availableWallets.length === 0 && availableBankAccounts.length === 0)}
            type="submit"
          >
            {busy ? "Preparing quote…" : "Generate payment quote"}{" "}
            <Icon name="arrow" size={16} />
          </Button>
          {availableWallets.length === 0 && availableBankAccounts.length === 0 && wallets.length === 0 && !error && (
            <p className="mt-3 text-xs text-[#8e3027]">
              No payment method is configured by an investment officer. Requests
              cannot be started.
            </p>
          )}
        </form>
      )}
      {requests.some((request) => request.kind === "investment" && ["pending_payment", "pending_review"].includes(request.status)) && <details className="mt-5 max-w-2xl rounded-xl border border-line bg-white px-4 py-3"><summary className="cursor-pointer text-xs font-semibold text-forest">Pending investment payments ({requests.filter((request) => request.kind === "investment" && ["pending_payment", "pending_review"].includes(request.status)).length})</summary><div className="mt-3 space-y-3">{requests.filter((request) => request.kind === "investment" && ["pending_payment", "pending_review"].includes(request.status)).map((request) => <article key={request.id} className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-forest">{request.plan?.name ?? "Investment"} · {new Intl.NumberFormat(undefined, { style: "currency", currency: request.currency }).format(request.amount)}</strong><span className="status-pill">{request.status.replace(/_/g, " ")}</span></div><p className="mt-2 text-xs text-ink/50">{request.payment_method === "bank" ? `Bank transfer · ${request.payment_reference ?? "Reference pending"}` : request.payment_quote_amount ? `Quote: ${request.payment_quote_amount} ${request.payment_asset}` : "Payment quote pending"}</p><div className="mt-3 flex gap-4"><button className="text-xs font-semibold text-forest underline" type="button" onClick={() => { setRequestId(request.id); setPaymentQuote(null); setTransactionHash("") }}>View payment</button>{request.status === "pending_payment" && <button className="text-xs font-semibold text-[#8e3027] underline" type="button" onClick={async () => { if (!supabase) return; const { error: cancelError } = await supabase.rpc("cancel_transaction_request", { p_request_id: request.id }); if (cancelError) setError(cancelError.message); else onPaymentSubmitted("Pending investment payment cancelled.") }}>Cancel payment</button>}</div></article>)}</div></details>}
    </>
  )
}

function WithdrawPage({
  methods,

  positions,

  requests,

  onRequestComplete,
}: {
  methods: PayoutMethod[]

  positions: PositionAccrual[]

  requests: TransactionRequest[]

  onRequestComplete: (message: string) => void
}) {
  const router = useRouter()

  const [amount, setAmount] = useState("")

  const [currency, setCurrency] = useState(positions[0]?.currency ?? "USD")

  const [methodId, setMethodId] = useState("")

  const [error, setError] = useState("")

  const [saving, setSaving] = useState(false)

  const availableByCurrency = positions.reduce<Record<string, number>>(
    (totals, position) => {
      totals[position.currency] =
        (totals[position.currency] ?? 0) + Number(position.accrued_gain)

      return totals
    },
    {},
  )

  const reservedByCurrency = requests.reduce<Record<string, number>>(
    (totals, request) => {
      if (
        request.kind === "withdrawal" &&
        ["pending_review", "approved"].includes(request.status)
      ) {
        totals[request.currency] =
          (totals[request.currency] ?? 0) + Number(request.amount)
      }

      return totals
    },
    {},
  )

  const withdrawableCurrencies = Object.keys(availableByCurrency)

  const withdrawable = Math.max(
    0,
    (availableByCurrency[currency] ?? 0) - (reservedByCurrency[currency] ?? 0),
  )

  const verifiedMethods = methods.filter((method) => method.status === "verified")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    if (!supabase) {
      setError("Supabase is not configured.")
      return
    }

    const payoutMethod = methods.find((method) => method.id === methodId)

    if (!payoutMethod || payoutMethod.status !== "verified") {
      setError("Choose a verified payout method.")
      return
    }

    setSaving(true)

    const { error: requestError } = await supabase.rpc(
      "create_withdrawal_request",
      {
        p_amount: Number(amount),

        p_payout_method_id: methodId,

        p_currency: currency,
      },
    )

    setSaving(false)

    if (requestError) {
      setError(requestError.message)
      return
    }

    onRequestComplete(
      "Withdrawal request submitted. It remains pending officer review.",
    )
  }

  return (
    <>
      {saving && (
        <LoadingOverlay
          title="Submitting your withdrawal request"
          description="We’re securely checking your available balance and payout method."
        />
      )}
      <PageHeader
        eyebrow="Withdraw"
        title="Withdraw your available funds."
        copy="Choose a verified payout method and submit a withdrawal request for officer review. No funds are transferred until a separate verified payout process completes."
      />
      {error && (
        <p
          className="mb-5 border border-[#f0c7c2] bg-[#fff4f2] p-3 text-xs text-[#8e3027]"
          role="alert"
        >
          {error}
        </p>
      )}
      {positions.length === 0 && (
        <div className="mb-5 rounded-xl border border-[#e9d8a8] bg-[#fff9e9] p-4 text-xs leading-5 text-[#684f12]" role="status">
          There are no approved investments to withdraw from yet. Once an investment is approved and begins accruing gains, it will appear here.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
        <form className="dashboard-card" onSubmit={submit}>
          <label className="field-label" htmlFor="withdraw-amount">
            Withdrawal amount
          </label>
          <div className="input-prefix mt-2">
            <span>{currency}</span>
            <input
              id="withdraw-amount"
              max={withdrawable}
              min="0.01"
              step="0.01"
              placeholder="Enter amount"
              onChange={(event) => setAmount(event.target.value)}
              required
              type="number"
              value={amount}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink/45">
            <span>Available accrued gains</span>
            <span>
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency,
              }).format(withdrawable)}
            </span>
          </div>
          {withdrawableCurrencies.length > 1 && (
            <label className="field-label mt-5 block">
              Currency
              <select
                className="field-input mt-2"
                onChange={(event) => setCurrency(event.target.value)}
                value={currency}
              >
                {withdrawableCurrencies.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field-label mt-6" htmlFor="bank">
            Payout method
          </label>
          <select
            className="field-input mt-2"
            id="bank"
            onChange={(event) => setMethodId(event.target.value)}
            required
            value={methodId}
          >
            <option value="">Select a verified payout method</option>
            {methods
              .filter((method) => method.status === "verified")
              .map((method) => (
                <option key={method.id} value={method.id}>
                  {method.label}
                </option>
              ))}
          </select>
          {verifiedMethods.length === 0 && (
            <div className="mt-4 border border-[#e9d8a8] bg-[#fff9e9] p-4 text-xs leading-5 text-[#684f12]" role="status">
              <p>
                {methods.length === 0
                  ? "Add a payout method before requesting a withdrawal."
                  : "Your payout methods are awaiting officer verification. You can add another or update a method in settings."}
              </p>
              <button
                className="mt-2 font-semibold text-forest underline underline-offset-2"
                onClick={() => router.push("/app/settings?tab=payment")}
                type="button"
              >
                {methods.length === 0 ? "Add payout method" : "Open payment settings"}
                <span className="ml-1 inline-block align-middle">
                  <Icon name="arrow" size={13} />
                </span>
              </button>
            </div>
          )}
          <Button
            className="mt-7 w-full"
            disabled={saving || verifiedMethods.length === 0}
            type="submit"
          >
            {saving ? "Submitting…" : "Submit withdrawal request"}{" "}
            <Icon name="arrow" size={16} />
          </Button>
        </form>
        <div className="dashboard-card self-start bg-[#edf1ec]">
          <p className="metric-label">Withdrawable accrued gains</p>
          <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.05em] text-forest">
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency,
            }).format(withdrawable)}
          </p>
          <div className="mt-6 border-t border-forest/10 pt-5 text-xs leading-6 text-ink/52">
            <p>
              Only accrued gains on approved active positions are requestable.
            </p>
            <p>No payout is initiated by submitting this request.</p>
          </div>
        </div>
      </div>
      {requests.some((request) => request.kind === "withdrawal" && ["pending_review", "approved"].includes(request.status)) && <section className="dashboard-card mt-5"><h2 className="dashboard-title">Withdrawal requests</h2><div className="mt-4 space-y-3">{requests.filter((request) => request.kind === "withdrawal" && ["pending_review", "approved"].includes(request.status)).map((request) => <article key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4"><div><p className="text-sm font-semibold text-forest">{new Intl.NumberFormat(undefined, { style: "currency", currency: request.currency }).format(request.amount)}</p><p className="mt-1 text-xs text-ink/50">Submitted {new Date(request.created_at).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><span className="status-pill">{request.status === "approved" ? "Approved · payout pending" : "Pending review"}</span>{request.status === "pending_review" && <button className="text-xs font-semibold text-[#8e3027] underline" type="button" onClick={async () => { if (!supabase) return; const { error: cancelError } = await supabase.rpc("cancel_transaction_request", { p_request_id: request.id }); if (cancelError) setError(cancelError.message); else onRequestComplete("Pending withdrawal cancelled. The reserved amount is available again.") }}>Cancel request</button>}</div></article>)}</div></section>}
    </>
  )
}

function ReviewQueuePage({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState<"requests" | "wallets" | "bank" | "plans" | "payouts" | "accruals">(
    "requests",
  )

  const [selectedCryptoNetwork, setSelectedCryptoNetwork] = useState("")

  const [depositAmount, setDepositAmount] = useState("")

  const [depositCurrency, setDepositCurrency] = useState("USD")

  const [depositTxHash, setDepositTxHash] = useState("")

  const [requests, setRequests] = useState<TransactionRequest[]>([])

  const [profiles, setProfiles] = useState<Record<string, {
    full_name: string
    email: string
  }>>({})

  const [wallets, setWallets] = useState<CryptoWallet[]>([])

  const [plans, setPlans] = useState<InvestmentPlan[]>([])

  const [payoutMethods, setPayoutMethods] = useState<Array<PayoutMethod & { user_id: string }>>([])

  const [accrualPositions, setAccrualPositions] = useState<OfficerAccrualPosition[]>([])

  const [accrualAdjustments, setAccrualAdjustments] = useState<AccrualAdjustment[]>([])

  const [selectedAccrualPositionId, setSelectedAccrualPositionId] = useState("")

  const [accrualTarget, setAccrualTarget] = useState("")

  const [accrualReason, setAccrualReason] = useState("")

  const [accrualLoading, setAccrualLoading] = useState(false)

  const [selectedRequest, setSelectedRequest] = useState("")

  const [busy, setBusy] = useState(false)

  const [error, setError] = useState("")

  const [walletAsset, setWalletAsset] = useState<CryptoWallet["asset"]>("BTC")

  const [walletNetwork, setWalletNetwork] = useState("")

  const [walletAddress, setWalletAddress] = useState("")


  const [bankAccounts, setBankAccounts] = useState<BankPaymentAccount[]>([])

  const [bankName, setBankName] = useState("")

  const [bankAccountName, setBankAccountName] = useState("")

  const [bankAccountNumber, setBankAccountNumber] = useState("")

  const [bankCountry, setBankCountry] = useState("")

  const [bankCurrency, setBankCurrency] = useState("USD")

  const [bankRouting, setBankRouting] = useState("")

  const [bankSwift, setBankSwift] = useState("")

  const [editingWalletId, setEditingWalletId] = useState("")

  const [quoteAmount, setQuoteAmount] = useState("")

  const [quoteAsset, setQuoteAsset] = useState("")

  const [quoteNetwork, setQuoteNetwork] = useState("")

  const [planSlug, setPlanSlug] = useState("")

  const [planName, setPlanName] = useState("")

  const [planRate, setPlanRate] = useState("")

  const [planTerm, setPlanTerm] = useState("")

  const [planMinimum, setPlanMinimum] = useState("")

  const [planCurrency, setPlanCurrency] = useState("USD")

  const [planDescription, setPlanDescription] = useState("")

  const selectedAccrualPosition = accrualPositions.find((position) => position.id === selectedAccrualPositionId)

  const selectedAccrualHistory = accrualAdjustments.filter((adjustment) => adjustment.position_id === selectedAccrualPositionId)

  async function refresh() {
    if (!supabase) return

    const [
      requestResult,
      profileResult,
      walletResult,
      bankResult,
      planResult,
      payoutResult,
    ] = await Promise.all([
      supabase
        .from("transaction_requests")
        .select("*,plan:investment_plans(name)")
        .order("created_at", { ascending: false }),

      supabase.from("investor_profiles").select("user_id,full_name,email"),

      supabase
        .from("crypto_wallets")
        .select("id,asset,network,address,enabled,quote_usd_per_unit")
        .order("asset"),

      supabase.from("bank_payment_accounts").select("*").order("bank_name"),

      supabase
        .from("investment_plans")
        .select(
          "id,slug,name,annual_rate_percent,term_months,minimum_amount,currency,enabled,description,features",
        )
        .order("minimum_amount"),

      supabase
        .from("payout_methods")
        .select("id,user_id,kind,label,details,status,is_default")
        .order("created_at", { ascending: false }),
    ])

    const firstError =
      requestResult.error ??
      profileResult.error ??
      walletResult.error ??
      bankResult.error ??
      planResult.error ??
      payoutResult.error

    if (firstError) {
      setError(firstError.message)

      return
    }

    const profileMap = Object.fromEntries(
      (profileResult.data ?? []).map((profile) => [profile.user_id, profile]),
    )

    setProfiles(profileMap)

    setRequests((requestResult.data ?? []) as unknown as TransactionRequest[])

    setWallets((walletResult.data ?? []) as CryptoWallet[])

    setBankAccounts((bankResult.data ?? []) as BankPaymentAccount[])

    setPlans((planResult.data ?? []) as InvestmentPlan[])

    setPayoutMethods(
      (payoutResult.data ?? []) as Array<PayoutMethod & { user_id: string }>,
    )
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function loadAccrualData() {
    if (!supabase) return
    setAccrualLoading(true)
    const [positionResult, adjustmentResult] = await Promise.all([
      supabase
        .from("investment_position_accruals")
        .select("id,user_id,plan_id,principal,accrued_gain,currency,annual_rate_percent,term_months,starts_at,plan:investment_plans(name)")
        .order("starts_at", { ascending: false }),
      supabase
        .from("investment_position_accrual_adjustments")
        .select("id,position_id,previous_amount,target_amount,adjustment_amount,reason,officer_id,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ])
    setAccrualLoading(false)
    const loadError = positionResult.error ?? adjustmentResult.error
    if (loadError) {
      setError(loadError.message)
      return
    }
    const nextPositions = (positionResult.data ?? []) as unknown as OfficerAccrualPosition[]
    setAccrualPositions(nextPositions)
    setAccrualAdjustments((adjustmentResult.data ?? []) as AccrualAdjustment[])
    setSelectedAccrualPositionId((current) => nextPositions.some((position) => position.id === current) ? current : nextPositions[0]?.id ?? "")
  }

  useEffect(() => {
    if (tab === "accruals") void loadAccrualData()
  }, [tab])

  useEffect(() => {
    if (selectedAccrualPosition) setAccrualTarget(Number(selectedAccrualPosition.accrued_gain).toFixed(2))
  }, [selectedAccrualPosition?.id, selectedAccrualPosition?.accrued_gain])

  async function setAccruedGain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!supabase || !selectedAccrualPosition) return
    const target = Number(accrualTarget)
    if (!Number.isFinite(target) || target < 0 || accrualReason.trim().length < 10) {
      setError("Enter a non-negative accrued gain and a reason of at least 10 characters.")
      return
    }
    setBusy(true)
    const { error: updateError } = await supabase.rpc("officer_set_position_accrued_gain", {
      p_position_id: selectedAccrualPosition.id,
      p_target_amount: target,
      p_reason: accrualReason.trim(),
    })
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setAccrualReason("")
    notify("Accrued gain updated. The correction is recorded in the audit history.")
    await loadAccrualData()
  }

  async function saveWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    if (!supabase) return

    setBusy(true)

    if (!supportedCryptoNetworks[walletAsset]?.includes(walletNetwork)) {
      setBusy(false)
      setError("Choose a supported chain for this asset.")
      return
    }

    const walletPayload = {
      asset: walletAsset,
      network: walletNetwork.trim(),
      address: walletAddress.trim(),
      quote_usd_per_unit: 0,
      enabled: false,
    }

    const { error: saveError } = editingWalletId
      ? await supabase
          .from("crypto_wallets")
          .update(walletPayload)
          .eq("id", editingWalletId)
      : await supabase
          .from("crypto_wallets")
          .upsert(walletPayload, { onConflict: "asset,network" })

    setBusy(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setWalletNetwork("")
    setWalletAddress("")
    setEditingWalletId("")

    notify(
      "Wallet saved disabled. Verify the address and explicitly enable it before investors can see it.",
    )

    await refresh()
  }

  async function toggleWallet(wallet: CryptoWallet) {
    if (!supabase) return

    const { error: updateError } = await supabase
      .from("crypto_wallets")
      .update({ enabled: !wallet.enabled })
      .eq("id", wallet.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    notify(
      wallet.enabled
        ? "Wallet disabled."
        : "Wallet enabled and now visible to investors.",
    )

    await refresh()
  }

  async function saveBankAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!supabase) return
    setBusy(true)
    const { error: saveError } = await supabase.from("bank_payment_accounts").insert({
      bank_name: bankName.trim(), account_name: bankAccountName.trim(),
      account_number: bankAccountNumber.trim(), bank_country: bankCountry.trim(),
      currency: bankCurrency.toUpperCase(), routing_number: bankRouting.trim() || null,
      swift_code: bankSwift.trim() || null, enabled: false,
    })
    setBusy(false)
    if (saveError) { setError(saveError.message); return }
    setBankName(""); setBankAccountName(""); setBankAccountNumber("");
    setBankCountry(""); setBankRouting(""); setBankSwift("")
    notify("Bank payment details saved disabled. Verify the account before enabling it.")
    await refresh()
  }

  async function toggleBankAccount(account: BankPaymentAccount) {
    if (!supabase) return
    const { error: updateError } = await supabase.from("bank_payment_accounts").update({ enabled: !account.enabled }).eq("id", account.id)
    if (updateError) { setError(updateError.message); return }
    notify(account.enabled ? "Bank payment account disabled." : "Bank payment account enabled for investment quotes.")
    await refresh()
  }

  async function setPaymentQuote(request: TransactionRequest) {
    if (!supabase || !quoteAsset || !quoteNetwork || Number(quoteAmount) <= 0)
      return

    setBusy(true)

    const { error: quoteError } = await supabase.rpc(
      "officer_set_payment_quote",
      {
        p_request_id: request.id,

        p_asset: quoteAsset,

        p_network: quoteNetwork,

        p_crypto_amount: Number(quoteAmount),
      },
    )

    setBusy(false)

    if (quoteError) {
      setError(quoteError.message)
      return
    }

    setQuoteAmount("")

    notify("Time-limited payment quote issued.")

    await refresh()
  }

  async function editWallet(wallet: CryptoWallet) {
    setEditingWalletId(wallet.id)

    setWalletAsset(wallet.asset)

    setWalletNetwork(wallet.network)

    setWalletAddress(wallet.address)


    if (wallet.enabled) await toggleWallet(wallet)
  }

  function editPlan(plan: InvestmentPlan) {
    setPlanSlug(plan.slug)
    setPlanName(plan.name)
    setPlanRate(String(plan.annual_rate_percent))

    setPlanTerm(String(plan.term_months))
    setPlanMinimum(String(plan.minimum_amount))

    setPlanCurrency(plan.currency)
    setPlanDescription(plan.description ?? "")
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    if (!supabase) return

    setBusy(true)

    const { error: saveError } = await supabase.from("investment_plans").upsert(
      {
        slug: planSlug.trim().toLowerCase().replace(/\s+/g, "-"),

        name: planName.trim(),
        annual_rate_percent: Number(planRate),
        term_months: Number(planTerm),

        minimum_amount: Number(planMinimum),
        currency: planCurrency.toUpperCase(),
        description: planDescription.trim() || null,

        enabled: false,
      },
      { onConflict: "slug" },
    )

    setBusy(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setPlanSlug("")
    setPlanName("")
    setPlanRate("")
    setPlanTerm("")
    setPlanMinimum("")
    setPlanDescription("")

    notify(
      "Plan saved disabled. Review and enable it when its terms are approved.",
    )

    await refresh()
  }

  async function togglePlan(plan: InvestmentPlan) {
    if (!supabase) return

    const { error: updateError } = await supabase
      .from("investment_plans")
      .update({ enabled: !plan.enabled })
      .eq("id", plan.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    notify(plan.enabled ? "Plan disabled." : "Plan enabled for investors.")

    await refresh()
  }

  async function setPayoutMethodStatus(
    method: PayoutMethod & { user_id: string },
    status: PayoutMethod["status"],
  ) {
    if (!supabase) return

    setBusy(true)

    const { error: updateError } = await supabase
      .from("payout_methods")
      .update({ status })
      .eq("id", method.id)

    setBusy(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    notify(`Payout method marked ${status.replace(/_/g, " ")}.`)

    await refresh()
  }

  async function decideRequest(
    requestId: string,

    decision: "approved" | "rejected",

    asset?: string,

    network?: string,
  ) {
    if (!supabase) return

    setBusy(true)

    const { error: decisionError } = await supabase.rpc(
      "officer_decide_transaction",
      {
        p_request_id: requestId,

        p_decision: decision,

        p_asset: asset ?? null,

        p_network: network ?? null,
      },
    )

    setBusy(false)

    if (decisionError) {
      setError(decisionError.message)
      return
    }

    notify(
      `Request ${decision}. No bank or blockchain transfer was executed by this action.`,
    )

    await refresh()
  }

  async function markWithdrawalPaid(requestId: string) {
    if (!supabase) return
    setBusy(true)
    const { error: paidError } = await supabase.rpc(
      "officer_mark_withdrawal_paid",
      { p_request_id: requestId },
    )
    setBusy(false)
    if (paidError) {
      setError(paidError.message)
      return
    }
    notify("Payout recorded. The investor’s accrued balance now reflects the withdrawal.")
    await refresh()
  }

  const customers = [...new Set(requests.map((request) => request.user_id))]

  const currentUserId = customers.includes(selectedRequest)
    ? selectedRequest
    : customers[0]

  const currentRequests = requests.filter(
    (request) => request.user_id === currentUserId,
  )

  async function recordDeposit(requestId: string) {
    setError("")

    if (!supabase || Number(depositAmount) <= 0 || !depositTxHash.trim()) {
      setError("Enter the independently verified amount and transaction hash.")
      return
    }

    setBusy(true)

    const [asset, network] = selectedCryptoNetwork.split("|")

    const { error: recordError } = await supabase.rpc(
      "officer_record_deposit",
      {
        p_request_id: requestId,

        p_amount: Number(depositAmount),

        p_currency: depositCurrency,

        p_asset: asset,

        p_network: network,

        p_tx_hash: depositTxHash.trim(),
      },
    )

    setBusy(false)

    if (recordError) {
      setError(recordError.message)
      return
    }

    setDepositAmount("")
    setDepositTxHash("")

    notify("Deposit recorded and reconciled to this request.")

    await refresh()
  }

  return (
    <>
      {busy && (
        <LoadingOverlay
          title="Updating investment operations"
          description="Your officer action is being securely applied."
        />
      )}
      <PageHeader
        eyebrow="Restricted · investment officer"
        title="Investment operations."
        copy="Configure approved plans and wallet destinations, and review investor requests. Wallets and plans are created disabled; no transfers are executed by this interface."
      />
      {error && (
        <p
          className="mb-5 border border-[#f0c7c2] bg-[#fff4f2] p-3 text-xs text-[#8e3027]"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-[#ecefe9] p-1 sm:w-fit">
        {(["requests", "wallets", "bank", "plans", "payouts", "accruals"] as const).map((item) => (
          <button
            className={`settings-tab ${
              tab === item ? "settings-tab-active" : ""
            }`}
            key={item}
            onClick={() => setTab(item)}
          >
            {item === "requests"
              ? "Investor requests"
              : item === "wallets"
                ? "Crypto wallets"
                : item === "bank"
                  ? "Bank accounts"
                : item === "plans"
                  ? "Investment plans"
                  : item === "payouts"
                    ? "Payout methods"
                    : "Accrued gains"}
          </button>
        ))}
      </div>

      {tab === "accruals" && (
        <section className="dashboard-card">
          <div className="mb-5">
            <h2 className="dashboard-title">Investor accrued gains</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-ink/50">
              Correct a position total when a ledger issue is confirmed. Each change is stored as a dated, attributed adjustment; automatic daily accrual continues from the corrected balance.
            </p>
          </div>
          {accrualLoading ? (
            <LoadingIndicator label="Loading investor positions…" centered />
          ) : accrualPositions.length === 0 ? (
            <p className="py-6 text-sm text-ink/50">There are no active or matured positions to adjust.</p>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
              <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {accrualPositions.map((position) => {
                  const profile = profiles[position.user_id]
                  return (
                    <button
                      aria-pressed={selectedAccrualPositionId === position.id}
                      className={`w-full rounded-xl border p-4 text-left ${selectedAccrualPositionId === position.id ? "border-forest bg-[#f2f4f0]" : "border-line hover:border-forest/40"}`}
                      key={position.id}
                      onClick={() => setSelectedAccrualPositionId(position.id)}
                      type="button"
                    >
                      <span className="flex flex-wrap justify-between gap-2">
                        <span className="text-sm font-semibold text-forest">{profile?.full_name || profile?.email || "Investor"}</span>
                        <span className="text-xs font-semibold text-forest">{new Intl.NumberFormat(undefined, { style: "currency", currency: position.currency }).format(Number(position.accrued_gain))}</span>
                      </span>
                      <span className="mt-1 block text-xs text-ink/50">{position.plan?.name ?? "Investment"} · Principal {new Intl.NumberFormat(undefined, { style: "currency", currency: position.currency }).format(Number(position.principal))}</span>
                    </button>
                  )
                })}
              </div>
              {selectedAccrualPosition && (
                <div className="space-y-5">
                  <form className="rounded-xl border border-line p-4 sm:p-5" onSubmit={setAccruedGain}>
                    <p className="section-label">{profiles[selectedAccrualPosition.user_id]?.full_name || profiles[selectedAccrualPosition.user_id]?.email || "Investor"} · {selectedAccrualPosition.plan?.name ?? "Position"}</p>
                    <p className="mt-2 text-xs text-ink/50">Current accrued gain: <strong className="text-forest">{new Intl.NumberFormat(undefined, { style: "currency", currency: selectedAccrualPosition.currency }).format(Number(selectedAccrualPosition.accrued_gain))}</strong></p>
                    <label className="field-label mt-5 block">Set accrued gain total ({selectedAccrualPosition.currency})
                      <input className="field-input mt-2" min="0" required step="0.01" type="number" value={accrualTarget} onChange={(event) => setAccrualTarget(event.target.value)} />
                    </label>
                    <label className="field-label mt-4 block">Correction reason
                      <textarea className="field-input mt-2 min-h-24 resize-y" minLength={10} maxLength={1000} required value={accrualReason} onChange={(event) => setAccrualReason(event.target.value)} placeholder="Explain the confirmed ledger issue and the source used for the corrected total." />
                    </label>
                    <Button className="mt-4" disabled={busy || !accrualReason.trim() || Number(accrualTarget) === Number(selectedAccrualPosition.accrued_gain)} type="submit">
                      {busy ? "Saving correction…" : "Set accrued gain"}
                    </Button>
                  </form>
                  <section className="rounded-xl border border-line p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-forest">Adjustment history</h3>
                    {selectedAccrualHistory.length === 0 ? (
                      <p className="mt-3 text-xs text-ink/50">No manual corrections recorded for this position.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {selectedAccrualHistory.map((adjustment) => (
                          <article className="border-t border-line pt-3" key={adjustment.id}>
                            <div className="flex flex-wrap justify-between gap-2 text-xs">
                              <span className="font-semibold text-forest">{new Intl.NumberFormat(undefined, { style: "currency", currency: selectedAccrualPosition.currency }).format(Number(adjustment.previous_amount))} → {new Intl.NumberFormat(undefined, { style: "currency", currency: selectedAccrualPosition.currency }).format(Number(adjustment.target_amount))}</span>
                              <time className="text-ink/45">{new Date(adjustment.created_at).toLocaleString()}</time>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-ink/60">{adjustment.reason}</p>
                            <p className="mt-1 text-[10px] text-ink/40">Officer {profiles[adjustment.officer_id]?.full_name || profiles[adjustment.officer_id]?.email || adjustment.officer_id}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {tab === "payouts" && (
        <section className="dashboard-card">
          <h2 className="dashboard-title">Investor payout methods</h2>
          <p className="mt-2 text-xs leading-5 text-ink/50">
            Inspect account details through your approved secure process before
            verifying. Only verified methods can be used for withdrawal
            requests.
          </p>
          {payoutMethods.length === 0 ? (
            <p className="mt-5 text-sm text-ink/50">
              No payout methods are awaiting review.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {payoutMethods.map((method) => (
                <article
                  className="rounded-xl border border-line p-4"
                  key={method.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-forest">
                        {method.label} ·{" "}
                        {profiles[method.user_id]?.full_name ||
                          profiles[method.user_id]?.email ||
                          method.user_id}
                      </p>
                      <p className="mt-1 text-xs text-ink/50">
                        {method.kind === "bank"
                          ? `Bank transfer · account ending ${method.details.account_number?.slice(-4) ?? "unavailable"} · ${method.details.bank_country ?? ""}`
                          : `${method.details.asset} · ${method.details.network} · ${method.details.address}`}
                      </p>
                    </div>
                    <span className="status-pill">
                      {method.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {method.status !== "verified" && (
                    <div className="mt-4 flex gap-2 border-t border-line pt-3">
                      <Button
                        className="min-h-9 px-3"
                        disabled={busy}
                        onClick={() =>
                          setPayoutMethodStatus(method, "verified")
                        }
                      >
                        Verify method
                      </Button>
                      <Button
                        className="min-h-9 px-3"
                        disabled={busy}
                        onClick={() =>
                          setPayoutMethodStatus(method, "rejected")
                        }
                        variant="secondary"
                      >
                        Reject method
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "wallets" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <form className="dashboard-card" onSubmit={saveWallet}>
            <h2 className="dashboard-title">Configure crypto wallet</h2>
            <p className="mt-2 text-xs leading-5 text-ink/50">
              Only enabled addresses are visible to investors. Double-check the
              destination and network before enabling.
            </p>
            <label className="field-label mt-5 block">
              Asset
              <select
                className="field-input mt-2"
                onChange={(event) =>
                  setWalletAsset(event.target.value as CryptoWallet["asset"])
                }
                value={walletAsset}
              >
                {["BTC", "ETH", "USDT", "SOL", "XRP"].map((asset) => (
                  <option key={asset}>{asset}</option>
                ))}
              </select>
            </label>
            <label className="field-label mt-4 block">
              Network / chain
              <select
                className="field-input mt-2"
                onChange={(event) => setWalletNetwork(event.target.value)}
                required
                value={walletNetwork}
              >
                {["", ...(supportedCryptoNetworks[walletAsset] ?? [])].map(
                  (network) => (
                    <option key={network} value={network}>
                      {network || "Select network"}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="field-label mt-4 block">
              Wallet address
              <input
                className="field-input mt-2 font-mono"
                onChange={(event) => setWalletAddress(event.target.value)}
                required
                value={walletAddress}
              />
            </label>
            <p className="mt-4 rounded-lg bg-[#f2f4f0] p-3 text-xs leading-5 text-ink/55">Crypto prices are fetched automatically when an investor requests a quote. The price is locked for 15 minutes.</p>
            <Button className="mt-5 w-full" disabled={busy} type="submit">
              {editingWalletId
                ? "Save edited wallet disabled"
                : "Save disabled wallet"}
            </Button>
          </form>
          <section className="dashboard-card">
            <h2 className="dashboard-title">Configured destinations</h2>
            {wallets.length === 0 ? (
              <p className="mt-4 text-sm text-ink/50">
                No crypto wallet methods configured.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {wallets.map((wallet) => (
                  <article
                    className="rounded-xl border border-line p-4"
                    key={wallet.id}
                  >
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-semibold text-forest">
                        {wallet.asset} · {wallet.network} · Live price
                      </p>
                      <span className="status-pill">
                        {wallet.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-2 break-all font-mono text-xs text-ink/55">
                      {wallet.address}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        className="min-h-9 px-3"
                        onClick={() => void editWallet(wallet)}
                        variant="secondary"
                      >
                        Edit
                      </Button>
                      <Button
                        className="min-h-9 px-3"
                        onClick={() => toggleWallet(wallet)}
                        variant={wallet.enabled ? "secondary" : "primary"}
                      >
                        {wallet.enabled ? "Disable address" : "Enable address"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "bank" && <div className="grid gap-5 lg:grid-cols-[1fr_1fr]"><form className="dashboard-card" onSubmit={saveBankAccount}><h2 className="dashboard-title">Configure bank payment account</h2><p className="mt-2 text-xs leading-5 text-ink/50">Investors will see these details when paying. New accounts are disabled until verified.</p><label className="field-label mt-5 block">Bank name<input className="field-input mt-2" required value={bankName} onChange={(event) => setBankName(event.target.value)} /></label><label className="field-label mt-4 block">Account name<input className="field-input mt-2" required value={bankAccountName} onChange={(event) => setBankAccountName(event.target.value)} /></label><label className="field-label mt-4 block">Account number<input className="field-input mt-2" required value={bankAccountNumber} onChange={(event) => setBankAccountNumber(event.target.value)} /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label">Country<input className="field-input mt-2" required value={bankCountry} onChange={(event) => setBankCountry(event.target.value)} /></label><label className="field-label">Currency<input className="field-input mt-2" maxLength={3} required value={bankCurrency} onChange={(event) => setBankCurrency(event.target.value.toUpperCase())} /></label></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label">Routing number <span className="font-normal text-ink/40">(optional)</span><input className="field-input mt-2" value={bankRouting} onChange={(event) => setBankRouting(event.target.value)} /></label><label className="field-label">SWIFT / BIC <span className="font-normal text-ink/40">(optional)</span><input className="field-input mt-2" value={bankSwift} onChange={(event) => setBankSwift(event.target.value)} /></label></div><Button className="mt-5 w-full" disabled={busy} type="submit">Save disabled bank account</Button></form><section className="dashboard-card"><h2 className="dashboard-title">Configured bank accounts</h2>{bankAccounts.length === 0 ? <p className="mt-4 text-sm text-ink/50">No company bank accounts configured.</p> : <div className="mt-4 space-y-3">{bankAccounts.map((account) => <article className="rounded-xl border border-line p-4" key={account.id}><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-forest">{account.bank_name} · {account.currency}</p><span className="status-pill">{account.enabled ? "Enabled" : "Disabled"}</span></div><p className="mt-2 text-xs text-ink/55">{account.account_name} · ••••{account.account_number.slice(-4)} · {account.bank_country}</p><Button className="mt-3 min-h-9 px-3" onClick={() => void toggleBankAccount(account)} variant={account.enabled ? "secondary" : "primary"}>{account.enabled ? "Disable account" : "Enable account"}</Button></article>)}</div>}</section></div>}

      {tab === "plans" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <form className="dashboard-card" onSubmit={savePlan}>
            <h2 className="dashboard-title">Configure investment plan</h2>
            <p className="mt-2 text-xs leading-5 text-ink/50">
              Rates, term and minimum must be formally approved before enabling
              a plan. New edits save disabled.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="field-label">
                Slug
                <input
                  className="field-input mt-2"
                  onChange={(event) => setPlanSlug(event.target.value)}
                  required
                  value={planSlug}
                />
              </label>
              <label className="field-label">
                Display name
                <input
                  className="field-input mt-2"
                  onChange={(event) => setPlanName(event.target.value)}
                  required
                  value={planName}
                />
              </label>
              <label className="field-label">
                Annual rate (%)
                <input
                  className="field-input mt-2"
                  max="100"
                  min="0"
                  onChange={(event) => setPlanRate(event.target.value)}
                  required
                  step="0.0001"
                  type="number"
                  value={planRate}
                />
              </label>
              <label className="field-label">
                Term (months)
                <input
                  className="field-input mt-2"
                  min="1"
                  onChange={(event) => setPlanTerm(event.target.value)}
                  required
                  type="number"
                  value={planTerm}
                />
              </label>
              <label className="field-label">
                Minimum amount
                <input
                  className="field-input mt-2"
                  min="0.01"
                  onChange={(event) => setPlanMinimum(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={planMinimum}
                />
              </label>
              <label className="field-label">
                Currency
                <input
                  className="field-input mt-2"
                  maxLength={3}
                  onChange={(event) => setPlanCurrency(event.target.value)}
                  required
                  value={planCurrency}
                />
              </label>
            </div>
            <label className="field-label mt-4 block">
              Description
              <input
                className="field-input mt-2"
                onChange={(event) => setPlanDescription(event.target.value)}
                value={planDescription}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <Button disabled={busy} type="submit">
                Save plan disabled
              </Button>
              <Button onClick={() => editPlan(plans[0])} variant="secondary">
                Load first plan to edit
              </Button>
            </div>
          </form>
          <section className="dashboard-card">
            <h2 className="dashboard-title">Plans</h2>
            {plans.length === 0 ? (
              <p className="mt-4 text-sm text-ink/50">No plans configured.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {plans.map((plan) => (
                  <article
                    className="rounded-xl border border-line p-4"
                    key={plan.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-forest">
                          {plan.name} · {plan.annual_rate_percent}% p.a.
                        </p>
                        <p className="mt-1 text-xs text-ink/50">
                          {plan.term_months} months · {plan.currency}{" "}
                          {plan.minimum_amount} minimum
                        </p>
                      </div>
                      <span className="status-pill">
                        {plan.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        className="min-h-9 px-3"
                        onClick={() => editPlan(plan)}
                        variant="secondary"
                      >
                        Edit
                      </Button>
                      <Button
                        className="min-h-9 px-3"
                        onClick={() => togglePlan(plan)}
                      >
                        {plan.enabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "requests" && (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <section className="dashboard-card self-start">
            <h2 className="dashboard-title">Investors</h2>
            <div className="mt-4 divide-y divide-line">
              {customers.map((customerId) => {
                const customer = profiles[customerId]
                const pending = requests.filter(
                  (request) =>
                    request.user_id === customerId &&
                    request.status === "pending_review",
                ).length
                return (
                  <button
                    aria-pressed={currentUserId === customerId}
                    className={`flex w-full items-center justify-between gap-3 py-3 text-left text-sm ${
                      currentUserId === customerId
                        ? "font-semibold text-forest"
                        : "text-ink/60"
                    }`}
                    key={customerId}
                    onClick={() => setSelectedRequest(customerId)}
                  >
                    <span className="truncate">
                      {customer?.full_name || customer?.email || customerId}
                    </span>
                    {pending > 0 && (
                      <span className="status-pill">{pending}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
          <section className="dashboard-card">
            <h2 className="dashboard-title">Transaction requests</h2>
            {currentRequests.length === 0 ? (
              <p className="mt-4 text-sm text-ink/50">
                No requests for this investor.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {currentRequests.map((request) => (
                  <article
                    className="rounded-xl border border-line p-4"
                    key={request.id}
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="font-semibold text-forest">
                          {request.kind}
                          {displayRequestPlan(request)
                            ? ` · ${displayRequestPlan(request)}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-ink/45">
                          {profiles[request.user_id]?.email} ·{" "}
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                        <p className="mt-1 break-all text-xs text-ink/45">
                          {request.payment_asset
                            ? `${request.payment_asset} · ${request.payment_network}`
                            : "No submitted payment"}
                          {request.payment_reference
                            ? ` · Payment reference ${request.payment_reference}`
                            : ""}
                          {request.payment_tx_hash
                            ? ` · ${request.payment_tx_hash}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-semibold text-forest">
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: request.currency,
                          }).format(request.amount)}
                        </p>
                        <span className="status-pill">
                          {request.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    {request.kind === "investment" &&
                      request.status === "pending_review" && (
                        <form
                          className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-2"
                          onSubmit={(event) => {
                            event.preventDefault()
                            void recordDeposit(request.id)
                          }}
                        >
                          {request.payment_method === "bank" ? <div className="sm:col-span-2 rounded-lg bg-[#f3f0e7] p-3 text-sm">Bank transfer receipt/reference: <strong className="font-mono">{request.payment_tx_hash}</strong><p className="mt-1 text-xs text-ink/50">Confirm the funds arrived in the configured account before approving.</p></div> : <><label className="field-label">
                            Verified amount received
                            <input
                              className="field-input mt-2"
                              min="0.01"
                              onChange={(event) =>
                                setDepositAmount(event.target.value)
                              }
                              required
                              step="0.01"
                              type="number"
                              value={depositAmount}
                            />
                          </label></>}
                          <label className="field-label">
                            Settlement currency
                            <select
                              className="field-input mt-2"
                              onChange={(event) =>
                                setDepositCurrency(event.target.value)
                              }
                              value={depositCurrency}
                            >
                              {[
                                ...new Set(plans.map((plan) => plan.currency)),
                              ].map((currency) => (
                                <option key={currency}>{currency}</option>
                              ))}
                            </select>
                          </label>
                          {request.payment_method !== "bank" && <label className="field-label sm:col-span-2">
                            Verified blockchain transaction hash
                            <input
                              className="field-input mt-2 font-mono"
                              minLength={16}
                              onChange={(event) =>
                                setDepositTxHash(event.target.value)
                              }
                              required
                              value={depositTxHash}
                            />
                          </label>}
                          {request.payment_method !== "bank" && <Button
                            className="sm:col-span-2"
                            disabled={busy || !request.payment_tx_hash}
                            type="submit"
                          >
                            Reconcile verified payment
                          </Button>}
                        </form>
                      )}
                    {request.kind === "investment" &&
                      request.status === "pending_payment" && !request.payment_method && (
                        <div className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
                          <label className="field-label">
                            Payment asset
                            <select
                              className="field-input mt-2"
                              onChange={(event) => {
                                setQuoteAsset(event.target.value)
                                setQuoteNetwork("")
                              }}
                              value={quoteAsset}
                            >
                              <option value="">Select asset</option>
                              {[
                                ...new Set(
                                  wallets
                                    .filter((wallet) => wallet.enabled)
                                    .map((wallet) => wallet.asset),
                                ),
                              ].map((asset) => (
                                <option key={asset}>{asset}</option>
                              ))}
                            </select>
                          </label>
                          <label className="field-label">
                            Network
                            <select
                              className="field-input mt-2"
                              onChange={(event) =>
                                setQuoteNetwork(event.target.value)
                              }
                              value={quoteNetwork}
                            >
                              <option value="">Select network</option>
                              {wallets
                                .filter(
                                  (wallet) =>
                                    wallet.enabled &&
                                    wallet.asset === quoteAsset,
                                )
                                .map((wallet) => (
                                  <option key={wallet.id}>
                                    {wallet.network}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="field-label">
                            Exact crypto amount
                            <input
                              className="field-input mt-2"
                              min="0.00000001"
                              onChange={(event) =>
                                setQuoteAmount(event.target.value)
                              }
                              required
                              step="any"
                              type="number"
                              value={quoteAmount}
                            />
                          </label>
                          <Button
                            className="sm:col-span-3"
                            disabled={busy || !quoteAsset || !quoteNetwork}
                            onClick={() => void setPaymentQuote(request)}
                          >
                            Issue 90-minute payment quote
                          </Button>
                        </div>
                      )}
                    {request.kind === "investment" &&
                      request.status === "pending_review" && (
                        <div className="mt-3 border-t border-line pt-3">
                          {request.payment_method !== "bank" && <label className="field-label">
                            Independently verified asset/network
                            <select
                              className="field-input mt-2"
                              onChange={(event) =>
                                setSelectedCryptoNetwork(event.target.value)
                              }
                              value={selectedCryptoNetwork}
                            >
                              <option value="">Select verified network</option>
                              {wallets.map((wallet) => (
                                <option
                                  key={wallet.id}
                                  value={`${wallet.asset}|${wallet.network}`}
                                >
                                  {wallet.asset} · {wallet.network}
                                </option>
                              ))}
                            </select>
                          </label>}
                          <p className="mt-2 text-[10px] leading-5 text-ink/45">
                            Verify the actual on-chain receipt and amount before
                            approval. Approval records an investment position;
                            it does not send or custody funds.
                          </p>
                          <Button
                            className="mt-3 min-h-9 px-3"
                            disabled={
                              busy ||
                              (request.payment_method !== "bank" && !selectedCryptoNetwork) ||
                              !request.payment_tx_hash
                            }
                            onClick={() => {
                              const [asset, network] = selectedCryptoNetwork.split("|")
                              void decideRequest(
                                request.id,
                                "approved",
                                request.payment_method === "bank" ? undefined : asset,
                                request.payment_method === "bank" ? undefined : network,
                              )
                            }}
                          >
                            {request.payment_method === "bank" ? "Approve verified bank payment" : "Approve verified investment"}
                          </Button>
                          <Button
                            className="ml-2 mt-3 min-h-9 px-3"
                            disabled={busy}
                            onClick={() =>
                              decideRequest(request.id, "rejected")
                            }
                            variant="secondary"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    {request.kind === "withdrawal" &&
                      request.status === "pending_review" && (
                        <div className="mt-4 flex gap-2 border-t border-line pt-3">
                          <Button
                            className="min-h-9 px-3"
                            disabled={busy}
                            onClick={() =>
                              decideRequest(request.id, "approved")
                            }
                          >
                            Mark withdrawal approved
                          </Button>
                          <Button
                            className="min-h-9 px-3"
                            disabled={busy}
                            onClick={() =>
                              decideRequest(request.id, "rejected")
                            }
                            variant="secondary"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    {request.kind === "withdrawal" &&
                      request.status === "approved" && (
                        <div className="mt-4 border-t border-line pt-3">
                          <p className="mb-3 text-xs leading-5 text-ink/55">
                            Record this only after the payout has actually been sent. The investor’s accrued balance will decrease when it is marked paid.
                          </p>
                          <Button
                            className="min-h-9 px-3"
                            disabled={busy}
                            onClick={() => void markWithdrawalPaid(request.id)}
                          >
                            Confirm payout sent · Mark paid
                          </Button>
                        </div>
                      )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function SupportPage({
  user,
  notify,
}: {
  user: User
  notify: (message: string) => void
}) {
  const [topic, setTopic] = useState("Investment question")

  const [message, setMessage] = useState("")

  const [error, setError] = useState("")

  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    if (!supabase) {
      setError("Support is not configured.")
      return
    }

    setSaving(true)

    const { error: saveError } = await supabase
      .from("support_tickets")
      .insert({ user_id: user.id, topic, message: message.trim() })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setMessage("")

    notify("Support request sent.")
  }

  return (
    <>
      {saving && (
        <LoadingOverlay
          title="Sending your support request"
          description="Your message is being securely delivered to investor support."
        />
      )}
      <PageHeader
        eyebrow="Support"
        title="How can we help?"
        copy="Send us a message and a member of our investor support team will respond."
      />
      {error && (
        <p
          className="mb-5 border border-[#f0c7c2] bg-[#fff4f2] p-3 text-xs text-[#8e3027]"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
        <form className="dashboard-card" onSubmit={submit}>
          <label className="field-label" htmlFor="topic">
            What do you need help with?
          </label>
          <select
            className="field-input mt-2"
            id="topic"
            onChange={(event) => setTopic(event.target.value)}
            value={topic}
          >
            <option>Investment question</option>
            <option>Withdrawal</option>
            <option>Account access</option>
            <option>Payment method</option>
          </select>
          <label className="field-label mt-5" htmlFor="message">
            Message
          </label>
          <textarea
            className="field-input mt-2 min-h-36 resize-y"
            id="message"
            onChange={(event) => setMessage(event.target.value)}
            required
            value={message}
          />
          <Button className="mt-6" disabled={saving} type="submit">
            {saving ? "Sending…" : "Send message"}{" "}
            <Icon name="arrow" size={16} />
          </Button>
        </form>
        <div className="space-y-5">
          <div className="dashboard-card">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf1ec] text-forest">
              <Icon name="support" />
            </span>
            <h2 className="mt-5 dashboard-title">Investor support</h2>
            <p className="mt-2 text-sm leading-6 text-ink/50">
              Monday–Friday, 8am–6pm ET
            </p>
            <a
              className="mt-5 block text-sm font-semibold text-forest"
              href="mailto:support@acremontfinance.online"
            >
              support@acremontfinance.online
            </a>
          </div>
          <div className="dashboard-card">
            <h2 className="dashboard-title">Typical response time</h2>
            <p className="mt-3 font-display text-3xl font-semibold text-forest">
              Under 2 hours
            </p>
            <p className="mt-1 text-xs text-ink/45">During business hours</p>
          </div>
        </div>
      </div>
    </>
  )
}

function SettingsPage({
  user,
  notify,
}: {
  user: User
  notify: (message: string) => void
}) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"profile" | "payment" | "plan">(() => {
    const initialTab = searchParams.get("tab")
    return initialTab === "payment" || initialTab === "plan" ? initialTab : "profile"
  })

  useEffect(() => {
    setTab(
      (() => {
        const nextTab = searchParams.get("tab")
        return nextTab === "payment" || nextTab === "plan" ? nextTab : "profile"
      })(),
    )
  }, [searchParams])

  const [methods, setMethods] = useState<PayoutMethod[]>([])

  const [investmentPlans, setInvestmentPlans] = useState<InvestmentPlan[]>([])

  const [selectedPlan, setSelectedPlan] = useState(() => getUserPlan(user))

  const [methodKind, setMethodKind] = useState<"bank" | "crypto">("bank")

  const [bankCountry, setBankCountry] = useState("")

  const [bankName, setBankName] = useState("")

  const [accountHolder, setAccountHolder] = useState("")

  const [accountNumber, setAccountNumber] = useState("")

  const [routingNumber, setRoutingNumber] = useState("")

  const [swiftCode, setSwiftCode] = useState("")

  const [cryptoAsset, setCryptoAsset] = useState("BTC")

  const [cryptoNetwork, setCryptoNetwork] = useState("")

  const [cryptoAddress, setCryptoAddress] = useState("")

  const [editingMethodId, setEditingMethodId] = useState("")

  const [firstName, setFirstName] = useState(
    String(user.user_metadata.full_name ?? ""),
  )

  const [phone, setPhone] = useState(String(user.user_metadata.phone ?? ""))

  const [error, setError] = useState("")

  const [saving, setSaving] = useState(false)

  async function loadMethods() {
    if (!supabase) return

    const { data, error: loadError } = await supabase
      .from("payout_methods")
      .select("id,kind,label,details,status,is_default")
      .order("created_at", { ascending: false })

    if (loadError) setError(loadError.message)
    else setMethods((data ?? []) as PayoutMethod[])
  }

  useEffect(() => {
    if (!supabase) return

    void supabase
      .from("investor_profiles")
      .select("full_name,phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFirstName(data.full_name ?? "")
          setPhone(data.phone ?? "")
        }
      })
  }, [user.id])

  useEffect(() => {
    void loadMethods()
  }, [user.id])

  useEffect(() => {
    if (!supabase) return
    void supabase
      .from("investment_plans")
      .select("id,slug,name,annual_rate_percent,term_months,minimum_amount,currency,enabled,description,features")
      .eq("enabled", true)
      .order("minimum_amount")
      .then(({ data, error: plansError }) => {
        if (plansError) setError(plansError.message)
        else setInvestmentPlans((data ?? []) as InvestmentPlan[])
      })
  }, [user.id])

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setError("")

    if (!supabase) {
      setError("Supabase is not configured.")
      setSaving(false)
      return
    }

    const { error: saveError } = await supabase
      .from("investor_profiles")
      .upsert(
        {
          user_id: user.id,
          email: user.email ?? "",
          full_name: firstName.trim(),
          phone: phone.trim(),
        },
        { onConflict: "user_id" },
      )

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    notify("Profile updated.")
  }

  async function saveSelectedPlan() {
    setError("")
    if (!supabase) {
      setError("Supabase is not configured.")
      return
    }
    if (!investmentPlans.some((plan) => plan.slug === selectedPlan)) {
      setError("Choose an available investment plan.")
      return
    }
    setSaving(true)
    const { error: planError } = await supabase.auth.updateUser({
      data: { selected_plan: selectedPlan },
    })
    setSaving(false)
    if (planError) {
      setError(planError.message)
      return
    }
    notify("Your default investment plan has been updated.")
  }

  async function submitPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")

    if (!supabase) {
      setError("Supabase is not configured.")
      setSaving(false)
      return
    }

    const details =
      methodKind === "bank"
        ? {
            bank_country: bankCountry,
            bank_name: bankName.trim(),
            account_holder: accountHolder.trim(),
            account_number: accountNumber.trim(),
            routing_number: routingNumber.trim(),
            swift_code: swiftCode.trim(),
          }
        : {
            asset: cryptoAsset,
            network: cryptoNetwork.trim(),
            address: cryptoAddress.trim(),
          }

    if (
      methodKind === "crypto" &&
      !(supportedCryptoNetworks[cryptoAsset] ?? []).includes(cryptoNetwork)
    ) {
      setSaving(false)
      setError("Choose a supported chain for this asset.")
      return
    }

    const payoutPayload = {
      user_id: user.id,

      kind: methodKind,

      label:
        methodKind === "bank"
          ? `${bankName} bank account`
          : `${cryptoAsset} · ${cryptoNetwork}`,

      details,

      status: "pending_verification",

      is_default: editingMethodId
        ? (methods.find((method) => method.id === editingMethodId)
            ?.is_default ?? false)
        : methods.length === 0,
    }

    const { error: saveError } = editingMethodId
      ? await supabase
          .from("payout_methods")
          .update({
            kind: payoutPayload.kind,
            label: payoutPayload.label,
            details: payoutPayload.details,
            status: "pending_verification",
          })
          .eq("id", editingMethodId)
          .eq("user_id", user.id)
      : await supabase.from("payout_methods").insert(payoutPayload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    notify("Payout method submitted for investment officer verification.")

    setBankName("")
    setAccountHolder("")
    setAccountNumber("")
    setRoutingNumber("")
    setSwiftCode("")
    setCryptoAddress("")
    setCryptoNetwork("")
    setEditingMethodId("")

    await loadMethods()
  }

  function editMethod(method: PayoutMethod) {
    setEditingMethodId(method.id)

    setMethodKind(method.kind)

    if (method.kind === "bank") {
      setBankCountry(method.details.bank_country ?? "")

      setBankName(method.details.bank_name ?? "")

      setAccountHolder(method.details.account_holder ?? "")

      setAccountNumber(method.details.account_number ?? "")

      setRoutingNumber(method.details.routing_number ?? "")

      setSwiftCode(method.details.swift_code ?? "")
    } else {
      setCryptoAsset(method.details.asset ?? "BTC")

      setCryptoNetwork(method.details.network ?? "")

      setCryptoAddress(method.details.address ?? "")
    }
  }

  return (
    <>
      {saving && (
        <LoadingOverlay
          title="Saving your account changes"
          description="Please wait while we securely update your settings."
        />
      )}
      <PageHeader
        eyebrow="Settings"
        title="Manage your account."
        copy="Keep your personal details and payment methods up to date."
      />
      <div className="mb-5 flex gap-1 rounded-xl bg-[#ecefe9] p-1 sm:w-fit">
        <button
          className={`settings-tab ${
            tab === "profile" ? "settings-tab-active" : ""
          }`}
          onClick={() => setTab("profile")}
        >
          <Icon name="user" size={16} /> Profile
        </button>
        <button
          className={`settings-tab ${
            tab === "payment" ? "settings-tab-active" : ""
          }`}
          onClick={() => setTab("payment")}
        >
          <Icon name="wallet" size={16} /> Payment methods
        </button>
        <button
          className={`settings-tab ${tab === "plan" ? "settings-tab-active" : ""}`}
          onClick={() => setTab("plan")}
        >
          <Icon name="invest" size={16} /> Investment plan
        </button>
      </div>
      {error && (
        <p
          className="mb-5 border border-[#f0c7c2] bg-[#fff4f2] p-3 text-xs text-[#8e3027]"
          role="alert"
        >
          {error}
        </p>
      )}
      {tab === "profile" ? (
        <form className="dashboard-card max-w-2xl" onSubmit={submitProfile}>
          {tab === "profile" ? (
            <>
              <div className="flex items-center gap-4 border-b border-line pb-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white">
                  {(firstName || user.email || "I")
                    .split(/[\s@]/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0].toUpperCase())
                    .join("")}
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {firstName || "Investor"}
                  </p>
                  <p className="text-xs text-ink/45">{user.email} · Verified</p>
                </div>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="field-label sm:col-span-2">
                  Full name
                  <input
                    className="field-input mt-2"
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                    value={firstName}
                  />
                </label>
                <label className="field-label sm:col-span-2">
                  Email address
                  <input
                    className="field-input mt-2"
                    readOnly
                    value={user.email ?? ""}
                    type="email"
                  />
                </label>
                <label className="field-label sm:col-span-2">
                  Phone number
                  <input
                    className="field-input mt-2"
                    onChange={(event) => setPhone(event.target.value)}
                    value={phone}
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-ink/50">
                Payout methods and verification are managed in the secure panel
                below.
              </p>
            </>
          )}
          <Button className="mt-7" disabled={saving} type="submit">
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      ) : tab === "payment" ? (
        <div className="grid max-w-4xl gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="dashboard-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="dashboard-title">Your payout methods</h2>
              <Button
                className="min-h-9 px-3"
                onClick={() => setTab("payment")}
              >
                Refresh
              </Button>
            </div>
            {methods.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-ink/50">
                No payout methods added yet. Add a verified bank account or
                crypto address to request withdrawals.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {methods.map((method) => (
                  <article
                    className="rounded-xl border border-line p-4"
                    key={method.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-forest">
                        {method.label}
                      </p>
                      <span className="status-pill">
                        {method.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink/50">
                      {method.kind === "bank"
                        ? `Account ending ${method.details.account_number?.slice(-4) ?? "••••"} · ${method.details.bank_country ?? ""}`
                        : `${method.details.asset} · ${method.details.network} · ${method.details.address?.slice(0, 8)}…${method.details.address?.slice(-5)}`}
                    </p>
                    <Button
                      className="mt-3 min-h-9 px-3"
                      onClick={() => editMethod(method)}
                      variant="secondary"
                    >
                      Edit and re-verify
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </section>
          <form className="dashboard-card" onSubmit={submitPayout}>
            <h2 className="dashboard-title">
              {editingMethodId ? "Edit payout method" : "Add payout method"}
            </h2>
            <label className="field-label mt-5 block">
              Method type
              <select
                className="field-input mt-2"
                onChange={(event) =>
                  setMethodKind(event.target.value as "bank" | "crypto")
                }
                value={methodKind}
              >
                <option value="bank">Bank transfer</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
            </label>
            {methodKind === "bank" ? (
              <div className="mt-4 grid gap-4">
                {[
                  [
                    "Country",
                    bankCountry,
                    setBankCountry,
                    "Country where your account is held",
                  ],

                  [
                    "Bank name",
                    bankName,
                    setBankName,
                    "Bank or institution name",
                  ],

                  [
                    "Account holder",
                    accountHolder,
                    setAccountHolder,
                    "Name on the account",
                  ],

                  [
                    "Account number / IBAN",
                    accountNumber,
                    setAccountNumber,
                    "Enter account number or IBAN",
                  ],

                  [
                    "Routing / sort code",
                    routingNumber,
                    setRoutingNumber,
                    "Local routing, sort or transit code",
                  ],

                  [
                    "SWIFT / BIC (optional)",
                    swiftCode,
                    setSwiftCode,
                    "International bank code",
                  ],
                ].map(([label, value, setter, placeholder]) => (
                  <label className="field-label" key={label as string}>
                    {label as string}
                    <input
                      className="field-input mt-2"
                      onChange={(event) =>
                        (setter as (value: string) => void)(event.target.value)
                      }
                      placeholder={placeholder as string}
                      required={!String(label).includes("optional")}
                      value={value as string}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                <label className="field-label">
                  Asset
                  <select
                    className="field-input mt-2"
                    onChange={(event) => {
                      setCryptoAsset(event.target.value)
                      setCryptoNetwork("")
                    }}
                    value={cryptoAsset}
                  >
                    {["BTC", "ETH", "USDT", "SOL", "XRP"].map((asset) => (
                      <option key={asset}>{asset}</option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Network / chain
                  <select
                    className="field-input mt-2"
                    onChange={(event) => setCryptoNetwork(event.target.value)}
                    required
                    value={cryptoNetwork}
                  >
                    {["", ...(supportedCryptoNetworks[cryptoAsset] ?? [])].map(
                      (network) => (
                        <option key={network} value={network}>
                          {network || "Select network"}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="field-label">
                  Payout address
                  <input
                    className="field-input mt-2 font-mono"
                    onChange={(event) => setCryptoAddress(event.target.value)}
                    required
                    value={cryptoAddress}
                  />
                </label>
              </div>
            )}
            <p className="mt-4 text-xs leading-5 text-ink/45">
              New payout methods require officer verification. Use only a bank
              account or crypto wallet you control.
            </p>
            <Button className="mt-5 w-full" disabled={saving} type="submit">
              {saving
                ? "Saving…"
                : editingMethodId
                  ? "Save changes for re-verification"
                  : "Submit payout method"}
            </Button>
          </form>
        </div>
      ) : (
        <section className="dashboard-card max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-label">Default for future investments</p>
              <h2 className="mt-2 dashboard-title">Choose your investment plan</h2>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-ink/50">
                This saves your preferred plan for your next investment request. It does not change active investments or requests already in progress.
              </p>
            </div>
            <span className="status-pill">{investmentPlans.find((plan) => plan.slug === selectedPlan)?.name ?? "No plan selected"}</span>
          </div>
          {investmentPlans.length === 0 ? (
            <p className="mt-5 text-sm leading-6 text-ink/50">There are no active plans available right now.</p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {investmentPlans.map((plan) => (
                <button
                  aria-pressed={selectedPlan === plan.slug}
                  className={`rounded-xl border p-4 text-left transition ${selectedPlan === plan.slug ? "border-forest bg-[#f2f4f0]" : "border-line hover:border-forest/40"}`}
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.slug)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-forest">{plan.name}</span>
                    {selectedPlan === plan.slug && <Icon name="check" size={16} />}
                  </span>
                  <span className="mt-3 block font-display text-2xl font-semibold text-forest">{plan.annual_rate_percent}% <span className="font-sans text-xs font-medium">annual rate</span></span>
                  <span className="mt-2 block text-xs text-ink/55">{plan.term_months} months · Minimum {new Intl.NumberFormat(undefined, { style: "currency", currency: plan.currency }).format(plan.minimum_amount)}</span>
                  {plan.description && <span className="mt-3 block text-xs leading-5 text-ink/50">{plan.description}</span>}
                </button>
              ))}
            </div>
          )}
          <Button className="mt-6" disabled={saving || !investmentPlans.length || selectedPlan === getUserPlan(user)} onClick={() => void saveSelectedPlan()}>
            {saving ? "Saving…" : "Save preferred plan"}
          </Button>
        </section>
      )}
    </>
  )
}

function Dashboard({
  onExit,

  initialPlan,

  user,

  isInvestmentOfficer,

  showInvestmentTutorial = false,

  onTutorialDismiss,
}: {
  onExit: () => void

  initialPlan: string

  user: User

  isInvestmentOfficer: boolean

  showInvestmentTutorial?: boolean

  onTutorialDismiss: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const page = dashboardPageFromPath(pathname)

  const setPage = (nextPage: DashboardPage) => router.push(dashboardPath(nextPage))

  useEffect(() => {
    const routePage = pathname.split("/")[2] ?? ""
    if (!(["overview", "invest", "withdraw", "support", "settings", "review"] as string[]).includes(routePage)) {
      router.replace(dashboardPath("overview"))
    }
  }, [pathname, router])

  const [mobileNav, setMobileNav] = useState(false)

  const [toast, setToast] = useState("")

  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const accountMenuRef = useRef<HTMLDivElement>(null)

  const [tutorialVisible, setTutorialVisible] = useState(showInvestmentTutorial)

  const [positions, setPositions] = useState<PositionAccrual[]>([])

  const [refreshing, setRefreshing] = useState(false)

  const [requests, setRequests] = useState<TransactionRequest[]>([])

  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([])

  const [dataError, setDataError] = useState("")

  useEffect(() => {
    if (!accountMenuOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false)
    }
    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [accountMenuOpen])

  function notify(message: string) {
    setToast(message)

    window.setTimeout(() => setToast(""), 3200)
  }

  async function refreshInvestorData() {
    if (!supabase) {
      setDataError("Supabase is not configured.")
      setRefreshing(false)
      return
    }

    setRefreshing(true)

    const [positionsResult, requestsResult, methodsResult] = await Promise.all([
      supabase
        .from("investment_position_accruals")
        .select(
          "id,principal,accrued_gain,currency,annual_rate_percent,term_months,starts_at",
        )
        .eq("user_id", user.id),

      supabase
        .from("transaction_requests")
        .select("id,user_id,kind,amount,currency,status,payment_asset,payment_network,payment_quote_amount,payment_quote_expires_at,payment_tx_hash,payment_method,payment_reference,bank_payment_account_id,created_at,plan:investment_plans(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("payout_methods")
        .select("id,kind,label,details,status,is_default")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ])

    const firstError =
      positionsResult.error ?? requestsResult.error ?? methodsResult.error

    if (firstError) {
      setDataError(firstError.message)
      setRefreshing(false)
      return
    }

    setDataError("")

    setPositions((positionsResult.data ?? []) as PositionAccrual[])

    setRequests((requestsResult.data ?? []) as unknown as TransactionRequest[])

    setPayoutMethods((methodsResult.data ?? []) as PayoutMethod[])
    setRefreshing(false)
  }

  useEffect(() => {
    void refreshInvestorData()
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshInvestorData()
    }
    const interval = window.setInterval(() => void refreshInvestorData(), 60_000)
    window.addEventListener("focus", refreshWhenVisible)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refreshWhenVisible)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [pathname, user.id])

  function completeTransaction(message: string) {
    setPage("overview")

    notify(message)

    void refreshInvestorData()
  }

  function paymentSubmitted(message: string) {
    notify(message)
    void refreshInvestorData()
  }

  return (
    <div className="min-h-screen bg-[#f3f0e7] text-ink">
      <aside
        className={`dashboard-sidebar ${
          mobileNav ? "dashboard-sidebar-open" : ""
        }`}
      >
        <div className="flex items-center justify-between px-6 py-7">
          <Brand light />
          <button
            className="text-white/60 lg:hidden"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav className="mt-4 flex-1 px-3">
          {navItems

            .filter((item) => item.page !== "review" || isInvestmentOfficer)

            .map((item) => (
              <button
                className={`sidebar-link ${
                  page === item.page ? "sidebar-link-active" : ""
                }`}
                key={item.page}
                onClick={() => {
                  setPage(item.page)

                  setMobileNav(false)
                }}
              >
                <Icon name={item.icon} size={18} /> {item.label}
              </button>
            ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-3 px-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              JD
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {user.user_metadata.full_name ?? "Investor"}
              </p>
              <p className="truncate text-[10px] text-white/40">{user.email}</p>
            </div>
          </div>
          <button className="sidebar-link" onClick={onExit}>
            <Icon name="logout" size={18} /> Sign out
          </button>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="lg:pl-[248px]">
        <header className="flex h-[72px] items-center justify-between border-b border-line bg-white px-5 sm:px-8 lg:px-10">
          <button
            className="icon-button lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-[#edf1ec] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-forest sm:block">
              Investor account
            </span>
            <div className="relative" ref={accountMenuRef}>
              <button
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
                className="flex items-center gap-2 rounded-full p-1 pr-2 text-left hover:bg-[#f2f4f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
                onClick={() => setAccountMenuOpen((open) => !open)}
                type="button"
              >
                <span className="hidden max-w-40 truncate text-xs font-medium text-forest sm:block">
                  {user.user_metadata.full_name ?? "My account"}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-xs font-semibold text-white">
                  {(user.user_metadata.full_name ?? user.email ?? "I")
                    .split(/[\s@]/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part: string) => part[0].toUpperCase())
                    .join("")}
                </span>
                <Icon name="chevron" size={14} />
              </button>
              {accountMenuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-white p-2 shadow-xl"
                  role="menu"
                >
                  <div className="border-b border-line px-3 py-2">
                    <p className="truncate text-xs font-semibold text-forest">
                      {user.user_metadata.full_name ?? "My account"}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-ink/45">{user.email}</p>
                  </div>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-ink/75 hover:bg-[#f2f4f0] hover:text-forest"
                    onClick={() => {
                      setAccountMenuOpen(false)
                      router.push(`${dashboardPath("settings")}?tab=profile`)
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Icon name="user" size={16} /> Profile settings
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-[#8e3027] hover:bg-[#fff4f2]"
                    onClick={() => {
                      setAccountMenuOpen(false)
                      onExit()
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Icon name="logout" size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1180px] p-5 sm:p-8 lg:p-10">
          {dataError && (
            <div
              className="mb-6 border border-[#f0c7c2] bg-[#fff4f2] p-4 text-sm text-[#8e3027]"
              role="alert"
            >
              Could not load your account data: {dataError}
            </div>
          )}
          {page === "overview" && (
            <OverviewPage
              setPage={setPage}
              onRefresh={() => void refreshInvestorData()}
              refreshing={refreshing}
              user={user}
              positions={positions}
              requests={requests}
            />
          )}
          {page === "invest" && (
            <InvestPage
              initialPlan={initialPlan}
              onPaymentSubmitted={paymentSubmitted}
              requests={requests}
            />
          )}
          {page === "withdraw" && (
            <WithdrawPage
              methods={payoutMethods}
              positions={positions}
              requests={requests}
              onRequestComplete={paymentSubmitted}
            />
          )}
          {page === "support" && <SupportPage user={user} notify={notify} />}
          {page === "settings" && (
            <Suspense fallback={<div className="dashboard-card"><LoadingIndicator label="Loading account settings…" centered /></div>}>
              <SettingsPage user={user} notify={notify} />
            </Suspense>
          )}
          {page === "review" &&
            (isInvestmentOfficer ? (
              <ReviewQueuePage notify={notify} />
            ) : (
              <div className="dashboard-card text-sm text-ink/55" role="alert">
                This page is restricted to authorized investment officers.
              </div>
            ))}
        </main>
      </div>

      {tutorialVisible && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-[#0c211c]/45 px-4 pt-28 sm:pt-36">
          <section
            aria-labelledby="investment-tutorial-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-2xl sm:p-8"
            role="dialog"
          >
            <p className="section-label">Quick start · 1 of 1</p>
            <h2
              className="mt-3 font-display text-2xl font-semibold tracking-[-0.035em] text-forest"
              id="investment-tutorial-title"
            >
              Ready to make your first investment?
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/55">
              Select <strong>Make an investment</strong> to choose a plan and
              submit a request. It will remain pending until reviewed.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1"
                onClick={() => {
                  setTutorialVisible(false)

                  onTutorialDismiss()
                }}
                variant="secondary"
              >
                Not now
              </Button>
              <Button
                className="flex-1 justify-between"
                onClick={() => {
                  setTutorialVisible(false)

                  onTutorialDismiss()

                  setPage("invest")
                }}
              >
                Make an investment <Icon name="arrow" size={16} />
              </Button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-xl bg-forest px-4 py-3 text-sm text-white shadow-xl">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
            <Icon name="check" size={14} />
          </span>
          {toast}
        </div>
      )}
    </div>
  )
}

function LoginModal({
  onClose,

  onContinue,

  notice = "",
}: {
  onClose: () => void

  onContinue: (user: User) => void

  notice?: string
}) {
  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)

  const [message, setMessage] = useState(notice)

  const [messageKind, setMessageKind] = useState<"error" | "success">(
    notice ? "success" : "error",
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMessage("")

    setMessageKind("error")

    if (!supabase || !supabaseConfigured) {
      setMessage(
        "Authentication is not configured. Add the Supabase project URL and public anon key to the app environment.",
      )

      return
    }

    setIsSubmitting(true)

    let data: Awaited<ReturnType<NonNullable<typeof supabase>["auth"]["signInWithPassword"]>>["data"]

    let error: Error | null

    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(),

        password,
      })

      data = result.data

      error = result.error
    } catch {
      setIsSubmitting(false)

      setMessage(
        "Could not reach the authentication service. Check your connection and try again.",
      )

      return
    }

    setIsSubmitting(false)

    if (error) {
      setMessage(
        /email not confirmed|email_not_confirmed/i.test(error.message)
          ? "Your email address is not verified yet. Check your inbox for the confirmation link before signing in."
          : error.message,
      )

      return
    }

    if (!data.user?.email_confirmed_at) {
      setMessage(
        "Your email address is not verified yet. Check your inbox for the confirmation link before signing in.",
      )

      return
    }

    onContinue(data.user)
  }

  async function resetPassword() {
    setMessage("")

    setMessageKind("error")

    if (!supabase || !email.trim()) {
      setMessage(
        "Enter your email address first, then request a password reset.",
      )

      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })

    if (error) {
      setMessage(error.message)

      return
    }

    setMessageKind("success")

    setMessage(
      "If an account exists for that email, a password reset link has been sent.",
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c211c]/60 p-4 backdrop-blur-[2px]">
      {isSubmitting && (
        <LoadingOverlay
          title="Signing you in"
          description="We’re checking your verified account and opening your dashboard."
        />
      )}
      <button
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close sign in"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl sm:p-9">
        <button
          className="absolute right-5 top-5 text-ink/40 hover:text-ink"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" size={19} />
        </button>
        <Brand />
        <h2 className="mt-9 font-display text-3xl font-semibold tracking-[-0.04em] text-forest">
          Welcome back.
        </h2>
        <p className="mt-2 text-sm text-ink/50">
          Sign in to manage your investments.
        </p>
        <form className="mt-7" onSubmit={submit}>
          <label className="field-label">
            Email address
            <input
              className="field-input mt-2"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field-label mt-5">
            Password
            <span className="relative mt-2 block">
              <input
                className="field-input pr-12"
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink/50 hover:text-forest"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                <Icon name="eye" size={17} />
              </button>
            </span>
          </label>
          <div className="mt-4 flex items-center justify-end text-xs">
            <button
              className="font-semibold text-forest"
              onClick={resetPassword}
              type="button"
            >
              Forgot password?
            </button>
          </div>
          <Button className="mt-7 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in…" : "Sign in"}
            {!isSubmitting && <Icon name="arrow" size={16} />}
          </Button>
        </form>
        {message && (
          <div
            className={`fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl border p-4 text-left text-sm shadow-xl ${
              messageKind === "success"
                ? "border-[#cfe0d1] bg-white text-forest"
                : "border-[#f0c7c2] bg-white text-[#8e3027]"
            }`}
            role={messageKind === "success" ? "status" : "alert"}
            aria-live={messageKind === "success" ? "polite" : "assertive"}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf1ec] font-bold">
              {messageKind === "success" ? "✓" : "!"}
            </span>
            <p className="flex-1 text-xs leading-5">{message}</p>
            <button
              aria-label="Dismiss message"
              className="opacity-60"
              onClick={() => setMessage("")}
              type="button"
            >
              ×
            </button>
          </div>
        )}
        <p className="mt-5 text-center text-[11px] leading-5 text-ink/40">
          Sign in with the email and password registered to your verified
          account.
        </p>
      </div>
    </div>
  )
}

function AppContent() {
  const pathname = usePathname()
  const router = useRouter()

  const setView = (target: PublicPage | "dashboard" | "signup") => {
    router.push(
      target === "dashboard"
        ? dashboardPath("overview")
        : target === "signup"
          ? "/signup"
          : publicPath(target),
    )
  }

  const [showLogin, setShowLogin] = useState(false)

  const [selectedPlan, setSelectedPlan] = useState("")

  const [showInvestmentTutorial, setShowInvestmentTutorial] = useState(false)

  const [authUser, setAuthUser] = useState<User | null>(null)

  const [authLoading, setAuthLoading] = useState(true)

  const [signInNotice, setSignInNotice] = useState("")

  const verificationReturnRef = useRef(false)

  function acceptVerifiedUser(user: User) {
    setAuthUser(user)

    setSelectedPlan(getUserPlan(user))

    try {
      const welcomeKey = `acremont-welcome-${user.id}`

      if (!window.localStorage.getItem(welcomeKey)) {
        setShowInvestmentTutorial(true)

        window.localStorage.setItem(welcomeKey, "shown")
      }
    } catch {
      // Private browsing may disable storage; the session remains valid.
    }

    setView("dashboard")
  }

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)

      return
    }

    const authClient = supabase

    const callbackUrl = new URL(window.location.href)

    verificationReturnRef.current =
      callbackUrl.searchParams.get("auth") === "verified"

    if (verificationReturnRef.current) {
      callbackUrl.searchParams.delete("auth")

      window.history.replaceState({}, "", callbackUrl)
    }

    let active = true

    const routeVerifiedUser = (user: User) => {
      let otpReturn = false

      try {
        otpReturn =
          window.sessionStorage.getItem("acremont-verify-then-signin") ===
          "true"
      } catch {
        // Continue with query-string callback state if storage is unavailable.
      }

      if (otpReturn && !verificationReturnRef.current) {
        return
      }

      if (verificationReturnRef.current) {
        setAuthUser(null)

        setView("home")

        setShowLogin(true)

        setSignInNotice(
          "Email verified. Sign in to continue to your investor dashboard.",
        )

        window.setTimeout(() => void authClient.auth.signOut(), 0)

        return
      }

      acceptVerifiedUser(user)
    }

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        verificationReturnRef.current = false

        try {
          window.sessionStorage.removeItem("acremont-verify-then-signin")
        } catch {
          // Session storage is optional.
        }

        return
      }

      const user = session?.user ?? null

      if (user?.email_confirmed_at) {
        routeVerifiedUser(user)
      } else {
        setAuthUser(null)

        if (user?.email) {
          window.setTimeout(() => void authClient.auth.signOut(), 0)
        }
      }

      setAuthLoading(false)
    })

    void authClient.auth.getSession().then(({ data, error }) => {
      if (!active) return

      const user = data.session?.user ?? null

      if (!error && user?.email_confirmed_at) {
        routeVerifiedUser(user)
      } else {
        setAuthUser(null)
      }

      setAuthLoading(false)
    })

    return () => {
      active = false

      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let observer: IntersectionObserver | undefined

    const frame = window.requestAnimationFrame(() => {
      const sections = document.querySelectorAll("main section")

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("reveal-visible")

              observer?.unobserve(entry.target)
            }
          })
        },

        { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
      )

      sections.forEach((section) => {
        section.classList.add("reveal-section")

        observer?.observe(section)
      })
    })

    return () => {
      window.cancelAnimationFrame(frame)

      observer?.disconnect()
    }
  }, [pathname])

  function handleAuthenticated(user: User) {
    if (!user.email_confirmed_at) return

    acceptVerifiedUser(user)

    setShowLogin(false)

    setSignInNotice("")

    router.push(dashboardPath("overview"))

    window.scrollTo(0, 0)
  }

  async function verifySignupOtp(
    email: string,
    token: string,
  ): Promise<string | null> {
    if (!supabase)
      return "Authentication is not configured. Please contact support."

    try {
      window.sessionStorage.setItem("acremont-verify-then-signin", "true")
    } catch {
      // The ref remains available for this in-page OTP flow.
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      })

      if (error) throw error

      await supabase.auth.signOut()

      return null
    } catch (error) {
      try {
        window.sessionStorage.removeItem("acremont-verify-then-signin")
      } catch {
        // Ignore unavailable session storage.
      }

      return error instanceof Error
        ? error.message
        : "The verification code could not be checked. Request a new email and try again."
    }
  }

  function navigateToSignIn(notice: string) {
    setSignInNotice(notice)

    setView("home")

    setShowLogin(true)

    window.scrollTo(0, 0)
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()

    setAuthUser(null)

    setView("home")

    setShowLogin(false)

    window.scrollTo(0, 0)
  }

  function openLogin() {
    setShowLogin(true)
  }

  function openAccount(plan = selectedPlan) {
    setSelectedPlan(plan)

    setShowLogin(false)

    setView("signup")

    window.scrollTo(0, 0)
  }

  const navigatePublic = (page: PublicPage) => {
    router.push(publicPath(page))

    window.scrollTo(0, 0)
  }

  const publicActions = {
    onLogin: openLogin,

    onNavigate: navigatePublic,

    onOpenAccount: () => openAccount(),
  }

  const dashboardRoute = authLoading ? (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f0e7]">
      <LoadingIndicator label="Checking your secure session…" />
    </div>
  ) : authUser ? (
    <Dashboard
      initialPlan={selectedPlan}
      user={authUser}
      isInvestmentOfficer={authUser.app_metadata?.role === "investment_officer"}
      showInvestmentTutorial={showInvestmentTutorial}
      onTutorialDismiss={() => setShowInvestmentTutorial(false)}
      onExit={signOut}
    />
  ) : (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f3f0e7] p-6 text-center">
      <Brand />
      <p className="max-w-md text-sm leading-6 text-ink/55">
        Sign in with a verified email address to access the investor dashboard.
      </p>
      <Button onClick={openLogin}>Sign in</Button>
    </div>
  )

  return (
    <>
      {pathname.startsWith("/app") ? (
        dashboardRoute
      ) : pathname === "/signup" ? (
        <SignupPage
          initialPlan={selectedPlan}
          onLogin={openLogin}
          onNavigate={navigatePublic}
          onOpenAccount={() => openAccount()}
          onAuthenticated={handleAuthenticated}
          onOtpVerified={verifySignupOtp}
          onNavigateToSignIn={navigateToSignIn}
        />
      ) : pathname === "/strategies" ? (
        <StrategiesPage {...publicActions} />
      ) : pathname === "/about" ? (
        <AboutPage {...publicActions} />
      ) : pathname === "/contact" ? (
        <ContactPage {...publicActions} />
      ) : (
        <PublicHome {...publicActions} onPlan={(plan) => openAccount(plan)} />
      )}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onContinue={handleAuthenticated}
          notice={signInNotice}
        />
      )}
    </>
  )
}

export default function AppClient() {
  return (
    <RegionProvider>
      <AppContent />
    </RegionProvider>
  )
}
