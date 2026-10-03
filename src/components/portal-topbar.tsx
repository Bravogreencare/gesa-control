import LogoutButton from '@/components/logout-button';

type Props = {
  selectedId: string;
  available: any[];
  userEmail?: string | null;
};

export default function PortalTopbar({ selectedId, available, userEmail }: Props) {
  return (
    <header className="topbar portal-topbar">
      <form method="get" className="company-form">
        <span className="label">Empresa</span>
        <select name="empresa" defaultValue={selectedId}>
          {available.map((m) => (
            <option key={m.empresa_id} value={m.empresa_id}>{m.empresas?.razon_social}</option>
          ))}
        </select>
        <button type="submit" className="small-button">Cambiar</button>
      </form>
      <div className="top-actions"><span className="user-email">{userEmail}</span><LogoutButton /></div>
    </header>
  );
}
