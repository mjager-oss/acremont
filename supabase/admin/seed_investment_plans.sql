insert into public.investment_plans (
  slug,
  name,
  annual_rate_percent,
  term_months,
  minimum_amount,
  currency,
  description,
  features,
  enabled
)
values
  (
    'foundation',
    'Foundation',
    6.5,
    12,
    1000,
    'USD',
    'A measured entry point designed for capital stability.',
    array['Quarterly distributions', '12-month maturity', 'Low volatility'],
    true
  ),
  (
    'growth',
    'Growth',
    9.2,
    24,
    5000,
    'USD',
    'Balanced private-market exposure for long-term growth.',
    array['Monthly reporting', 'Diversified allocation', 'Priority support'],
    true
  ),
  (
    'strategic',
    'Strategic',
    12.4,
    36,
    25000,
    'USD',
    'Our highest-conviction strategy for experienced investors.',
    array['Bespoke allocation', 'Advisor access', 'Quarterly review'],
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  annual_rate_percent = excluded.annual_rate_percent,
  term_months = excluded.term_months,
  minimum_amount = excluded.minimum_amount,
  currency = excluded.currency,
  description = excluded.description,
  features = excluded.features,
  enabled = excluded.enabled,
  updated_at = now();
