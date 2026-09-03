# supabase/seed

Datos de ejemplo y catálogos para desarrollo. **Nunca** datos reales de
producción ni claves.

## Archivos

- **`seed.sql`** — ritmos oficiales FIDE (`time_controls`) y el semillero de
  partidas históricas. Idempotente vía `on conflict do update`.
- **`fischer960_positions.sql`** — las 960 posiciones de la variante.
  **Generado**, no se edita a mano: lo emite
  `packages/chess-engine/src/fischer960.ts`, el mismo código que usa la app,
  así que base y cliente no pueden discrepar.

## Uso

Requiere que las migraciones de [`../migrations`](../migrations) ya estén
aplicadas.

```bash
psql "$DATABASE_URL" -f supabase/seed/seed.sql
psql "$DATABASE_URL" -f supabase/seed/fischer960_positions.sql
```

Con la CLI de Supabase en local, `supabase db reset` aplica migraciones y seed
de una vez.

## Ojo con los ritmos

`time_controls` duplica lo que hay en `apps/web/lib/time-controls.ts`. Si
cambias un preset, cámbialo en los dos sitios.
