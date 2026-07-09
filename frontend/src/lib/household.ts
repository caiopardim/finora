import { supabase } from '@/lib/supabase';

export interface HouseholdContext {
  householdId: string | null;   // id do household ativo (se houver)
  memberIds: string[];          // ids dos membros ativos (para atribuir "quem lançou")
}

// Descobre o household ativo do usuário logado (via RLS: só vê o próprio).
export async function getHouseholdContext(): Promise<HouseholdContext> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { householdId: null, memberIds: [] };

  const { data: myRow } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('member_id', session.user.id)
    .eq('status', 'active')
    .maybeSingle();

  const householdId = myRow?.household_id || null;
  if (!householdId) return { householdId: null, memberIds: [] };

  const { data: members } = await supabase
    .from('household_members')
    .select('member_id')
    .eq('household_id', householdId)
    .eq('status', 'active');

  return {
    householdId,
    memberIds: (members || []).map((m: any) => m.member_id).filter(Boolean),
  };
}
