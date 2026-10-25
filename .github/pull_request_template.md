## What & why

<!-- What does this change, and why? Link the issue/ticket. -->

## How to test

<!-- Steps a reviewer (or the trainer, on the preview link) can follow. -->

## Checklist

- [ ] Database changes are in a new migration under `supabase/migrations/` (no edits to old ones)
- [ ] New tables have row-level security enabled and policies, plus a test in `supabase/tests/`
- [ ] No secrets, real athlete data, or `.env` files committed
- [ ] Screenshots attached for UI changes (mobile and web)
