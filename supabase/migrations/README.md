# supabase/migrations

Migraciones SQL versionadas del esquema de la base de datos. Una migración por
cambio, en orden cronológico, con el nombre que genera la CLI de Supabase:

```
<timestamp>_<descripcion>.sql   # p. ej. 20260115090000_create_games.sql
```

Reglas:

- Cada archivo es **inmutable** una vez commiteado. Para corregir algo, se añade
  una migración nueva; no se edita una ya aplicada.
- Toda tabla expuesta al cliente lleva su política de **RLS** en la misma
  migración que la crea (el frontend usa la `anon key`, que no salta RLS).

Aquí vivirán las tablas del modelo de datos de la arquitectura: perfiles de
usuario, partidas y sus movimientos (SAN/FEN, turnos y tiempos del reloj), más
las políticas de acceso asociadas.

## Migraciones actuales

- `20260903000000_initial_schema.sql` — perfiles, oponentes, ritmos, las 960
  posiciones, partidas, jugadas, partidas históricas y la vista
  `player_stats`.
- `20260903000100_rls_policies.sql` — RLS de todas las tablas.

Dos diferencias deliberadas respecto al modelo de datos de la arquitectura,
ambas comentadas en el propio SQL:

1. **`games.owner_id`** — no estaba en el modelo original, pero sin ella no se
   puede escribir una política RLS correcta: los jugadores de una partida
   pueden ser oponentes sin cuenta, así que `white_player_id`/`black_player_id`
   no bastan para saber de quién es la partida.
2. **`result_reason` incluye `'fifty_move'`** — chess.js detecta las tablas por
   la regla de las 50 jugadas y el enum original no lo contemplaba, así que
   esas partidas no se habrían podido guardar.

Uso habitual (requiere la CLI de Supabase):

```bash
supabase migration new <descripcion>   # crear
supabase db push                       # aplicar al proyecto remoto
```
