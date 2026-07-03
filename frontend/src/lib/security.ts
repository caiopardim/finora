import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/** Envia um alerta de segurança por e-mail para o usuário logado (fire-and-forget). */
export async function sendSecurityAlert(title: string, message: string, details?: string[]) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email || !API_URL) return;
    const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    await fetch(`${API_URL}/email/security-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        title,
        message,
        details: [...(details || []), `🕐 Quando: ${when}`],
      }),
    });
  } catch {
    /* alerta não deve quebrar o fluxo */
  }
}

/** Registra o login e detecta dispositivo/local novo (dispara alerta no backend se preciso). */
export async function recordLoginEvent() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/security/login-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    /* silencioso */
  }
}
