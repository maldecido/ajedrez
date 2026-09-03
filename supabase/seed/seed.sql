-- Seed de desarrollo.
--
-- Idempotente: se puede relanzar sin ensuciar la base.
-- Orden: primero los catalogos, que no dependen de ningun usuario.
--
--   psql "$DATABASE_URL" -f supabase/seed/seed.sql
--   psql "$DATABASE_URL" -f supabase/seed/fischer960_positions.sql

-- ------------------------------------------------- ritmos oficiales FIDE ---
-- Estos son los mismos que expone apps/web/lib/time-controls.ts. Si se cambia
-- uno, hay que cambiarlo en los dos sitios.
insert into time_controls (name, category, initial_seconds, increment_seconds, is_official)
values
  ('Clásica 90+30', 'classical', 5400, 30, true),
  ('Rápida 15+10',  'rapid',      900, 10, true),
  ('Blitz 5+3',     'blitz',      300,  3, true),
  ('Blitz 3+2',     'blitz',      180,  2, true),
  ('Bullet 1+0',    'bullet',      60,  0, true)
on conflict (name) do update
  set category          = excluded.category,
      initial_seconds   = excluded.initial_seconds,
      increment_seconds = excluded.increment_seconds,
      is_official       = excluded.is_official;

-- ---------------------------------------------------- partidas historicas ---
-- Semillero minimo para la fase 5. La Inmortal esta en dominio publico.
-- historical_games no tiene restriccion unica, asi que "on conflict" no
-- serviria de nada aqui: se comprueba la existencia a mano.
insert into historical_games (title, event, year, white_name, black_name, eco, pgn, source)
select * from (values (
  'La Inmortal',
  'Londres',
  1851,
  'Adolf Anderssen',
  'Lionel Kieseritzky',
  'C33',
  '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 '
  '8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 '
  '14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ '
  '20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0',
  'dominio público'
)) as nueva (title, event, year, white_name, black_name, eco, pgn, source)
where not exists (
  select 1 from historical_games h where h.title = 'La Inmortal' and h.year = 1851
);
