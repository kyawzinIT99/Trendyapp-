# Trigger.dev development setup

This React/Vite app is browser-only. Keep Trigger.dev secret keys and third-party API keys in server-side environment variables; never use a `VITE_` prefix for them or import the Trigger.dev SDK from `src/`.

1. The project ref is set in `trigger.config.ts` for the dedicated Trigger.dev project (`Trendy`). Do not commit a development API key.
2. Use a fresh, scoped development key in `TRIGGER_SECRET_KEY` for server-side tooling. The key previously shared in chat should be rotated.
3. Run `npm install`, then `npm run trigger:dev` to register the safe `trendy-development-check` task in the development environment. No production deployment is involved.
4. Put additional tasks in `trigger/`. Store their external credentials as secret environment variables in Trigger.dev's Development environment. Keep code in Git, not secrets.

The existing checkout and cart events still use n8n. A future Trigger.dev integration needs a trusted backend endpoint before browser events can trigger secret-authenticated tasks. GitHub automatic deployment should stay disabled until the workflow and tracking branch are chosen.
