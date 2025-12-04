# Integration Notes

## Architecture

- Explorer is a standalone SvelteKit/Vite application (to be scaffolded).
- Targets read-only browsing; no wallet signing.
- Shared component patterns with Nomin where possible (Tailwind CSS, layout).

## Data Flow

1. User submits a hash/id in the Explorer UI.
2. Explorer calls the corresponding `/api/explorer/*` endpoint.
3. Backend normalises parameters (lowercase, ObjectId parsing) before querying MongoDB.
4. Results are rendered with pagination where applicable.

## Key Considerations

- **Latency:** endpoints hit MongoDB directly, so consider caching client-side.
- **Rate limiting:** plan for backend throttling if Explorer is public.
- **Error states:** handle `404` (no data) and `500` (backend issue) gracefully.
- **Security:** never expose admin routes; Explorer only consumes read APIs.

## Shared Resources

- Styles should align with the existing `frontend/src/lib` design tokens.
- Reuse utility functions from `frontend/src/lib/api.ts` where helpful.
- Reference `frontend/src/routes/userTransactions/+page.svelte` for pagination patterns.

