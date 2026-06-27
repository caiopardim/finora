import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';

export interface ShoppingListItem {
  id?: string;
  name: string;
  quantity?: number;
  unit?: string;
  estimated_price?: number;
  actual_price?: number;
  completed?: boolean;
}

export interface ShoppingList {
  id?: string;
  user_id: string;
  name: string;
  category?: string;
  items?: ShoppingListItem[];
  total_estimated?: number;
  total_actual?: number;
  completed?: boolean;
  created_at?: string;
  completed_at?: string;
}

@Injectable()
export class ShoppingListService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async create(userId: string, dto: { name: string; category?: string }): Promise<ShoppingList> {
    const { data, error } = await this.supabase
      .from('shopping_lists')
      .insert({ user_id: userId, name: dto.name, category: dto.category || 'Geral', completed: false })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async findActiveByUser(userId: string): Promise<ShoppingList[]> {
    const { data, error } = await this.supabase
      .from('shopping_lists')
      .select('*, items:shopping_list_items(*)')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async findById(userId: string, listId: string): Promise<ShoppingList | null> {
    const { data, error } = await this.supabase
      .from('shopping_lists')
      .select('*, items:shopping_list_items(*)')
      .eq('user_id', userId)
      .eq('id', listId)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || null;
  }

  async addItems(listId: string, items: ShoppingListItem[]): Promise<ShoppingListItem[]> {
    const itemsToInsert = items.map((item) => ({
      shopping_list_id: listId,
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || 'un',
      estimated_price: item.estimated_price || 0,
      completed: false,
    }));

    const { data, error } = await this.supabase
      .from('shopping_list_items')
      .insert(itemsToInsert)
      .select();
    if (error) throw new Error(error.message);
    return data;
  }

  async removeItem(itemId: string): Promise<void> {
    const { error } = await this.supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId);
    if (error) throw new Error(error.message);
  }

  async markItemCompleted(itemId: string, actualPrice?: number): Promise<ShoppingListItem> {
    const { data, error } = await this.supabase
      .from('shopping_list_items')
      .update({ completed: true, actual_price: actualPrice })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // Marca/desmarca como comprados os itens da lista cujo nome casa (parcial, sem
  // acento) com algum dos nomes informados. Retorna os nomes afetados.
  async markItemsByName(listId: string, names: string[], completed = true): Promise<string[]> {
    const { data: items, error } = await this.supabase
      .from('shopping_list_items')
      .select('id, name, completed')
      .eq('shopping_list_id', listId);
    if (error) throw new Error(error.message);

    const norm = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const targets = names.map(norm).filter(Boolean);

    const matched = (items || []).filter((item: any) => {
      const n = norm(item.name);
      return targets.some((t) => n.includes(t) || t.includes(n));
    });

    const ids = matched.map((m: any) => m.id);
    if (ids.length) {
      const { error: upErr } = await this.supabase
        .from('shopping_list_items')
        .update({ completed })
        .in('id', ids);
      if (upErr) throw new Error(upErr.message);
    }
    return matched.map((m: any) => m.name);
  }

  // Remove (exclui) os itens da lista cujo nome casa (parcial, sem acento)
  // com algum dos nomes informados. Retorna os nomes removidos.
  async removeItemsByName(listId: string, names: string[]): Promise<string[]> {
    const { data: items, error } = await this.supabase
      .from('shopping_list_items')
      .select('id, name')
      .eq('shopping_list_id', listId);
    if (error) throw new Error(error.message);

    const norm = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const targets = names.map(norm).filter(Boolean);

    const matched = (items || []).filter((item: any) => {
      const n = norm(item.name);
      return targets.some((t) => n.includes(t) || t.includes(n));
    });

    const ids = matched.map((m: any) => m.id);
    if (ids.length) {
      const { error: delErr } = await this.supabase
        .from('shopping_list_items')
        .delete()
        .in('id', ids);
      if (delErr) throw new Error(delErr.message);
    }
    return matched.map((m: any) => m.name);
  }

  async completeList(listId: string): Promise<ShoppingList> {
    const { data, error } = await this.supabase
      .from('shopping_lists')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', listId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async getListSummary(listId: string): Promise<{ estimated: number; actual: number; items: number }> {
    const { data, error } = await this.supabase
      .from('shopping_list_items')
      .select('*')
      .eq('shopping_list_id', listId);

    if (error) throw new Error(error.message);
    const items = data || [];

    const estimated = items.reduce((total, item) => total + ((item.estimated_price || 0) * (item.quantity || 1)), 0);
    const actual = items.reduce((total, item) => total + ((item.actual_price || 0) * (item.quantity || 1)), 0);

    return { estimated, actual, items: items.length };
  }
}
