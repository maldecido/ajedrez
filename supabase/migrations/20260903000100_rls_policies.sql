-- Row Level Security.
--
-- El frontend usa la clave publicable, que NO salta RLS: sin estas politicas
-- las tablas quedarian inaccesibles (o abiertas). Regla general: cada usuario
-- solo ve y toca lo suyo; los catalogos son de lectura publica.

alter table profiles enable row level security;
alter table opponents enable row level security;
alter table games enable row level security;
alter table moves enable row level security;
alter table time_controls enable row level security;
alter table fischer960_positions enable row level security;
alter table historical_games enable row level security;
alter table historical_positions enable row level security;

-- ---------------------------------------------------------------- perfiles --
create policy "perfil propio: lectura"
  on profiles for select
  using (auth.uid() = id);

create policy "perfil propio: alta"
  on profiles for insert
  with check (auth.uid() = id);

create policy "perfil propio: edicion"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- --------------------------------------------------------------- oponentes --
create policy "oponentes propios: lectura"
  on opponents for select
  using (auth.uid() = owner_id);

create policy "oponentes propios: alta"
  on opponents for insert
  with check (auth.uid() = owner_id);

create policy "oponentes propios: edicion"
  on opponents for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "oponentes propios: borrado"
  on opponents for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------- partidas --
create policy "partidas propias: lectura"
  on games for select
  using (auth.uid() = owner_id);

create policy "partidas propias: alta"
  on games for insert
  with check (auth.uid() = owner_id);

create policy "partidas propias: edicion"
  on games for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "partidas propias: borrado"
  on games for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------- jugadas ---
-- Las jugadas heredan el permiso de su partida: si la partida es tuya, sus
-- jugadas tambien.
create policy "jugadas de partidas propias: lectura"
  on moves for select
  using (
    exists (
      select 1 from games g
      where g.id = moves.game_id and g.owner_id = auth.uid()
    )
  );

create policy "jugadas de partidas propias: alta"
  on moves for insert
  with check (
    exists (
      select 1 from games g
      where g.id = moves.game_id and g.owner_id = auth.uid()
    )
  );

create policy "jugadas de partidas propias: borrado"
  on moves for delete
  using (
    exists (
      select 1 from games g
      where g.id = moves.game_id and g.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------- catalogos --
-- Ritmos, posiciones 960 y partidas historicas son de lectura publica; se
-- cargan por seed y no se escriben desde el cliente.
create policy "ritmos: lectura publica"
  on time_controls for select using (true);

create policy "posiciones 960: lectura publica"
  on fischer960_positions for select using (true);

create policy "partidas historicas: lectura publica"
  on historical_games for select using (true);

create policy "posiciones historicas: lectura publica"
  on historical_positions for select using (true);
