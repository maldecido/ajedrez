-- Ritmos personalizados.
--
-- time_controls solo tenia lectura publica, asi que una partida con ritmo
-- personalizado no podia guardar su time_control_id: la fila no existia y el
-- cliente no podia crearla. Se permite el alta, pero acotada a ritmos
-- personalizados: nadie puede colar un preset falso como si fuera oficial.

create policy "ritmos personalizados: alta"
  on time_controls for insert
  to authenticated
  with check (is_official = false and category = 'custom');
