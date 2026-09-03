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

> Fase 0: vacío a propósito. El esquema se define en la fase que introduce
> Supabase; el cliente de Supabase aún no está cableado en `apps/web`.

Uso habitual (requiere la CLI de Supabase):

```bash
supabase migration new <descripcion>   # crear
supabase db push                       # aplicar al proyecto remoto
```
