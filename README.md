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

**Fase 2 completada**: tablero jugable con reglas completas vía chess.js,
historial SAN + PGN, cronómetro con presets FIDE e incremento Fischer, y
generador de posiciones Fischer960.

Pendiente: Supabase e historial persistido (fase 3), comandos de voz (fase 4),
partidas históricas (fase 5), tiempo real y autenticación (fase 6).

### Limitación conocida: enroque en Fischer960

chess.js 1.4.0 no implementa el enroque de la variante. Carga las posiciones
960 sin error, pero no genera ningún enroque para ellas. Por eso el FEN de
partida se pasa por `withoutCastlingRights()`: es preferible no anunciar un
derecho que no se puede ejercer. El resto de reglas funciona con normalidad.

### Pruebas

Cubren motor, generador 960 y cronómetro. No añaden dependencias al repo:

```bash
npx tsx packages/chess-engine/smoke-test.ts       # reglas y finales
npx tsx packages/chess-engine/smoke-test-960.ts   # las 960 posiciones
npx tsx apps/web/lib/clock.smoke-test.ts          # reloj e incremento
```
