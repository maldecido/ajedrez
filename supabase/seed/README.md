# supabase/seed

Datos de ejemplo para desarrollo y pruebas locales. **Nunca** datos reales de
producción ni claves.

Contenido previsto (`seed.sql` y archivos auxiliares): usuarios de prueba,
alguna partida de ejemplo con sus movimientos ya cargados, y posiciones FEN
conocidas para probar la UI del tablero sin tener que jugarlas a mano.

Requisitos:

- El seed asume que las migraciones de [`../migrations`](../migrations) ya se
  aplicaron; sigue el mismo modelo de datos (perfiles, partidas, movimientos).
- Debe ser **idempotente** (`on conflict do nothing` o `truncate` previo) para
  poder relanzarlo sin ensuciar la base.

> Fase 0: vacío a propósito. Se rellena junto con el esquema, en la fase que
> introduce Supabase.

Uso habitual:

```bash
supabase db reset   # aplica migraciones + seed en la base local
```
