# SupportPilot
AI Support Assistant SaaS portfolio simulation

## Overview
SupportPilot is a portfolio web app that simulates a modern customer support system with AI-assisted triage and response generation. It focuses on the user experience of creating, reviewing, and managing support tickets while showcasing AI-augmented workflows.

## Why this project
This project demonstrates my ability to design and build an AI-augmented frontend with a Customer Support, QA, and UX mindset. It highlights how structured input, empathetic responses, and technical reporting can improve the support lifecycle.

## Key Features
- Create Support Ticket form with category, priority, channel, and detailed issue context.
- AI-generated outputs for both end users and internal teams.
- Ticket history dashboard with filters for status, priority, and category.
- Ticket detail view showing AI summaries, follow-ups, and recommended actions.
- Professional SaaS UX with loading states, empty states, error handling, and responsive layout.

## Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API via secure server-side route
- LocalStorage for MVP ticket persistence

## Architecture
High-level flow: Next.js frontend UI -> API route (server-side) -> OpenAI API. Ticket data is stored in LocalStorage for the MVP, with room to add a database later.

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
