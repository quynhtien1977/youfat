<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## HARD RULES

- **NEVER run `git commit` or `git push`.** The user manages all commits and pushes manually. Do not suggest or execute these commands under any circumstances.
- **CodeGraph:** A `.codegraph/` directory exists at repo root. Use `codegraph_explore` MCP tool (or `codegraph explore "<query>"`) BEFORE grep/find when you need to understand or locate code. If `.codegraph/` is missing, skip CodeGraph entirely. After significant code changes, run `codegraph sync` to keep the index up to date.

## Overview

IELTS Cambridge 10-20 practice web app. Students pick a test, do Reading/Listening/Writing, get auto-graded results with IELTS Band Score conversion.

**Stack:** Next.js 16.3 (App Router, Turbopack) | React 19 | TypeScript 5 | Tailwind CSS 4 | Supabase (PostgreSQL) | Cloudflare R2 (audio CDN) | Lucide React (icons)

**Companion repo:** `Cambridge_ielts_10-20_youpass_clone` - crawler pipeline that populates the database. This repo is frontend only.

## UI Design Direction

**Clone the YouPass UI as closely as possible.** Reference site: https://youpass.vn/luyen-thi

Key UI patterns to replicate from YouPass:
- **Test listing page:** Grid/card layout grouped by Cambridge book (10-20), with skill tabs (Reading / Listening / Writing)
- **Reading practice:** Split-view layout - passage text on the left, question panel on the right, both independently scrollable
- **Listening practice:** Audio player bar at the top with play/pause/seek controls, questions below
- **Question types:** Render each type faithfully (fill-in-blank inline, T/F/NG radio groups, MCQ checkboxes, matching dropdowns, summary completion with word bank)
- **Results/review page:** Score summary with band conversion, per-question breakdown showing correct/incorrect with explanations
- **Overall feel:** Clean, minimal, educational - white/light background, clear typography, colored accents for navigation and skill badges

When unsure about a UI detail, open YouPass in the browser to check the real implementation rather than guessing.

## Setup & Commands

```bash
cp .env.example .env.local   # fill in real keys
npm install
npm run dev                   # http://localhost:3000 (Turbopack)
npm run build                 # production build
npm run lint                  # eslint (next/core-web-vitals + next/typescript)
codegraph sync                # re-index after significant code changes
```

No test runner configured yet.

## Code Conventions

- **Path alias:** `@/*` maps to `./src/*`
- **Fonts:** Geist Sans + Geist Mono loaded in layout.tsx via `next/font/google`
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"` in globals.css, PostCSS plugin). Dark mode via `prefers-color-scheme`. CSS variables for `--background` / `--foreground`.
- **Types:** All DB models in `src/types/database.ts`. Use these types everywhere, not inline.
- **Supabase clients:** `src/lib/supabase.ts` exports two things:
  - `supabase` - anon client, safe for Client Components
  - `getServiceSupabase()` - service-role client, **Server Components / Server Actions / Route Handlers only**
- **File naming:** kebab-case for files, PascalCase for React components

## Architecture Notes

### Directory structure
```
src/
  app/           # Next.js App Router pages and layouts
    globals.css  # Tailwind + CSS variables
    layout.tsx   # Root layout (Geist fonts, metadata)
    page.tsx     # Home page (currently default Next.js template)
  lib/
    supabase.ts      # Supabase client (anon + service-role)
    gradingEngine.ts # Auto-grading logic for Reading and Listening
  types/
    database.ts      # TypeScript interfaces mirroring Supabase tables
```

### Database (Supabase PostgreSQL)

5 content tables + 1 submissions table. All PKs are UUID. RLS enabled with public SELECT on content tables.

| Table           | Rows   | Purpose                                       |
|-----------------|--------|-----------------------------------------------|
| tests           | 44     | Cambridge 10-20, 4 tests each (book + test_number) |
| sections        | 307    | Reading passages (3/test) + Listening sections (4/test) |
| questions       | 3,404  | All question items, keyed by section_id       |
| options         | 10,072 | Multiple-choice option texts (A/B/C/D...)     |
| writing_tasks   | 76     | Writing Task 1 and Task 2 prompts + sample essays |
| user_submissions| -      | Student answers + scores (insert-only for anon) |

### Grading engine (`src/lib/gradingEngine.ts`)

| answer_mode | Meaning | Grading rule |
|-------------|---------|--------------|
| `single`  | One correct answer (T/F, MCQ-one, matching) | Exact match (case-insensitive) |
| `any_of`  | Synonyms accepted (short answer, fill-blank) | Match any element in answer[] after normalization |
| `all_of`  | Must select all (MCQ-many) | User set must equal target set exactly |

`calculateBandScore(correct, skill)` converts raw score (0-40) to IELTS Band (2.0-9.0).

### Data flow (planned)

1. Homepage lists 44 tests grouped by book (Cam 10-20)
2. Student picks skill + test then fetch sections + questions from Supabase
3. **Practice mode:** answers loaded with questions (client-side grading)
4. **Exam mode (future):** Server Action grades server-side (answers never sent to client)
5. Audio from R2 CDN: `NEXT_PUBLIC_R2_AUDIO_BASE_URL/audio/c{book}_t{test}_s{section}.mp3`

## Gotchas / Constraints

- **answer field is `string[]`** not a single string. Even single-answer questions store `["A"]`. Always treat as array.
- **answer_mode is explicit** in the DB. Do NOT infer grading logic from question type. Always use `answer_mode`.
- **`questions.answer` contains correct answers.** In exam mode, strip before sending to client.
- **Audio URL pattern is fixed:** `{R2_BASE}/audio/c{book}_t{test}_s{section}.mp3`. `sections.audio_url` already has the full URL.
- **Supabase RLS:** Content tables allow public SELECT. `user_submissions` allows public INSERT but SELECT only own rows.
- **No auth yet.** `user_id` is nullable.
- **Data is read-only** from this app. Do not write migration scripts here.
- **Writing grading is NOT automated yet.** Will need LLM API via Server Action later.
- **Tailwind v4:** Uses `@import "tailwindcss"` and `@theme inline`. Do NOT create `tailwind.config.js`.
- **`AGENTS.md`** first block is auto-regenerated by `next dev`. Keep custom content below `END:nextjs-agent-rules`.

## Environment Variables

| Variable | Where used | Required |
|----------|-----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes (for exam grading) |
| `NEXT_PUBLIC_R2_AUDIO_BASE_URL` | Client | Yes (audio playback) |

**Never** put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable or import it in Client Components.

## Git Conventions

- **Agent must NOT run `git commit` or `git push`. User handles all git operations.**
- Commit messages (for user reference): `type: short description` (e.g. `feat: add reading split-view`)
