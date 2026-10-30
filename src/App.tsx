import { FormEvent, useEffect, useState } from "react"

type PublicPage = "home" | "strategies" | "about" | "contact"
type View = PublicPage | "dashboard"
type DashboardPage = "overview" | "invest" | "withdraw" | "support" | "settings"

type IconName = "arrow" | "chart" | "check" | "chevron" | "close" | "eye" | "home" | "invest" | "logout" | "menu" | "settings" | "support" | "user" | "wallet" | "withdraw"

const plans = [
  {
    name: "Foundation",
    rate: "6.5%",
    term: "12 months",
    minimum: "$1,000",
    description: "A measured entry point designed for capital stability.",
    features: [
      "Quarterly distributions",
      "12-month maturity",
      "Low volatility",
    ],
  },
  {
    name: "Growth",
    rate: "9.2%",
    term: "24 months",
    minimum: "$5,000",
    description: "Balanced private-market exposure for long-term growth.",
    features: [
      "Monthly reporting",
      "Diversified allocation",
      "Priority support",
    ],
    featured: true,
  },
  {
    name: "Strategic",
    rate: "12.4%",
    term: "36 months",
    minimum: "$25,000",
    description: "Our highest-conviction strategy for experienced investors.",
    features: ["Bespoke allocation", "Advisor access", "Quarterly review"],
  },
]

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

const testimonials = [
  {
    quote:
      "The clarity is what stands out. I always know where my capital is, why it is invested, and what happens next.",
    name: "Elena Marlow",
    role: "Investor since 2021",
    image:
      "https://images.unsplash.com/photo-1581065178047-8ee15951ede6?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900",
  },
  {
    quote:
      "Acremont gives us the discipline of an institution without losing the direct, personal relationship.",
    name: "David Chen",
    role: "Private client",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900",
  },
]

const team = [
  {
    name: "Maya Bennett",
    role: "Chief Investment Officer",
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=800",
  },
  {
    name: "Daniel Reed",
    role: "Head of Private Markets",
    image:
      "https://images.unsplash.com/photo-1613496701765-97267d26e3df?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=800",
  },
  {
    name: "Leila Morgan",
    role: "Director, Client Partnerships",
    image:
      "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=800",
  },
  {
    name: "Marcus Ellis",
    role: "Portfolio Manager",
    image:
      "https://images.unsplash.com/photo-1648448942225-7aa06c7e8f79?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=800",
  },
]

const activity = [
  {
    title: "Growth plan return",
    date: "May 28, 2025",
    value: "+$184.60",
    type: "Return",
  },
  {
    title: "Growth plan investment",
    date: "May 02, 2025",
    value: "$5,000.00",
    type: "Investment",
  },
  {
    title: "Account funded",
    date: "May 01, 2025",
    value: "$5,000.00",
    type: "Deposit",
  },
]

function Icon({ name, size = 20 }: { name: IconName size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9m6 10V5m6 14v-7m5 9H3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
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
      <>
        <path d="M12 22V2m-5 5h7.5a3.5 3.5 0 0 1 0 7H9.5a3.5 3.5 0 0 0 0 7H17" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5m5 5H3" />
        <path d="M15 3h6v18h-6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
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

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 ${
        light ? "text-white" : "text-forest"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          light ? "bg-white text-forest" : "bg-forest text-white"
        }`}
      >
        <svg
          aria-hidden="true"
          fill="none"
          viewBox="0 0 24 24"
          className="h-4 w-4"
        >
          <path
            d="M5 17 12 5l7 12M8 13h8"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      <span className="font-display text-[17px] font-semibold tracking-[-0.03em]">
        Acremont
      </span>
    </div>
  )
}

function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "quiet"
  className?: string
  type?: "button" | "submit"
  onClick?: () => void
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  )
}

function PublicHeader({
  onLogin,
  onNavigate,
}: {
  onLogin: () => void
  onNavigate: (page: PublicPage) => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[#fafaf7]/95 backdrop-blur-sm">
      <div className="site-shell flex h-[76px] items-center justify-between">
        <button onClick={() => onNavigate("home")} aria-label="Acremont home">
          <Brand />
        </button>
        <nav className="hidden items-center gap-8 text-sm text-ink/65 md:flex">
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
              {(["strategies", "about", "contact"] as PublicPage[]).map(
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
          <Button
            onClick={() => {
              onNavigate("home")
              window.setTimeout(
                () => document.getElementById("plans")?.scrollIntoView(),
                50,
              )
            }}
          >
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
  return (
    <footer className="bg-forest py-12 text-white">
      <div className="site-shell flex flex-col gap-9">
        <div className="grid gap-10 border-b border-white/12 pb-10 md:grid-cols-[1fr_auto_auto]">
          <Brand light />
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-xs text-white/55 md:max-w-72">
            <button onClick={() => onNavigate("strategies")}>Strategies</button>
            <button onClick={() => onNavigate("about")}>About</button>
            <button onClick={() => onNavigate("contact")}>Contact</button>
            <a href="mailto:support@acremont.com">Support</a>
          </div>
          <address className="text-xs not-italic leading-6 text-white/50">
            <a className="block text-white/75" href="tel:+442079460821">
              +44 20 7946 0821
            </a>
            18 St James’s Place
            <br />
            London SW1A 1NH
          </address>
        </div>
        <div className="flex flex-col justify-between gap-3 text-[10px] leading-5 text-white/35 sm:flex-row">
          <p>© 2025 Acremont Investments. All rights reserved.</p>
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
  return (
    <section className="bg-[#fafaf7] py-20 lg:py-28" data-reveal>
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
}: {
  onLogin: () => void
  onPlan: (plan: string) => void
  onNavigate: (page: PublicPage) => void
}) {
  const [activeStrategy, setActiveStrategy] = useState(0)
  const strategy = strategyStories[activeStrategy]

  return (
    <div className="min-h-screen bg-[#fafaf7] text-ink">
      <PublicHeader onLogin={onLogin} onNavigate={onNavigate} />

      <main>
        <section className="site-shell grid gap-14 pb-20 pt-20 lg:grid-cols-[1.15fr_.85fr] lg:pb-28 lg:pt-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-forest/15 bg-[#f0f4ef] px-3 py-1.5 text-xs font-medium text-forest">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4f8a67]" />
              Private investments, made clear
            </div>
            <h1 className="max-w-[720px] font-display text-[clamp(3.25rem,6.4vw,6.4rem)] font-medium leading-[0.95] tracking-[-0.065em] text-forest">
              Put your money to work, simply.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink/62">
              Choose a professionally managed plan, track your performance, and
              stay in control from one straightforward account.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                className="min-h-12 px-6"
                onClick={() =>
                  document.getElementById("plans")?.scrollIntoView()
                }
              >
                View investment plans <Icon name="arrow" size={17} />
              </Button>
              <Button
                className="min-h-12 px-6"
                onClick={onLogin}
                variant="secondary"
              >
                Go to dashboard
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs text-ink/50">
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

          <div className="relative min-h-[430px] overflow-hidden bg-forest text-white lg:min-h-[540px]">
            <img
              alt="Acremont team collaborating in a modern office"
              className="absolute inset-0 h-full w-full object-cover"
              src="https://images.unsplash.com/photo-1758518726609-c551f858cd5c?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1400"
            />
            <div className="absolute inset-0 bg-forest/25" />
            <div className="absolute inset-x-5 bottom-5 border border-white/15 bg-forest/90 p-5 backdrop-blur-sm">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">
                    Illustrative portfolio
                  </p>
                  <p className="mt-2 font-display text-3xl tracking-[-0.045em]">
                    $18,426.80
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#b9d8c1]">+8.4%</p>
                  <p className="mt-1 text-[10px] text-white/45">this year</p>
                </div>
              </div>
            </div>
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

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  className={`plan-card ${
                    plan.featured ? "plan-card-featured" : ""
                  }`}
                  key={plan.name}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{plan.name}</p>
                      <p
                        className={`mt-2 text-sm ${
                          plan.featured ? "text-white/55" : "text-ink/50"
                        }`}
                      >
                        {plan.description}
                      </p>
                    </div>
                    {plan.featured && (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mt-9">
                    <span className="font-display text-5xl font-medium tracking-[-0.06em]">
                      {plan.rate}
                    </span>
                    <span
                      className={`ml-2 text-xs ${
                        plan.featured ? "text-white/50" : "text-ink/45"
                      }`}
                    >
                      target p.a.
                    </span>
                  </div>
                  <div
                    className={`mt-8 grid grid-cols-2 border-y py-4 ${
                      plan.featured ? "border-white/15" : "border-line"
                    }`}
                  >
                    <div>
                      <p className="plan-meta">Minimum</p>
                      <p className="mt-1 text-sm font-semibold">
                        {plan.minimum}
                      </p>
                    </div>
                    <div
                      className={`border-l pl-5 ${
                        plan.featured ? "border-white/15" : "border-line"
                      }`}
                    >
                      <p className="plan-meta">Term</p>
                      <p className="mt-1 text-sm font-semibold">{plan.term}</p>
                    </div>
                  </div>
                  <ul className="mt-7 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        className={`flex items-center gap-2.5 text-sm ${
                          plan.featured ? "text-white/68" : "text-ink/62"
                        }`}
                        key={feature}
                      >
                        <Icon name="check" size={16} /> {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-8 w-full justify-between"
                    onClick={() => onPlan(plan.name)}
                    variant={plan.featured ? "secondary" : "primary"}
                  >
                    Select {plan.name} <Icon name="arrow" size={16} />
                  </Button>
                </article>
              ))}
            </div>
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

        <section className="bg-white py-20 lg:py-28">
          <div className="site-shell">
            <div className="mb-10 max-w-xl">
              <p className="section-label">Investor perspectives</p>
              <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] text-forest sm:text-5xl">
                Trusted for the long view.
              </h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {testimonials.map((testimonial, index) => (
                <figure
                  className={`grid min-h-[255px] overflow-hidden ${
                    index === 0 ? "bg-[#edf1ec]" : "bg-[#e9e5dc]"
                  } sm:grid-cols-[160px_1fr]`}
                  key={testimonial.name}
                >
                  <img
                    alt={`${testimonial.name}, Acremont investor`}
                    className="h-48 w-full object-cover object-top grayscale-[25%] sm:h-full"
                    src={testimonial.image}
                  />
                  <figcaption className="flex flex-col justify-between p-6">
                    <blockquote className="font-display text-lg leading-7 tracking-[-0.025em] text-forest">
                      <span className="mr-1 text-forest/30">“</span>
                      {testimonial.quote}
                    </blockquote>
                    <div className="mt-6">
                      <p className="text-sm font-semibold text-forest">
                        {testimonial.name}
                      </p>
                      <p className="mt-1 text-xs text-ink/45">
                        {testimonial.role}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-5 text-[10px] leading-5 text-ink/35">
              Testimonials reflect individual experiences and are not a
              guarantee of future investment results.
            </p>
          </div>
        </section>

        <section className="border-y border-line bg-[#f4f5f1] py-20 lg:py-28">
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
}: {
  children: React.ReactNode
  onLogin: () => void
  onNavigate: (page: PublicPage) => void
}) {
  return (
    <div className="min-h-screen bg-[#fafaf7] text-ink">
      <PublicHeader onLogin={onLogin} onNavigate={onNavigate} />
      <main>{children}</main>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  )
}

function StrategiesPage({
  onLogin,
  onNavigate,
}: {
  onLogin: () => void
  onNavigate: (page: PublicPage) => void
}) {
  return (
    <PublicPageLayout onLogin={onLogin} onNavigate={onNavigate}>
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
}: {
  onLogin: () => void
  onNavigate: (page: PublicPage) => void
}) {
  return (
    <PublicPageLayout onLogin={onLogin} onNavigate={onNavigate}>
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
          <p className="section-label">Our history</p>
          <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] text-forest">
            Built around a better investor relationship.
          </h2>
        </div>
        <div className="space-y-6 text-base leading-8 text-ink/58">
          <p>
            Acremont began in 2011 with a simple observation: private investors
            were often offered either an impersonal digital product or a
            traditional service clouded by complexity. We believed thoughtful
            investment management could be both rigorous and understandable.
          </p>
          <p>
            Our founding partners brought together experience from global asset
            management, private markets, and family offices. They designed a
            firm where investment judgement, transparent communication, and
            client service would sit at the same table.
          </p>
          <p>
            Today, our team serves investors across multiple generations while
            remaining independently owned. The firm has grown, but our measure
            of progress remains unchanged: better decisions, stronger
            relationships, and capital managed with patience.
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-white py-20 lg:py-28">
        <div className="site-shell">
          <p className="section-label">Company timeline</p>
          <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] text-forest sm:text-5xl">
            From conviction to continuity.
          </h2>
          <div className="mt-12 border-t border-line">
            {[
              [
                "2011",
                "Acremont is founded",
                "The partnership opens in London with a focus on aligned, long-term investing.",
              ],
              [
                "2015",
                "Private markets platform",
                "Direct and co-investment capabilities expand access beyond public markets.",
              ],
              [
                "2019",
                "Responsible investment framework",
                "Material environmental and governance analysis becomes formal across every strategy.",
              ],
              [
                "2022",
                "Digital investor experience",
                "A simpler way to invest, monitor portfolios, and speak directly with the team launches.",
              ],
              [
                "Today",
                "Independent and evolving",
                "Eighteen investment professionals serve more than 2,400 investor relationships.",
              ],
            ].map(([year, title, copy]) => (
              <article
                className="grid gap-3 border-b border-line py-7 sm:grid-cols-[100px_.8fr_1.2fr] sm:items-start"
                key={year}
              >
                <p className="font-display text-lg font-semibold text-forest">
                  {year}
                </p>
                <h3 className="font-display text-lg font-semibold text-forest">
                  {title}
                </h3>
                <p className="text-sm leading-6 text-ink/52">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-shell grid gap-10 py-20 lg:grid-cols-3 lg:py-28">
        <div>
          <p className="font-display text-5xl tracking-[-0.05em] text-forest">
            14+
          </p>
          <p className="mt-2 text-sm text-ink/48">Years investing together</p>
        </div>
        <div>
          <p className="font-display text-5xl tracking-[-0.05em] text-forest">
            2,400
          </p>
          <p className="mt-2 text-sm text-ink/48">Investor relationships</p>
        </div>
        <div>
          <p className="font-display text-5xl tracking-[-0.05em] text-forest">
            18
          </p>
          <p className="mt-2 text-sm text-ink/48">Investment professionals</p>
        </div>
      </section>

      <TeamSection onNavigate={onNavigate} />
    </PublicPageLayout>
  )
}

function ContactPage({
  onLogin,
  onNavigate,
}: {
  onLogin: () => void
  onNavigate: (page: PublicPage) => void
}) {
  const [sent, setSent] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    setSent(true)
  }

  return (
    <PublicPageLayout onLogin={onLogin} onNavigate={onNavigate}>
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
                href="mailto:invest@acremont.com"
              >
                invest@acremont.com
              </a>
            </div>
            <div>
              <p className="plan-meta">Existing investors</p>
              <a
                className="mt-2 block font-semibold text-forest"
                href="mailto:support@acremont.com"
              >
                support@acremont.com
              </a>
            </div>
            <div>
              <p className="plan-meta">Telephone</p>
              <a
                className="mt-2 block font-semibold text-forest"
                href="tel:+442079460821"
              >
                +44 20 7946 0821
              </a>
              <p className="mt-1 text-xs text-ink/45">Monday–Friday, 8am–6pm</p>
            </div>
            <div>
              <p className="plan-meta">London office</p>
              <address className="mt-2 text-sm not-italic leading-6 text-forest">
                18 St James’s Place
                <br />
                London SW1A 1NH
                <br />
                United Kingdom
              </address>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 sm:p-9">
          {sent ? (
            <div className="flex min-h-[460px] flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e3f2e6] text-[#34704a]">
                <Icon name="check" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-semibold text-forest">
                Thank you for reaching out.
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-ink/50">
                Your enquiry has been recorded in demo mode. Connect Supabase to
                deliver submissions to the support team.
              </p>
              <Button
                className="mt-6"
                onClick={() => setSent(false)}
                variant="secondary"
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="dashboard-title">Send an enquiry</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="field-label">
                  First name
                  <input className="field-input mt-2" required />
                </label>
                <label className="field-label">
                  Last name
                  <input className="field-input mt-2" required />
                </label>
                <label className="field-label sm:col-span-2">
                  Email address
                  <input className="field-input mt-2" required type="email" />
                </label>
                <label className="field-label sm:col-span-2">
                  I would like to discuss
                  <select className="field-input mt-2">
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
                    required
                  />
                </label>
              </div>
              <Button className="mt-6" type="submit">
                Send enquiry <Icon name="arrow" size={16} />
              </Button>
            </form>
          )}
        </div>
      </section>
    </PublicPageLayout>
  )
}

const navItems: { label: string page: DashboardPage icon: IconName }[] = [
  { label: "Overview", page: "overview", icon: "home" },
  { label: "Invest", page: "invest", icon: "invest" },
  { label: "Withdraw", page: "withdraw", icon: "withdraw" },
  { label: "Support", page: "support", icon: "support" },
  { label: "Settings", page: "settings", icon: "settings" },
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

function OverviewPage({ setPage }: { setPage: (page: DashboardPage) => void }) {
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-ink/50">Good morning,</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.04em] text-forest sm:text-4xl">
            Welcome back, Jordan.
          </h1>
        </div>
        <Button onClick={() => setPage("invest")}>
          Make an investment <Icon name="arrow" size={16} />
        </Button>
      </div>

      <section className="rounded-2xl bg-forest p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <p className="text-sm text-white/55">Total portfolio value</p>
            <p className="mt-2 font-display text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
              $18,426.80
            </p>
            <p className="mt-3 text-xs font-medium text-[#a6d5af]">
              +$1,426.80 all time · 8.4%
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
        <div className="mt-10 flex h-20 items-end gap-1.5">
          {[35, 31, 40, 44, 41, 53, 59, 57, 64, 68, 72, 83, 80, 91, 96].map(
            (height, index) => (
              <span
                className="flex-1 rounded-t-sm bg-white/15 last:bg-[#a6d5af]"
                key={index}
                style={{ height: `${height}%` }}
              />
            ),
          )}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <section className="dashboard-card">
          <div className="flex items-center justify-between">
            <h2 className="dashboard-title">Active investment</h2>
            <span className="status-pill">On track</span>
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="metric-label">Growth plan</p>
              <p className="metric-value">$15,000.00</p>
            </div>
            <div>
              <p className="metric-label">Target return</p>
              <p className="metric-value">9.2% p.a.</p>
            </div>
            <div>
              <p className="metric-label">Matures</p>
              <p className="metric-value">02 May 2027</p>
            </div>
          </div>
          <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-[#e7ebe7]">
            <div className="h-full w-[18%] rounded-full bg-forest" />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-ink/42">
            <span>4 months complete</span>
            <span>24 months</span>
          </div>
          <button
            className="mt-6 flex items-center gap-2 text-xs font-semibold text-forest"
            onClick={() => setPage("invest")}
          >
            View investment <Icon name="arrow" size={15} />
          </button>
        </section>
        <section className="dashboard-card">
          <h2 className="dashboard-title">Available balance</h2>
          <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-forest">
            $3,426.80
          </p>
          <p className="mt-1 text-xs text-ink/45">
            Ready to invest or withdraw
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
          <button className="text-xs font-semibold text-forest">
            View all
          </button>
        </div>
        <div className="mt-5 divide-y divide-line">
          {activity.map((item) => (
            <div className="flex items-center gap-4 py-4" key={item.title}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf1ec] text-forest">
                <Icon
                  name={item.type === "Deposit" ? "wallet" : "chart"}
                  size={17}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] text-ink/42">
                  {item.date} · {item.type}
                </p>
              </div>
              <p
                className={`text-sm font-semibold ${
                  item.value.startsWith("+") ? "text-[#34704a]" : "text-ink"
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function InvestPage({
  notify,
  initialPlan,
}: {
  notify: (message: string) => void
  initialPlan: string
}) {
  const [selected, setSelected] = useState(initialPlan)
  function submit(event: FormEvent) {
    event.preventDefault()
    notify("Investment request created in demo mode.")
  }
  return (
    <>
      <PageHeader
        eyebrow="Invest"
        title="Choose your next investment."
        copy="Compare plans and confirm an amount. No funds will move while the app is in demo mode."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <button
            className={`select-plan ${
              selected === plan.name ? "select-plan-active" : ""
            }`}
            key={plan.name}
            onClick={() => setSelected(plan.name)}
          >
            <span className="flex items-center justify-between">
              <span className="font-semibold">{plan.name}</span>
              {selected === plan.name && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest text-white">
                  <Icon name="check" size={13} />
                </span>
              )}
            </span>
            <span className="mt-7 block font-display text-3xl font-semibold tracking-[-0.05em]">
              {plan.rate}
            </span>
            <span className="mt-1 block text-xs text-ink/45">
              {plan.term} · min. {plan.minimum}
            </span>
          </button>
        ))}
      </div>
      <form className="dashboard-card mt-5 max-w-2xl" onSubmit={submit}>
        <h2 className="dashboard-title">Investment details</h2>
        <label className="field-label mt-6" htmlFor="amount">
          Amount to invest
        </label>
        <div className="input-prefix mt-2">
          <span>$</span>
          <input
            id="amount"
            min="1000"
            placeholder="5,000.00"
            required
            type="number"
          />
        </div>
        <div className="mt-4 flex justify-between rounded-xl bg-[#f2f4f0] p-4 text-xs">
          <span className="text-ink/50">Selected plan</span>
          <strong className="text-forest">{selected}</strong>
        </div>
        <Button className="mt-6 w-full" type="submit">
          Review investment <Icon name="arrow" size={16} />
        </Button>
      </form>
    </>
  )
}

function WithdrawPage({ notify }: { notify: (message: string) => void }) {
  function submit(event: FormEvent) {
    event.preventDefault()
    notify("Withdrawal request created in demo mode.")
  }
  return (
    <>
      <PageHeader
        eyebrow="Withdraw"
        title="Withdraw your available funds."
        copy="Requests are typically reviewed within one business day and sent to your saved bank account."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
        <form className="dashboard-card" onSubmit={submit}>
          <label className="field-label" htmlFor="withdraw-amount">
            Withdrawal amount
          </label>
          <div className="input-prefix mt-2">
            <span>$</span>
            <input
              id="withdraw-amount"
              max="3426.8"
              min="50"
              placeholder="0.00"
              required
              type="number"
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink/45">
            <span>Minimum $50.00</span>
            <button className="font-semibold text-forest" type="button">
              Withdraw all
            </button>
          </div>
          <label className="field-label mt-6" htmlFor="bank">
            Send to
          </label>
          <select className="field-input mt-2" id="bank">
            <option>Chase Bank ···· 4821</option>
          </select>
          <Button className="mt-7 w-full" type="submit">
            Request withdrawal <Icon name="arrow" size={16} />
          </Button>
        </form>
        <div className="dashboard-card self-start bg-[#edf1ec]">
          <p className="metric-label">Available to withdraw</p>
          <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.05em] text-forest">
            $3,426.80
          </p>
          <div className="mt-6 border-t border-forest/10 pt-5 text-xs leading-6 text-ink/52">
            <p>There is no withdrawal fee.</p>
            <p>Estimated arrival: 2–3 business days.</p>
          </div>
        </div>
      </div>
    </>
  )
}

function SupportPage({ notify }: { notify: (message: string) => void }) {
  function submit(event: FormEvent) {
    event.preventDefault()
    notify("Your support request has been saved in demo mode.")
  }
  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="How can we help?"
        copy="Send us a message and a member of our investor support team will respond."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
        <form className="dashboard-card" onSubmit={submit}>
          <label className="field-label" htmlFor="topic">
            What do you need help with?
          </label>
          <select className="field-input mt-2" id="topic">
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
            placeholder="Tell us how we can help…"
            required
          />
          <Button className="mt-6" type="submit">
            Send message <Icon name="arrow" size={16} />
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
              href="mailto:support@acremont.com"
            >
              support@acremont.com
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

function SettingsPage({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState<"profile" | "payment">("profile")
  function submit(event: FormEvent) {
    event.preventDefault()
    notify(
      `${
        tab === "profile" ? "Profile" : "Payment"
      } settings saved in demo mode.`,
    )
  }
  return (
    <>
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
      </div>
      <form className="dashboard-card max-w-2xl" onSubmit={submit}>
        {tab === "profile" ? (
          <>
            <div className="flex items-center gap-4 border-b border-line pb-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white">
                JD
              </span>
              <div>
                <p className="text-sm font-semibold">Jordan Davis</p>
                <p className="text-xs text-ink/45">Verified investor</p>
              </div>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="field-label">
                First name
                <input className="field-input mt-2" defaultValue="Jordan" />
              </label>
              <label className="field-label">
                Last name
                <input className="field-input mt-2" defaultValue="Davis" />
              </label>
              <label className="field-label sm:col-span-2">
                Email address
                <input
                  className="field-input mt-2"
                  defaultValue="jordan@example.com"
                  type="email"
                />
              </label>
              <label className="field-label sm:col-span-2">
                Phone number
                <input
                  className="field-input mt-2"
                  defaultValue="+1 (212) 555-0148"
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <h2 className="dashboard-title">Saved bank account</h2>
            <div className="mt-5 flex items-center gap-4 rounded-xl border border-line p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf1ec] text-forest">
                <Icon name="wallet" size={18} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Chase Bank</p>
                <p className="text-xs text-ink/45">Checking ···· 4821</p>
              </div>
              <span className="status-pill">Primary</span>
            </div>
            <button
              className="mt-4 text-xs font-semibold text-forest"
              type="button"
            >
              + Add another bank account
            </button>
          </>
        )}
        <Button className="mt-7" type="submit">
          Save changes
        </Button>
      </form>
    </>
  )
}

function Dashboard({
  onExit,
  initialPage,
  initialPlan,
}: {
  onExit: () => void
  initialPage: DashboardPage
  initialPlan: string
}) {
  const [page, setPage] = useState<DashboardPage>(initialPage)
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState("")

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(""), 3200)
  }

  return (
    <div className="min-h-screen bg-[#f4f5f1] text-ink">
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
          {navItems.map((item) => (
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
                Jordan Davis
              </p>
              <p className="truncate text-[10px] text-white/40">
                jordan@example.com
              </p>
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
              Demo account
            </span>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-xs font-semibold text-white">
              JD
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1180px] p-5 sm:p-8 lg:p-10">
          {page === "overview" && <OverviewPage setPage={setPage} />}
          {page === "invest" && (
            <InvestPage initialPlan={initialPlan} notify={notify} />
          )}
          {page === "withdraw" && <WithdrawPage notify={notify} />}
          {page === "support" && <SupportPage notify={notify} />}
          {page === "settings" && <SettingsPage notify={notify} />}
        </main>
      </div>

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
  plan,
}: {
  onClose: () => void
  onContinue: () => void
  plan?: string
}) {
  function submit(event: FormEvent) {
    event.preventDefault()
    onContinue()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c211c]/60 p-4 backdrop-blur-[2px]">
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
          {plan ? "Create your account." : "Welcome back."}
        </h2>
        <p className="mt-2 text-sm text-ink/50">
          {plan
            ? `Continue with the ${plan} plan you selected.`
            : "Sign in to manage your investments."}
        </p>
        <form className="mt-7" onSubmit={submit}>
          {plan && (
            <label className="field-label mb-5">
              Full name
              <input
                className="field-input mt-2"
                placeholder="Your full name"
                required
              />
            </label>
          )}
          <label className="field-label">
            Email address
            <input
              className="field-input mt-2"
              defaultValue="jordan@example.com"
              required
              type="email"
            />
          </label>
          <label className="field-label mt-5">
            Password
            <input
              className="field-input mt-2"
              defaultValue="demopassword"
              minLength={6}
              required
              type="password"
            />
          </label>
          {!plan && (
            <div className="mt-4 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-ink/55">
                <input type="checkbox" /> Remember me
              </label>
              <button className="font-semibold text-forest" type="button">
                Forgot password?
              </button>
            </div>
          )}
          <Button className="mt-7 w-full" type="submit">
            {plan ? "Create account & continue" : "Sign in to demo"}{" "}
            <Icon name="arrow" size={16} />
          </Button>
        </form>
        <p className="mt-5 text-center text-[11px] leading-5 text-ink/40">
          Demo mode uses sample data and does not submit credentials.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<View>("home")
  const [showLogin, setShowLogin] = useState(false)
  const [initialPage, setInitialPage] = useState<DashboardPage>("overview")
  const [selectedPlan, setSelectedPlan] = useState("Growth")

  useEffect(() => {
    let observer: IntersectionObserver | undefined
    const frame = window.requestAnimationFrame(() => {
      const sections = document.querySelectorAll("main section")
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("reveal-visible")
              observer.unobserve(entry.target)
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
  }, [view])

  function enterDashboard(page: DashboardPage = "overview") {
    setInitialPage(page)
    setShowLogin(false)
    setView("dashboard")
    window.scrollTo(0, 0)
  }

  function openLogin() {
    setInitialPage("overview")
    setShowLogin(true)
  }

  if (view === "dashboard") {
    return (
      <Dashboard
        initialPage={initialPage}
        initialPlan={selectedPlan}
        onExit={() => setView("home")}
      />
    )
  }

  const navigatePublic = (page: PublicPage) => {
    setView(page)
    window.scrollTo(0, 0)
  }

  if (view === "strategies") {
    return (
      <>
        <StrategiesPage onLogin={openLogin} onNavigate={navigatePublic} />
        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onContinue={() => enterDashboard(initialPage)}
          />
        )}
      </>
    )
  }

  if (view === "about") {
    return (
      <>
        <AboutPage onLogin={openLogin} onNavigate={navigatePublic} />
        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onContinue={() => enterDashboard(initialPage)}
          />
        )}
      </>
    )
  }

  if (view === "contact") {
    return (
      <>
        <ContactPage onLogin={openLogin} onNavigate={navigatePublic} />
        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onContinue={() => enterDashboard(initialPage)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <PublicHome
        onLogin={openLogin}
        onNavigate={navigatePublic}
        onPlan={(plan) => {
          setInitialPage("invest")
          setSelectedPlan(plan)
          setShowLogin(true)
        }}
      />
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onContinue={() => enterDashboard(initialPage)}
          plan={initialPage === "invest" ? selectedPlan : undefined}
        />
      )}
    </>
  )
}
