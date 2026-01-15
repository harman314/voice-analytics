# Voice Analytics Module

A standalone Next.js dashboard for analyzing TapHealth AI voice coaching calls.

## Features

- **Daily Dashboard**: View call metrics for any date with filtering by call type (Welcome/Daily)
- **Call Browser**: Browse all calls with pagination and filtering
- **Transcript Viewer**: Full transcript with lag highlighting
  - Color-coded messages based on latency thresholds
  - Visual indicators for high latency events
  - Function call and handoff visualization
- **Lag Analysis**: Track latency issues and dropoffs
  - Daily breakdown of high latency events
  - Dropoff detection (short calls with few turns)
  - Historical trend analysis
- **Internal Users Filter**: Exclude test/internal users from analytics
  - Configurable list via Settings page
  - Stored in localStorage

## Data Source

Uses ClickHouse table `analytics.voice_call_analytics` with the following key fields:
- `call_id`, `user_id`: Call identification
- `is_new_user`: `true` = Welcome call, `false` = Daily call
- `duration_seconds`, `total_turns`: Call metrics
- `transcript`: JSON with full conversation and latency metrics
- `actions`: Meals logged during the call

## Lag Thresholds

Configured in `src/lib/clickhouse.ts`:
- E2E Latency: > 4.0s
- LLM TTFT: > 3.0s
- TTS TTFB: > 0.5s
- Transcription Delay: > 1.5s

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with ClickHouse credentials:
   ```
   CLICKHOUSE_HOST=https://your-clickhouse-host.clickhouse.cloud
   CLICKHOUSE_USER=default
   CLICKHOUSE_PASSWORD=your-password
   CLICKHOUSE_DATABASE=analytics
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

   Opens at http://localhost:3001

## Deployment

Deploy to Vercel:
```bash
vercel
```

Add environment variables in Vercel dashboard.

## Navigation

Link from PM Dashboard (harman-taphealth.vercel.app):
- Add link in Navigation component to voice-analytics deployment URL

## Internal Users (Default)

Pre-populated with known test user IDs:
- `682fbc56a0cdf51b0bd556d3`
- `6866164afb3e2073a0e5f888`
- `6905dbec02cec04ab25739cd`

Editable in Settings page.

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- @clickhouse/client
- date-fns
