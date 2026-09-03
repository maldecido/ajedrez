# Ajedrez MVP

Monorepo (npm workspaces) del MVP de ajedrez.

```
apps/web/               Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
  components/           tablero, estado, controles, historial
  store/                estado de partida (Zustand)
packages/chess-engine/  wrapper sobre chess.js (reglas, PGN, fin de partida)
packages/voice/         parser de voz español → SAN
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

**Fase 4 completada**: sobre lo anterior (tablero, reglas, PGN, cronómetro,
Fischer960 con enroque, oponentes e historial en Supabase), ahora se puede
dictar la jugada por voz en español.

Pendiente: partidas históricas (fase 5), tiempo real y autenticación con
cuenta (fase 6).

### Voz

`packages/voice` traduce lo dictado a notación algebraica. Va en dos pasos
separados a propósito:

1. **Parser** — interpreta la intención ("caballo a efe tres" → destino f3,
   pieza caballo). Normaliza acentos, números dictados y nombres de columnas,
   con las confusiones típicas del reconocedor ("ache" por *hache*).
2. **Resolutor** — contrasta esa intención con las jugadas legales de la
   posición. **Nunca inventa**: si encaja con varias, pregunta; si no encaja
   con ninguna, lo dice.

Ninguna jugada se aplica sola: siempre hay confirmación, porque un error de
dictado no debe mover una pieza que no querías.

Requiere Chrome o Edge (la Web Speech API no está en Firefox ni Safari). Donde
no está, se avisa y se juega con el tablero.

### Identidad: sesión anónima

La RLS cuelga de `auth.uid()`, pero la autenticación con cuenta es de la fase 6.
Mientras tanto se usa la **sesión anónima** de Supabase: un usuario real de
`auth.users` creado sin pedir nada al jugador. En la fase 6 esa cuenta se
vincula a una de verdad y el historial se conserva.

**Hay que activarla** en Supabase → Authentication → Sign In / Providers →
*Anonymous sign-ins*. Si está desactivada la app sigue funcionando: se juega en
local y no se guarda nada, avisando en pantalla.

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
npx tsx packages/voice/smoke-test.ts                  # dictado en español
npx tsx apps/web/lib/clock.smoke-test.ts              # reloj e incremento
```

Contra el proyecto real de Supabase (esquema, RLS, restricciones y políticas;
crea datos de prueba y los borra al terminar):

```bash
npx tsx scripts/supabase-e2e-check.ts
```
