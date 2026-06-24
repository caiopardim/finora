'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Plus, X, Trash2, Check, ShoppingCart } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimated_price: number;
  completed: boolean;
}

interface ShoppingList {
  id: string;
  name: string;
  category: string;
  completed: boolean;
  items?: ShoppingListItem[];
  created_at: string;
}

export default function ShoppingListsPage() {
  const { c, isDark } = useTheme();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddItems, setShowAddItems] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [form, setForm] = useState({ name: '', category: 'Alimentação' });
  const [itemsInput, setItemsInput] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data } = await supabase
      .from('shopping_lists')
      .select('*, shopping_list_items(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    setLists(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('shopping_lists').insert({
      user_id: session.user.id,
      name: form.name,
      category: form.category,
      completed: false,
    });

    if (error) { alert(error.message); return; }
    setShowCreate(false);
    setForm({ name: '', category: 'Alimentação' });
    load();
  }

  async function handleAddItems(e: React.FormEvent, listId: string) {
    e.preventDefault();
    if (!itemsInput.trim()) return;

    // Parse items from input (ex: "pão, leite, ovos" or "2kg frango, 1L leite")
    const itemLines = itemsInput.split(',').map(line => line.trim());
    const items = itemLines.map(line => {
      const match = line.match(/^(\d+(?:\.\d+)?)?([a-z]*)\s*(.+)$/i);
      if (match) {
        const quantity = parseFloat(match[1]) || 1;
        const unit = match[2] || 'un';
        const name = match[3].trim();
        return { name, quantity, unit, estimated_price: 0, completed: false };
      }
      return { name: line, quantity: 1, unit: 'un', estimated_price: 0, completed: false };
    });

    const { error } = await supabase
      .from('shopping_list_items')
      .insert(items.map(item => ({ shopping_list_id: listId, ...item })));

    if (error) { alert(error.message); return; }
    setItemsInput('');
    setShowAddItems(null);
    load();
  }

  async function toggleItem(itemId: string, listId: string) {
    const list = lists.find(l => l.id === listId);
    const item = list?.items?.find(i => i.id === itemId);

    if (!item) return;

    const { error } = await supabase
      .from('shopping_list_items')
      .update({ completed: !item.completed })
      .eq('id', itemId);

    if (error) { alert(error.message); return; }
    load();
  }

  async function deleteItem(itemId: string) {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId);

    if (error) { alert(error.message); return; }
    load();
  }

  async function completeList(listId: string) {
    const { error } = await supabase
      .from('shopping_lists')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', listId);

    if (error) { alert(error.message); return; }
    load();
  }

  async function deleteList(listId: string) {
    const { error } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', listId);

    if (error) { alert(error.message); return; }
    setDeleteId(null);
    load();
  }

  const activeLists = lists.filter(l => !l.completed);
  const completedLists = lists.filter(l => l.completed);

  if (loading) return <div style={{ color: c.text }}>Carregando...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: c.text, margin: 0 }}>🛒 Lista de Compras</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <Plus size={18} /> Nova Lista
        </button>
      </div>

      {/* Modal Criar Lista */}
      {showCreate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <form onSubmit={handleCreate} style={{
            background: c.bg,
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            border: `1px solid ${c.border}`,
          }}>
            <h2 style={{ color: c.text, marginTop: 0 }}>Nova Lista</h2>
            <input
              type="text"
              placeholder="Nome da lista (ex: Mercado)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '12px',
                border: `1px solid ${c.border}`,
                borderRadius: '8px',
                background: c.surface,
                color: c.text,
                boxSizing: 'border-box',
              }}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '16px',
                border: `1px solid ${c.border}`,
                borderRadius: '8px',
                background: c.surface,
                color: c.text,
                boxSizing: 'border-box',
              }}
            >
              <option>Alimentação</option>
              <option>Farmácia</option>
              <option>Limpeza</option>
              <option>Outras</option>
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: 'pointer',
                }}
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  flex: 1,
                  background: c.border,
                  color: c.text,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listas Ativas */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: c.text, marginBottom: '16px' }}>Ativas ({activeLists.length})</h2>
        {activeLists.length === 0 ? (
          <div style={{ color: c.textSecondary, textAlign: 'center', padding: '40px 20px' }}>
            Nenhuma lista ativa. Crie uma nova! 🛒
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {activeLists.map(list => (
              <div key={list.id} style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ color: c.text, margin: '0 0 4px 0' }}>{list.name}</h3>
                    <p style={{ color: c.textSecondary, margin: '0', fontSize: '14px' }}>{list.category}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => deleteList(list.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={() => completeList(list.id)}
                      style={{
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      <Check size={16} /> Finalizar
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: '12px' }}>
                  {(list.items || []).length === 0 ? (
                    <p style={{ color: c.textSecondary, margin: 0, fontSize: '14px' }}>Nenhum item ainda</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(list.items || []).map(item => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: c.bg,
                            borderRadius: '8px',
                            opacity: item.completed ? 0.5 : 1,
                            textDecoration: item.completed ? 'line-through' : 'none',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: c.text }}>
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => toggleItem(item.id, list.id)}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>{item.name} ({item.quantity}{item.unit})</span>
                            </label>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => deleteItem(item.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Items */}
                {showAddItems === list.id ? (
                  <form onSubmit={(e) => handleAddItems(e, list.id)} style={{ marginBottom: '12px' }}>
                    <textarea
                      placeholder="Adicione itens (ex: pão, leite, 2kg frango)"
                      value={itemsInput}
                      onChange={(e) => setItemsInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        marginBottom: '8px',
                        border: `1px solid ${c.border}`,
                        borderRadius: '6px',
                        background: c.bg,
                        color: c.text,
                        boxSizing: 'border-box',
                        minHeight: '60px',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="submit"
                        style={{
                          flex: 1,
                          background: '#6366f1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddItems(null)}
                        style={{
                          flex: 1,
                          background: c.border,
                          color: c.text,
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowAddItems(list.id)}
                    style={{
                      width: '100%',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px',
                      cursor: 'pointer',
                      marginBottom: '12px',
                    }}
                  >
                    + Adicionar Itens
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listas Completadas */}
      {completedLists.length > 0 && (
        <div>
          <h2 style={{ color: c.textSecondary, marginBottom: '16px' }}>Completadas ({completedLists.length})</h2>
          <div style={{ display: 'grid', gap: '12px', opacity: 0.6 }}>
            {completedLists.slice(0, 3).map(list => (
              <div key={list.id} style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <p style={{ color: c.text, margin: '0 0 4px 0' }}>{list.name}</p>
                  <p style={{ color: c.textSecondary, margin: 0, fontSize: '12px' }}>
                    {(list.items || []).length} itens
                  </p>
                </div>
                <Check size={20} style={{ color: '#6366f1' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
