# Acremont Next.js application

Next.js App Router, React, TypeScript and Tailwind CSS v4 project.

## Development

- Run `pnpm dev` for the local development server.
- Run `pnpm build` to create the production build and `pnpm start` to serve it.
- Use `app/` for server rendered routes, metadata, sitemap and robots configuration.
- The interactive account and marketing experience is in `src/app-client.tsx`.
- Shared controls are in `src/components/`; Supabase browser and server clients are in `src/lib/`.

## Styling

`app/layout.tsx` loads the local optimized fonts and `app/globals.css`. Tailwind CSS v4 is configured with `@tailwindcss/postcss` in `postcss.config.mjs`.

## Supabase

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL`. The anon key is public by design; never put the service role key in a `NEXT_PUBLIC_` variable.

Use double quotes for strings containing apostrophes, keep JSX balanced, and export route components as default exports.
