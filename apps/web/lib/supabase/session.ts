import { getSupabase } from "./client";

/**
 * Identidad del jugador local.
 *
 * La fase 3 necesita un `auth.uid()` porque todas las politicas de RLS cuelgan
 * de el, pero la autenticacion con cuenta es de la fase 6. La solucion es la
 * sesion anonima de Supabase: es un usuario real de `auth.users`, con su uuid,
 * creado sin pedir nada al jugador. En la fase 6 esa cuenta anonima se puede
 * vincular a una de verdad y el historial se conserva.
 */
export interface PlayerIdentity {
  profileId: string;
}

let pending: Promise<PlayerIdentity | null> | null = null;

/** Devuelve la identidad local, creandola si hace falta. Nunca lanza. */
export function ensureSession(): Promise<PlayerIdentity | null> {
  // Se cachea la promesa para que varias llamadas simultaneas al montar no
  // creen varios usuarios anonimos.
  if (!pending) pending = resolveSession();
  return pending;
}

async function resolveSession(): Promise<PlayerIdentity | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    let userId = data.session?.user.id ?? null;

    if (!userId) {
      const { data: signed, error } = await supabase.auth.signInAnonymously();
      if (error || !signed.user) {
        // El motivo mas habitual: las sesiones anonimas estan desactivadas en
        // el panel de Supabase (Authentication > Sign In / Providers).
        console.warn("No se pudo iniciar sesion anonima:", error?.message);
        pending = null;
        return null;
      }
      userId = signed.user.id;
    }

    // games.owner_id apunta a profiles, asi que la fila debe existir antes de
    // guardar ninguna partida.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId }, { onConflict: "id" });

    if (profileError) {
      console.warn("No se pudo crear el perfil:", profileError.message);
      pending = null;
      return null;
    }

    return { profileId: userId };
  } catch (error) {
    console.warn("Supabase no disponible:", error);
    pending = null;
    return null;
  }
}
