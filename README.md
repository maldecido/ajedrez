# Ajedrez MVP

Monorepo (npm workspaces) del MVP de ajedrez.

```
apps/web/            Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
packages/chess-engine/  wrapper sobre chess.js (vacio en fase 0)
packages/voice/         capa de voz (vacio hasta fase 4)
supabase/migrations/    esquema SQL versionado
supabase/seed/          datos de ejemplo para desarrollo
.github/workflows/      CI (lint + build)
```

## Requisitos

- Node.js 20+

## Arranque

```bash
npm install
cp apps/web/.env.local.example apps/web/.env.local   # rellenar con las keys de Supabase
npm run dev                                          # http://localhost:3000
```

Otros scripts desde la raíz: `npm run lint`, `npm run build`.

## Estado

Fase 0: esqueleto del monorepo y despliegue. Sin lógica de ajedrez, reloj, voz
ni Supabase todavía.
