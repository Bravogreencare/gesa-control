'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
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
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="login-primary" type="submit" disabled={loading}>
        {loading ? 'Ingresando…' : 'Ingresar a GESA CONTROL'}
      </button>
      <a className="demo-link" href="/">Ver maqueta de presentación</a>
    </form>
  );
}
