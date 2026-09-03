-- Esquema inicial del MVP de ajedrez.
--
-- Sigue el modelo de datos de la arquitectura, con dos cambios que se
-- documentan en su sitio: games.owner_id (necesario para que RLS funcione) y
-- el motivo 'fifty_move' (chess.js lo detecta y el enum original no lo tenia).

-- ---------------------------------------------------------------- perfiles --
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

comment on table profiles is
  'Jugadores con cuenta. El id es el mismo que el de auth.users.';

-- --------------------------------------------------------------- oponentes --
-- Un oponente puede no tener cuenta: es solo un nombre que alguien registra
-- para poder llevar su historial y sus estadisticas.
create table if not exists opponents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  linked_profile_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint opponents_name_not_blank check (length(btrim(name)) > 0),
  constraint opponents_unique_name_per_owner unique (owner_id, name)
);

create index if not exists opponents_owner_id_idx on opponents (owner_id);

-- ------------------------------------------------------- ritmos de juego ---
create table if not exists time_controls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (
    category in ('classical', 'rapid', 'blitz', 'bullet', 'custom')
  ),
  initial_seconds int not null check (initial_seconds >= 0),
  increment_seconds int not null default 0 check (increment_seconds >= 0),
  is_official boolean not null default true,
  constraint time_controls_unique_official unique (name)
);

comment on column time_controls.increment_seconds is
  'Incremento tipo Fischer, sumado al terminar cada jugada.';

-- ------------------------------------------------- posiciones Fischer960 ---
create table if not exists fischer960_positions (
  id serial primary key,
  scharnagl_number int not null unique
    check (scharnagl_number between 0 and 959),
  start_fen text not null
);

comment on table fischer960_positions is
  'Las 960 posiciones de la variante, por numeracion de Scharnagl. La 518 es '
  'la posicion estandar.';

-- ---------------------------------------------------------------- partidas --
create table if not exists games (
  id uuid primary key default gen_random_uuid(),

  -- Anadido respecto a la arquitectura: sin esta columna no se puede escribir
  -- una politica RLS correcta. Los jugadores pueden ser oponentes sin cuenta,
  -- asi que la partida necesita saber a que usuario pertenece.
  owner_id uuid not null references profiles (id) on delete cascade,

  mode text not null check (mode in ('standard', 'fischer960')),
  start_fen text not null,
  scharnagl_number int
    check (scharnagl_number is null or scharnagl_number between 0 and 959),
  time_control_id uuid references time_controls (id) on delete set null,

  -- Apuntan a profiles.id o a opponents.id segun el flag correspondiente, asi
  -- que no pueden llevar clave foranea.
  white_player_id uuid,
  black_player_id uuid,
  white_is_registered boolean not null default false,
  black_is_registered boolean not null default false,

  status text not null default 'in_progress'
    check (status in ('in_progress', 'finished', 'abandoned')),
  result text check (result in ('white', 'black', 'draw')),
  result_reason text check (
    result_reason in (
      'checkmate',
      'resignation',
      'draw_agreement',
      'stalemate',
      'timeout',
      'insufficient_material',
      'repetition',
      -- Anadido: chess.js detecta las tablas por la regla de las 50 jugadas.
      'fifty_move'
    )
  ),
  pgn text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,

  -- Una partida terminada tiene resultado y motivo; una en curso, ninguno.
  constraint games_finished_has_result check (
    (status = 'finished' and result is not null and result_reason is not null)
    or (status <> 'finished' and result is null and result_reason is null)
  ),
  -- Solo Fischer960 lleva numero de posicion.
  constraint games_scharnagl_only_for_fischer check (
    (mode = 'fischer960') or (scharnagl_number is null)
  )
);

create index if not exists games_owner_id_idx on games (owner_id);
create index if not exists games_started_at_idx on games (owner_id, started_at desc);

-- ---------------------------------------------------------------- jugadas ---
create table if not exists moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  ply int not null check (ply > 0),
  san text not null,
  fen_after text not null,
  -- Tiempo restante de cada reloj al cerrar la jugada. Null si no habia reloj.
  white_clock_ms int check (white_clock_ms is null or white_clock_ms >= 0),
  black_clock_ms int check (black_clock_ms is null or black_clock_ms >= 0),
  -- Lo que capturo el reconocimiento de voz, para auditoria (fase 4).
  voice_transcript text,
  created_at timestamptz not null default now(),
  constraint moves_unique_ply_per_game unique (game_id, ply)
);

create index if not exists moves_game_id_idx on moves (game_id, ply);

-- ---------------------------------------------------- partidas historicas ---
create table if not exists historical_games (
  id uuid primary key default gen_random_uuid(),
  title text,
  event text,
  year int,
  white_name text,
  black_name text,
  eco text,
  pgn text not null,
  source text
);

create table if not exists historical_positions (
  id uuid primary key default gen_random_uuid(),
  historical_game_id uuid not null
    references historical_games (id) on delete cascade,
  fen text not null,
  ply_number int,
  -- Secuencia de jugadas correcta, en SAN: ["Dxf7+", "Rxf7", ...]
  solution_moves jsonb not null,
  description text
);

create index if not exists historical_positions_game_idx
  on historical_positions (historical_game_id);

-- ------------------------------------------------------------ estadisticas --
-- Agrega el historial por usuario: cuantas gana, pierde y empata, y por que.
-- security_invoker obliga a que la vista se evalue con los permisos de quien
-- consulta. Sin esto la vista correria como su propietario y se saltaria el
-- RLS de games: cada usuario veria las estadisticas de todos los demas.
create or replace view player_stats with (security_invoker = true) as
select
  g.owner_id,
  count(*) as games_played,
  count(*) filter (where g.result = 'white' and g.white_is_registered
                     and g.white_player_id = g.owner_id)
  + count(*) filter (where g.result = 'black' and g.black_is_registered
                     and g.black_player_id = g.owner_id) as wins,
  count(*) filter (where g.result = 'black' and g.white_is_registered
                     and g.white_player_id = g.owner_id)
  + count(*) filter (where g.result = 'white' and g.black_is_registered
                     and g.black_player_id = g.owner_id) as losses,
  count(*) filter (where g.result = 'draw') as draws,
  count(*) filter (where g.result_reason = 'checkmate') as by_checkmate,
  count(*) filter (where g.result_reason = 'resignation') as by_resignation,
  count(*) filter (where g.result_reason = 'timeout') as by_timeout
from games g
where g.status = 'finished'
group by g.owner_id;
