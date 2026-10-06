'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const normalized = identifier.trim().toLowerCase();

    if (mode === 'register') {
      const redirectUrl = `${window.location.origin}/login`;
      const { error: signUpError } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: { emailRedirectTo: redirectUrl },
      });

      if (signUpError) {
        setError('No se pudo crear el acceso. Verifica el correo, la contraseña o si el usuario ya existe.');
        setLoading(false);
        return;
      }

      setMessage('Acceso creado. Revisa tu correo corporativo y confirma el enlace. Después volverás a GESA CONTROL para iniciar sesión.');
      setMode('login');
      setLoading(false);
      return;
    }

    const email = normalized === 'commercial' ? 'commercial@gesacontrol.local' : normalized;
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setError('No se pudo iniciar sesión. Verifica tu usuario/correo y contraseña.');
      setLoading(false);
      return;
    }

    const { data: internalProfile } = await supabase
      .from('usuarios_internos_gesa')
      .select('rol')
      .eq('usuario_id', data.user.id)
      .eq('activo', true)
      .maybeSingle();

    router.push(internalProfile ? '/comercial' : '/portal');
    router.refresh();
  }

  return (
    <form className="login-form gesa-login-form" onSubmit={handleSubmit}>
      <label>
        {mode === 'login' ? 'Usuario o correo' : 'Correo corporativo'}
        <span className="gesa-login-input-wrap">
          <UserRound size={19} strokeWidth={1.9} />
          <input
            type={mode === 'register' ? 'email' : 'text'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={mode === 'login' ? 'usuario o correo@empresa.com' : 'usuario@empresa.com'}
            autoComplete="username"
            required
          />
        </span>
      </label>

      <label>
        Contraseña
        <span className="gesa-login-input-wrap">
          <LockKeyhole size={18} strokeWidth={1.9} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
          <button
            type="button"
            className="gesa-password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </span>
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <button className="login-primary gesa-login-primary" type="submit" disabled={loading}>
        <span>{loading ? (mode === 'register' ? 'Creando acceso…' : 'Ingresando…') : (mode === 'register' ? 'Crear acceso inicial' : 'Ingresar a GESA CONTROL')}</span>
        {!loading && mode === 'login' ? <ArrowRight size={20} strokeWidth={2} /> : null}
      </button>

      <button
        type="button"
        className="login-secondary gesa-login-secondary"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError('');
          setMessage('');
        }}
      >
        {mode === 'login' ? 'Primera vez: crear mi acceso' : 'Ya tengo acceso: iniciar sesión'}
      </button>
    </form>
  );
}
