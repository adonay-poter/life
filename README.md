# Heritage: Personal Life Dashboard

A personal dashboard designed with architectural minimalism and journalistic gravitas. Heritage uses a warm, high-contrast palette reminiscent of classic broadsheet newspapers and matte art galleries—deep ink text on a warm limestone background with a single intentional accent color (`#B8422E`) for driving focus and interactions.

## Key Features

- 📥 **Inbox**: Capture raw thoughts, links, and quick tasks instantly.
- 📋 **Projects & Tasks**: Complete separation of project management (clients, deadlines, goals) and task execution (Kanban board, calendar view, and today's focus).
- ⚡ **Habits**: Tracker for establishing daily habits with streaks.
- 📝 **Journal**: A clean, distraction-free space for daily reflection and logs.
- 🎓 **Academy**: Personal learning resource tracking and skill development library.
- 🔗 **Supabase Integration**: Fully backed by a Supabase database for persistent data storage.
- 🧭 **Soul Blueprint**: Compact AI context snapshots generated from recent activity. These snapshots orient assistants without replacing the underlying Supabase records.

## Design System

Designed around the **Heritage** style guide:
- **Primary Text (`#1A1C1E`)**: Deep charcoal/ink for editorial headlines.
- **Background (`#F7F5F2`)**: Warm limestone/off-white matte texture.
- **Secondary (`#6C7278`)**: Muted slate for borders, metadata, and structural lines.
- **Tertiary (`#B8422E`)**: Crimson accent. Used selectively to highlight single calls-to-action per view.
- **Typography**: Editorial serif headings combined with highly readable sans-serif body text.

---

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or another package manager (Yarn, pnpm, Bun)
- A Supabase Project (for database storage)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adonay-poter/life.git
   cd life
   ```

2. **Configure Environment Variables:**
   Copy the example environment file and fill in your Supabase connection parameters:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (for optional AI research/tagging utilities)
   - `EXA_API_KEY` (optional, improves research search quality)
   - `PUSHOVER_USER_KEY`, `PUSHOVER_API_TOKEN`, and `DASHBOARD_URL` (if deploying the Pushover cron function)
   - `SOUL_BLUEPRINT_CRON_SECRET` (if deploying the Soul Blueprint scheduled function)

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to view your dashboard.

---

## Deployment

The easiest way to deploy this dashboard is through the **[Vercel Platform](https://vercel.com/new)**.

### Deploying to Vercel

1. Link your GitHub repository to Vercel.
2. In the Vercel Project Settings, add the following Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `EXA_API_KEY` (optional)
3. Click **Deploy**. Vercel will automatically build and deploy the Next.js app on every push to your `main` branch.

### GitHub Actions (CI)

A CI workflow is configured under `.github/workflows/ci.yml` that automatically runs build and lint checks on every push or pull request to the `main` branch to guarantee codebase stability.

## Soul Blueprint Notes

`Soul Blueprint` is a generated AI context layer, not the source of truth. Recent activity is tracked in `activity_events`, compact snapshots are stored in `soul_blueprint_snapshots`, and assistants should treat those snapshots as orientation before doing targeted retrieval from the main Supabase tables.

If you want scheduled regeneration in Supabase Cron, set Vault secrets named `project_url` and `soul_blueprint_cron_secret`, set the Edge Function env var `SOUL_BLUEPRINT_CRON_SECRET`, and deploy `supabase/functions/generate-soul-blueprint`.
