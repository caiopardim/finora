'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, User, Shield, MessageSquare, Camera, Loader, Bell, BellOff, Palette, Eye, EyeOff, Download } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import TwoFactorSetup from '@/components/ui/TwoFactorSetup';
import DataExport from '@/components/ui/DataExport';
import { sendSecurityAlert } from '@/lib/security';

export default function SettingsPage() {
  const { c } = useTheme();
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifStatus, setNotifStatus] = useState<'default'|'granted'|'denied'>('default');
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [accentColor, setAccentColor] = useState('#22c55e');
  const [accentSaved, setAccentSaved] = useState(false);

  const ACCENT_COLORS = ['#22c55e','#6366f1','#3b82f6','#f97316','#ec4899','#8b5cf6','#06b6d4','#ef4444'];

  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifStatus(Notification.permission as any);
    const saved = localStorage.getItem('finora_accent');
    if (saved) setAccentColor(saved);
  }, []);

  async function requestNotifications() {
    if (!('Notification' in window)) { alert('Seu navegador não suporta notificações.'); return; }
    const perm = await Notification.requestPermission();
    setNotifStatus(perm as any);
    if (perm === 'granted') {
      new Notification('Finora', { body: '🎉 Notificações ativadas! Você será avisado sobre contas vencendo.' });
    }
  }

  function saveAccent() {
    localStorage.setItem('finora_accent', accentColor);
    document.documentElement.style.setProperty('--accent', accentColor);
    setAccentSaved(true);
    setTimeout(() => setAccentSaved(false), 2000);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
          if (p) {
            setProfile({ name: p.name || '', phone: p.phone || '' });
            setAvatarUrl(p.avatar_url || null);
          }
        });
      }
    });
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem deve ter no máximo 2MB.');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      alert('Erro ao fazer upload: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    await supabase.from('profiles').update({ avatar_url: urlWithBust }).eq('id', user.id);
    setAvatarUrl(urlWithBust);
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await supabase.from('profiles').update({ name: profile.name, phone: profile.phone }).eq('id', user.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (!pwForm.current) { setPwError('Informe a senha atual.'); return; }
    if (pwForm.newPw.length < 6) { setPwError('A nova senha deve ter no mínimo 6 caracteres.'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('A nova senha e a confirmação não coincidem.'); return; }

    setPwLoading(true);
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setPwError('Sessão inválida. Faça login novamente.');
        return;
      }

      // Check if user has a password-based identity
      const identities = session.user.identities ?? [];
      const hasEmailIdentity = identities.some((i: any) => i.provider === 'email');
      if (!hasEmailIdentity) {
        setPwError('Sua conta usa login social (Google, etc). Não é possível alterar senha aqui.');
        return;
      }

      // Verify current password before changing
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: pwForm.current,
      });
      if (signInError) {
        setPwError('Senha atual incorreta.');
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ password: pwForm.newPw });
      if (updateError) {
        setPwError('Erro ao atualizar senha: ' + updateError.message);
        return;
      }

      setPwSuccess(true);
      setPwForm({ current: '', newPw: '', confirm: '' });
      sendSecurityAlert('Senha alterada', 'A senha da sua conta Finora foi alterada.');
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: any) {
      setPwError('Erro inesperado. Tente novamente.');
    } finally {
      setPwLoading(false);
    }
  }

  const displayName = profile.name || user?.email?.split('@')[0] || 'Usuário';
  const initial = displayName[0]?.toUpperCase() || 'U';

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 14px',
    borderRadius: 10, border: `1.5px solid ${c.border}`,
    fontSize: 14, color: c.textSecondary, background: c.input,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: '0 0 2px' }}>Configurações</h1>
        <p style={{ color: c.textFaint, fontSize: 14, margin: 0 }}>Gerencie sua conta e preferências</p>
      </div>

      {/* Avatar */}
      <Section icon={<User size={17}/>} title="Foto de Perfil">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Avatar preview */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${c.border}` }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 28, fontWeight: 700, border: `3px solid ${c.border}`,
              }}>{initial}</div>
            )}
            {/* Camera overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: uploading ? '#94a3b8' : '#22c55e',
                border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              {uploading
                ? <Loader size={13} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                : <Camera size={13} color="#fff" />
              }
            </button>
          </div>

          {/* Info */}
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 15, color: c.textSecondary }}>{displayName}</p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: c.textFaint }}>{user?.email}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: `1.5px solid ${c.border}`, background: c.surface,
                color: c.textSecondary, fontSize: 13, fontWeight: 500,
                cursor: uploading ? 'wait' : 'pointer',
              }}
            >
              {uploading ? 'Enviando...' : 'Alterar foto'}
            </button>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: c.textFaint }}>JPG, PNG ou GIF · máx. 2MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>
      </Section>

      {/* Profile */}
      <Section icon={<User size={17}/>} title="Perfil">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Nome', key: 'name',  placeholder: 'Seu nome completo', type: 'text' },
            { label: 'WhatsApp', key: 'phone', placeholder: '+55 11 99999-9999', type: 'tel' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <Label>{label}</Label>
              <input
                type={type}
                value={(profile as any)[key]}
                onChange={e => setProfile({ ...profile, [key]: e.target.value })}
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}
          <div>
            <Label>E-mail</Label>
            <input value={user?.email || ''} disabled style={{ ...inputStyle, background: c.inputBg, color: c.textFaint, cursor: 'not-allowed' }}/>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: c.textFaint }}>O e-mail não pode ser alterado por aqui.</p>
          </div>
          <button type="submit" style={{
            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: saved ? '#22c55e' : 'linear-gradient(135deg,#22c55e,#16a34a)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(34,197,94,0.3)', transition: 'all 0.2s',
          }}>
            <Check size={16}/> {saved ? 'Salvo!' : 'Salvar Alterações'}
          </button>
        </form>
      </Section>

      {/* Security */}
      <Section icon={<Shield size={17}/>} title="Segurança">
        <p style={{ margin: '0 0 16px', fontSize: 14, color: c.textMuted }}>Altere sua senha de acesso ao Finora.</p>
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(['current', 'newPw', 'confirm'] as const).map((field) => {
            const labels = { current: 'Senha atual', newPw: 'Nova senha', confirm: 'Confirmar nova senha' };
            return (
              <div key={field} style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textSecondary, marginBottom: 4 }}>
                  {labels[field]}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw[field] ? 'text' : 'password'}
                    value={pwForm[field]}
                    onChange={e => setPwForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={field === 'current' ? '••••••••' : 'Mínimo 6 caracteres'}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 40px 10px 12px', borderRadius: 9,
                      border: `1.5px solid ${c.border}`, background: c.surface,
                      color: c.text, fontSize: 14, outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(prev => ({ ...prev, [field]: !prev[field] }))}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: c.textMuted,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPw[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            );
          })}

          {pwError && (
            <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontWeight: 500 }}>⚠️ {pwError}</p>
          )}
          {pwSuccess && (
            <p style={{ margin: 0, fontSize: 13, color: '#16a34a', fontWeight: 500 }}>✅ Senha alterada com sucesso!</p>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            style={{
              padding: '10px 20px', borderRadius: 9, border: 'none',
              background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: pwLoading ? 'not-allowed' : 'pointer', opacity: pwLoading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
            }}
          >
            {pwLoading ? <Loader size={15} className="animate-spin" /> : <Shield size={15} />}
            {pwLoading ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>

        <div style={{ height: 1, background: c.border, margin: '22px 0' }} />

        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: c.text }}>Verificação em duas etapas (2FA)</h3>
        <TwoFactorSetup />
      </Section>

      <Section icon={<Download size={17}/>} title="Backup e exportação">
        <DataExport />
      </Section>

      {/* Push notifications */}
      <Section icon={<Bell size={17}/>} title="Notificações">
        <p style={{ margin: '0 0 16px', fontSize: 14, color: c.textMuted }}>
          Receba alertas do navegador quando uma conta estiver próxima do vencimento.
        </p>
        {notifStatus === 'granted' ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10, background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
            <Check size={16} color="#16a34a"/>
            <span style={{ fontSize:14, color:'#166534', fontWeight:500 }}>Notificações ativadas!</span>
          </div>
        ) : notifStatus === 'denied' ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10, background:'#fef2f2', border:'1px solid #fecaca' }}>
            <BellOff size={16} color="#dc2626"/>
            <div>
              <p style={{ margin:0, fontSize:14, color:'#dc2626', fontWeight:500 }}>Notificações bloqueadas</p>
              <p style={{ margin:'2px 0 0', fontSize:12, color:'#ef4444' }}>Habilite nas configurações do navegador.</p>
            </div>
          </div>
        ) : (
          <button onClick={requestNotifications} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(99,102,241,0.3)' }}>
            <Bell size={16}/> Ativar notificações
          </button>
        )}
      </Section>

      {/* Accent color */}
      <Section icon={<Palette size={17}/>} title="Cor de Destaque">
        <p style={{ margin: '0 0 16px', fontSize: 14, color: c.textMuted }}>
          Personalize a cor principal do Finora.
        </p>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
          {ACCENT_COLORS.map(col => (
            <button key={col} onClick={() => setAccentColor(col)} style={{ width:36, height:36, borderRadius:'50%', background:col, border:accentColor===col?`4px solid ${c.text}`:'4px solid transparent', cursor:'pointer', transition:'transform 0.15s', transform:accentColor===col?'scale(1.2)':'scale(1)' }}/>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <label style={{ fontSize:13, color:c.textMuted, fontWeight:500 }}>Cor personalizada:</label>
          <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width:40, height:36, border:'none', borderRadius:8, cursor:'pointer', background:'none' }}/>
          <span style={{ fontSize:13, color:c.textFaint, fontFamily:'monospace' }}>{accentColor}</span>
        </div>
        <button onClick={saveAccent} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, border:'none', background:accentSaved?'#22c55e':accentColor, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>
          <Check size={16}/>{accentSaved?'Salvo!':'Aplicar cor'}
        </button>
      </Section>

      {/* WhatsApp tips */}
      <Section icon={<MessageSquare size={17}/>} title="Como usar pelo WhatsApp">
        <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          {[
            'Salve o número do Finora na sua agenda',
            'Envie: "Gastei R$ 50 no mercado"',
            'Consultas: "Quanto gastei este mês?"',
            'Resumo: "Resumo do dia"',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 3 ? 10 : 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
              <p style={{ margin: 0, fontSize: 14, color: '#166534' }}>{tip}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: c.textFaint, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Exemplos de mensagens</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['"Gastei 45 no mercado"','"Recebi 3500 de salário"','"Quanto gastei este mês?"','"Resumo do dia"'].map(ex => (
            <span key={ex} style={{ padding: '4px 10px', background: c.inputBg, borderRadius: 6, fontSize: 13, color: c.textSecondary, fontFamily: 'monospace' }}>{ex}</span>
          ))}
        </div>
      </Section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Section({ icon, title, children }: any) {
  const { c } = useTheme();
  return (
    <div style={{ background: c.surface, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${c.borderLight}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color: c.textMuted }}>{icon}</div>
        <h2 style={{ margin: 0, fontWeight: 600, fontSize: 15, color: c.textSecondary }}>{title}</h2>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

function Label({ children }: any) {
  const { c } = useTheme();
  return <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: c.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>{children}</label>;
}
