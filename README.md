# SupportPilot
AI Support Assistant SaaS portfolio simulation

## Overview
SupportPilot is a portfolio web app that simulates a modern customer support system with AI-assisted triage and response generation. It focuses on the experience of creating, reviewing, and managing support tickets while showcasing AI-augmented workflows.

## Why this project
This project demonstrates my ability to design and build an AI-augmented frontend with a Customer Support, QA, and UX mindset. It highlights how structured input, empathetic responses, and technical reporting can improve the support lifecycle.

## In scope now (MVP)
- Ticket creation form with category, priority, channel, description, steps, expected/actual.
- Ticket list with filters/search/sort and status changes, persisted in LocalStorage.
- Ticket detail with AI-generated customer reply + QA summary + follow-up questions.
- AI route handler (server-side) calling OpenAI Responses API; hydrate/persist tickets locally.
- Settings for support operations: AI behavior (tone/redaction), notifications, SLAs & business hours (read-only), support-focused integrations (Slack/Email/Zendesk/Intercom/Webhooks demo), audit log (demo), data export (settings JSON), roles & access (demo).
- Professional SaaS UX with loading/empty/error states, responsive layout, and no horizontal overflow on mobile.

## Coming soon (roadmap / demo-only)
- Ticket CSV export and richer reporting/QA dashboards.
- Editable SLAs & business hours; routing/automation rules.
- Real RBAC (role-based access) beyond demo.
- Additional integrations and webhooks management.
- Supabase-backed persistence with authentication.
- Analytics for response time and ticket resolution.

## Out of scope for this MVP
- Billing, plans, payments.
- Team subscription management.
- Full auth/multi-tenant provisioning (planned with Supabase).

## Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API via secure server-side route
- LocalStorage for MVP ticket persistence

## Architecture
High-level flow: Next.js frontend UI -> API route (server-side) -> OpenAI API. Ticket data is stored in LocalStorage for the MVP, with room to add a database later. Settings are persisted locally for demo purposes (AI policies, notifications, SLAs/business hours, integrations, audit log, exports).

## Local Setup
Install dependencies:
```bash
npm install
```

Run the app locally:
```bash
npm run dev
```

Optional checks:
```bash
npm run lint
npm run build
```

Testing:
```bash
npm run test        # unit tests (Node test runner via tsx)
npm run e2e         # Playwright E2E
npm run quality     # lint + unit tests
npm run quality:full # quality + production build + e2e
npm run release:check # alias for quality:full
```

## Environment Variables
Create a `.env.local` file at the project root:
```bash
OPENAI_API_KEY=your_key_here
```

## Roadmap / Future Improvements
- Supabase-backed persistence with user authentication.
- Role-based views for support agents and admins.
- Analytics for response time and ticket resolution.
- Exportable ticket reports for QA and product teams.

## Screenshots
### Ticket Creation
### AI Output Summary
### Ticket History Dashboard

## License
MIT

## Author
Author: Gabriella Andrade  
Created & Developed by WebLuma (https://webluma.tech/)
