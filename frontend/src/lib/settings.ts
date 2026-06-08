import { supabase } from './supabase';

export interface AppSettings {
  price_monthly: number;
  price_annual: number;
}

export async function getSettings(): Promise<AppSettings> {
  const { data } = await supabase.from('settings').select('key, value');
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.key] = r.value; });
  return {
    price_monthly: Number(map.price_monthly || 29),
    price_annual:  Number(map.price_annual  || 199),
  };
}
