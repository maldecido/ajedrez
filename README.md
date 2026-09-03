# Ajedrez MVP

Monorepo (npm workspaces) del MVP de ajedrez.

```
apps/web/               Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
  components/           tablero, estado, controles, historial
  store/                estado de partida (Zustand)
packages/chess-engine/  wrapper sobre chess.js (reglas, PGN, fin de partida)
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

**Fase 1 completada**: tablero jugable con clics y arrastre, reglas completas
vía chess.js (enroque, al paso, coronación, mate, ahogado, material
insuficiente, repetición, 50 jugadas), historial en SAN y PGN.

Pendiente: cronómetro y Fischer960 (fase 2), Supabase e historial persistido
(fase 3), comandos de voz (fase 4), partidas históricas (fase 5), tiempo real
y autenticación (fase 6).

### Pruebas del motor

`packages/chess-engine/smoke-test.ts` cubre reglas y finales de partida. Se
ejecuta sin añadir dependencias al repo:

```bash
npx tsx packages/chess-engine/smoke-test.ts
```
