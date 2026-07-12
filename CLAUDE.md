@AGENTS.md

# og-recipes

Private meal-planning and health-tracking app **for my family only** — never add
public-facing features, analytics, or third-party sign-in. It is multi-user:
each family member has their own account (username + password) with their own
profile, targets, recipes, plans, and tracking data.

## Rules

- Every personal query MUST be scoped to the session user: get `userId` via
  `requireUserId()` from `lib/auth.ts` and filter/insert with it. Recipes,
  plans, tracking, and Claude-memory are all per-user. Never operate on a
  client-supplied id without checking ownership.
- All health calculations must handle both sexes — sex-specific formulas and
  target bands live in `lib/macros.ts` and `lib/bodyComp.ts`; extend those
  rather than hardcoding male values. Body-fat bands are additionally
  age-adjusted (Gallagher 2000, `bfTarget(sex, age)`) — always pass the age.
  BMR is reduced 10% when `profile.thyroidReduced` is set (thyroidectomy /
  treated hypothyroidism) — pass `thyroidReduced` to every `computeMacros` call.
- UI text is German (informal "du").
- Auth is username + password only: scrypt hashes (`lib/password.ts`), HMAC
  session cookie (`lib/auth-core.ts`). Do not add email, OAuth, magic links,
  or shared passwords.

## Design system — read before writing UI

This project has an LLM-readable design system. Before writing or modifying ANY
UI code:

1. **Read the relevant spec** — the component file under
   `specs/{atoms,molecules,organisms}/`, and the Storybook docs pages:
   foundations in `stories/foundations/*.mdx` (Color, Typography, Spacing &
   Layout, Shape/Elevation/Motion), layout conventions in
   `stories/patterns/PageLayout.mdx`, and the value lookup in
   `stories/tokens/TokenReference.mdx`.
2. **Use only semantic token utilities** from `app/tokens.css` (`bg-surface`,
   `text-ink-muted`, `border-line`, `bg-accent`, `rounded-card`, …). Never write
   a raw palette utility (`bg-slate-100`, `text-teal-600`), a hex/rgb/hsl
   value, or a `dark:` variant for a color — dark mode is resolved inside the
   token layer. If no token fits, add one to `app/tokens.css` **and**
   `stories/tokens/TokenReference.mdx` — do not inline a raw value.
3. **Respect "when to use / when NOT to use"** in each component spec. Don't
   invent a new component or recipe when an existing spec covers the case.
4. The token audit (`node scripts/token-audit.mjs`) is run manually by the
   user from time to time — do NOT run it automatically before commits. Its
   output names the exact token to use when it flags something.
5. When a component changes, update its spec file in the same change.

Source code shows what was built; the specs describe how to build the next
thing. Follow the specs, not your priors.

## Commands

- `npm run dev` — dev server
- `npm run lint` — ESLint
- `npm run build` — runs `prisma migrate deploy`, then builds
- `npm run db:generate` — regenerate Prisma client after schema changes

## Database — be careful

- There is ONE Neon Postgres for local dev AND the deployed Vercel app;
  `.env.local` points at live family data. Anything you run locally
  (`prisma migrate deploy`, `prisma db execute`) hits production immediately.
- Migrations must stay backward compatible with the currently deployed code
  (e.g. new NOT NULL columns need a DB default — see the `userId DEFAULT 1`
  pattern in `prisma/migrations/`).
- `prisma migrate dev` fails here (non-interactive terminal). Instead:
  1. `mkdir prisma/migrations/$(date -u +%Y%m%d%H%M%S)_<name>`
  2. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > <that dir>/migration.sql`
  3. Review/edit the SQL (add data backfills), then `npx prisma migrate deploy`
