'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return <button className="ghost-button" onClick={logout}>Salir</button>;
}
