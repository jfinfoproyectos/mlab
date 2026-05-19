<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<!-- BEGIN:project-rules -->
# ScreenHub Development Rules

## Architecture: Feature-First
This project strictly follows a **Feature-First** architecture. All business logic must be organized into modular, self-contained directories within `src/features/`.

- **Encapsulation**: Each feature must contain its own `components/`, `actions/` (Server Actions), `schemas/` (Zod), and `services/`.
- **Public API**: Use an `index.ts` file in each feature folder to export only the necessary elements. Never import internal feature files from the outside.
- **Strict Isolation**: Avoid cross-feature imports. If logic is shared between two or more features, move it to `src/components/ui/`, `src/lib/`, or `src/hooks/`.
- **Clean Routes**: Keep `src/app/` thin. Route files should only act as entry points that compose features.
- **Role-Based Layouts**: Always use the designated layouts for `/admin`, `/publisher`, and `/auditor` to maintain visual consistency and security.

## Styling & UI
- **Shadcn UI**: Always prioritize the use of Shadcn UI components. For new elements, use `npx shadcn@latest add` instead of building custom components from scratch.
- **Semantic Tokens**: Use theme variables (`bg-background`, `text-foreground`, `bg-card`) instead of hardcoded colors.
- **OKLCH Colors**: Support the OKLCH color space for modern, perceptual color transitions.
- **Fixed Layout**: Maintain the sticky header and scrollable content area pattern in all dashboards.
<!-- END:project-rules -->

