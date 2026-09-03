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
historial SAN + PGN, cronómetro con presets FIDE e incremento Fischer (de
arranque manual), y Fischer960 completo, enroque incluido.

Pendiente: Supabase e historial persistido (fase 3), comandos de voz (fase 4),
partidas históricas (fase 5), tiempo real y autenticación (fase 6).

### Enroque en Fischer960

chess.js 1.4.0 no implementa el enroque de la variante: carga las posiciones
960 sin error, pero no genera ningún enroque para ellas. Está resuelto en
`packages/chess-engine/src/castling960.ts`, que usa `isAttacked()` de chess.js
para validar y aplica la jugada construyendo el FEN resultante.

Como aplicar el enroque así borraría el historial interno de chess.js, es el
propio `ChessGame` quien lleva el historial, el PGN y la detección de
repetición. chess.js sigue siendo quien decide las reglas.

**Para enrocar se mueve el rey sobre la torre propia.** Es la convención de la
variante y evita ambigüedades: el rey nunca puede capturar una pieza propia,
así que la jugada no choca con ningún movimiento normal.

### Pruebas

Cubren motor, generador 960 y cronómetro. No añaden dependencias al repo:

```bash
npx tsx packages/chess-engine/smoke-test.ts           # reglas y finales
npx tsx packages/chess-engine/smoke-test-960.ts       # las 960 posiciones
npx tsx packages/chess-engine/smoke-test-castling.ts  # enroque de la variante
npx tsx apps/web/lib/clock.smoke-test.ts              # reloj e incremento
```
