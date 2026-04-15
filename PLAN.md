# OG Recipes — Implementation Plan

Personal cooking + weight-loss app. Next.js 15 (App Router) + Prisma + SQLite + Claude API.
Each step below is a runnable increment: the app works at the end of every step.

---

## Step 0 — Foundations

Already have Next.js scaffold. Add the plumbing.

- Install: `prisma`, `@prisma/client`, `@anthropic-ai/sdk`, `zod`.
- `prisma init --datasource-provider sqlite` → `prisma/schema.prisma`, `dev.db`.
- `.env.local`: `ANTHROPIC_API_KEY`, `DATABASE_URL="file:./dev.db"`.
- `lib/db.ts` (Prisma singleton), `lib/anthropic.ts` (SDK client + shared `callClaude` wrapper with prompt caching on system prompt).
- Root layout: nav shell with tabs (Home · Plan · Cook · Water · History · Profile). Tailwind already in place.

**Done when:** `npm run dev` loads a styled shell, DB file exists, Claude client can be imported.

---

## Step 1 — Profile & macro targets

Smallest useful feature, no AI yet.

- `Profile` model: `heightCm`, `weightKg`, `age`, `sex`, `activityLevel`, `goal` (`cut`), `kcalTarget`, `proteinG`, `carbG`, `fatG`, `waterMlTarget`.
- `/profile` page: form → compute BMR (Mifflin-St Jeor) × activity × cut deficit → macro split (e.g., 2g/kg protein, 25% fat, rest carbs). Save as singleton row.
- Show computed targets on home dashboard.

**Done when:** you enter stats once, see your daily kcal/macros + water target everywhere.

---

## Step 2 — Water tracker

Self-contained, fast win. Wire up the habit loop early.

- `WaterEntry` model: `date`, `ml`, `createdAt`.
- `/water` page: progress ring vs `waterMlTarget`, quick-add buttons (250/500/750 ml), undo last, daily reset at midnight local.
- Home dashboard widget: today's ring + one-tap +250.

**Done when:** you can log water daily and see streaks/history for the last 14 days.

---

## Step 3 — Recipe model + manual entry

Ground truth before AI generation.

- Models: `Recipe` (title, cuisine, portions, kcalPerPortion, proteinG, carbG, fatG, steps JSON, techniques String[], ingredients JSON, batchStorageDays).
- `/recipes` list + `/recipes/new` form (manual). `/recipes/[id]` detail: ingredients, steps, macros, technique chips.
- Seed 2–3 Levantine/Mediterranean recipes so the rest of the app has data to work with.

**Done when:** you can browse and view recipes with macros and technique tags.

---

## Step 4 — Claude: generate recipe

First AI call. Narrow surface.

- Server route `POST /api/recipes/generate` → Claude returns strict JSON recipe (zod-validated). Prompt caching on system prompt (role + constraints + JSON schema).
- `/recipes/new` gets an "Generate with Claude" mode: prompt + dietary constraints → preview → save.
- Techniques tagged by Claude; stored as-is.

**Done when:** you can ask Claude for "high-protein chicken shawarma bowl, 4 portions" and save the result.

---

## Step 5 — Weekly meal plan

The core workflow.

- Models: `MealPlan` (weekStart), `PlannedMeal` (planId, day 0–6, slot `lunch|dinner`, recipeId, portionsFromBatch), `CookSession` (date, recipeId, portionsMade).
- `/plan` page: week grid (7 days × 2 slots). "Generate week" → `POST /api/plan/generate` calls Claude with: profile targets, cook days (default Mon/Wed/Fri), last 14 days of meals (avoid repeats), cuisine mix, beginner-friendly. Claude returns 3 batch recipes + assignment grid (which meal → which batch → which day).
- Edit: swap a slot, regenerate one recipe, lock a slot before regen.

**Done when:** one click produces a full week of meals respecting cook cadence, and macros roll up per day.

---

## Step 6 — Shopping list

Derived, no new AI call.

- `/plan/[id]/shopping` page: consolidate ingredients from the week's 3 batch recipes, sum quantities, group by aisle (produce / protein / pantry / dairy / spice). Check-off state persists (`ShoppingItemState` keyed by plan).

**Done when:** before cook day you get a grouped, checkable list.

---

## Step 7 — Technique tracking & progression

Skill graph on top of existing tags.

- `Technique` table (name, description, difficulty 1–5), `TechniqueLog` (technique, cookSessionId, date).
- `/techniques` page: list of techniques you've practiced, count, last used, "Explain" → Claude explainer (cached).
- Plan generator gains a `weekFocus` input (pick a technique to emphasize); Claude prioritizes recipes that use it.

**Done when:** you can see which skills you've practiced and steer next week toward a chosen one.

---

## Step 8 — Polish pass

- Home dashboard: today's meals, macros progress, water ring, next cook day, current technique focus.
- History view: calendar heatmap of cook sessions + macro adherence.
- Export: one-click DB backup to `/backups/og-recipes-YYYY-MM-DD.db`.
- Mobile layout tightening (you'll use this in the kitchen).

**Done when:** the home screen tells you everything you need at a glance and the app feels good on a phone.

---

## Cross-cutting conventions

- **Claude calls:** always server-side, always zod-validated JSON output, always prompt-cache the system prompt. Use `claude-opus-4-6` (`planner`) for weekly plan generation; `claude-sonnet-4-6` (`smart`) for recipe generation and reflection; `claude-haiku-4-5-20251001` (`fast`) for cheap/fast calls (step tips, tag explainers, substitutions).
- **State:** server components + server actions by default; client components only for interactive widgets (timers, forms, rings).
- **No auth, no multi-user.** Single profile row. Local SQLite. Back up the file.
- **Time:** store dates as ISO strings in UTC; render in local tz.

## Open inputs before Step 1

- Height, weight, age, sex, activity level.
- Daily water target (default 3000 ml).
- Allergies / strong dislikes.
- Preferred cook days (default Mon / Wed / Fri).
