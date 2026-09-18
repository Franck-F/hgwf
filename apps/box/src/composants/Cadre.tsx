import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serveur } from '@/lib/supabase-serveur';
import { CREME, IVOIRE, MARINE, MONO } from '@/lib/charte';

const ONGLETS = [
  { href: '/', libelle: 'Occupation' },
  { href: '/parametrage', libelle: 'Paramétrage' },
];

async function seDeconnecter() {
  'use server';
  const client = await serveur();
  await client.auth.signOut();
  redirect('/connexion');
}

export default async function Cadre({
  actif,
  titre,
  children,
}: {
  actif: string;
  titre: string;
  children: React.ReactNode;
}) {
  const client = await serveur();
  const {
    data: { user },
  } = await client.auth.getUser();

  return (
    <div style={{ minHeight: '100dvh' }}>
      <header
        style={{
          background: MARINE,
          color: CREME,
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 1 }}>HGWF · BOX</span>

        <nav style={{ display: 'flex', gap: 6 }}>
          {ONGLETS.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              style={{
                textDecoration: 'none',
                padding: '7px 13px',
                borderRadius: 7,
                fontSize: 14,
                background: actif === o.href ? CREME : 'transparent',
                color: actif === o.href ? MARINE : CREME,
                fontWeight: actif === o.href ? 700 : 400,
              }}
            >
              {o.libelle}
            </Link>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12.5, opacity: 0.8 }}>{user?.email}</span>
          <form action={seDeconnecter}>
            <button
              style={{
                background: 'transparent',
                color: CREME,
                border: `1px solid ${CREME}`,
                borderRadius: 7,
                padding: '6px 12px',
                fontSize: 13,
              }}
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </header>

      <main style={{ padding: '26px 24px 60px', maxWidth: 1180, margin: '0 auto' }}>
        <h1 style={{ fontSize: 23, margin: '0 0 20px' }}>{titre}</h1>
        {children}
      </main>
    </div>
  );
}

export const carte: React.CSSProperties = {
  background: IVOIRE,
  border: `1.5px solid rgba(18,57,91,0.18)`,
  borderRadius: 12,
  padding: 20,
};
