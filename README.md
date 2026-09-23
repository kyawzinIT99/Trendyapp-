# Trendy

Trendy is a mobile-first commerce app prototype with a customer storefront and an in-app admin panel. It is built with React and Vite.

## Local development

```bash
npm ci
npm run dev
```

The local preview uses `http://127.0.0.1:5174/` by default. Copy `.env.example` to `.env` and set only the integrations you use. `.env` is ignored by Git.

## Integrations

- Storefront events currently go to the existing n8n workflow. The workflow export stays outside this public repository because it contains integration references.
- Trigger.dev is installed for future server-side tasks. `trigger.config.ts` points to the linked development project. Run `npm run trigger:dev` after authenticating the CLI. The included `trendy-development-check` task has no external effects.
- Keep secret API keys out of `VITE_` variables and browser code. See `TRIGGER_SETUP.md` before adding Trigger.dev workflows.

No production deployment is configured by this repository.
