'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();

    if (mode === 'register') {
      const redirectUrl = `${window.location.origin}/login`;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
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

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('No se pudo iniciar sesión. Verifica tu correo y contraseña.');
      setLoading(false);
      return;
    }

    router.push('/portal');
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Correo corporativo
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@empresa.com"
          autoComplete="email"
          required
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          minLength={8}
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      <button className="login-primary" type="submit" disabled={loading}>
        {loading ? (mode === 'register' ? 'Creando acceso…' : 'Ingresando…') : (mode === 'register' ? 'Crear acceso inicial' : 'Ingresar a GESA CONTROL')}
      </button>
      <button
        type="button"
        className="login-secondary"
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
