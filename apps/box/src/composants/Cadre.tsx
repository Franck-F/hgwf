import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serveur } from '@/lib/supabase-serveur';

/**
 * Structure commune : colonne de navigation à gauche, contenu à droite.
 *
 * Les icônes sont dessinées ici plutôt qu'importées d'une bibliothèque : deux
 * traits SVG ne justifient pas une dépendance de plusieurs centaines de
 * kilo-octets, ni un chargement supplémentaire au premier affichage.
 */

const ONGLETS = [
  {
    href: '/',
    libelle: 'Occupation',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/parametrage',
    libelle: 'Paramétrage',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
      </svg>
    ),
  },
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
  chapeau,
  actions,
  children,
}: {
  actif: string;
  titre: string;
  chapeau?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const client = await serveur();
  const {
    data: { user },
  } = await client.auth.getUser();

  return (
    <div className="app">
      <aside className="flanc">
        <div className="marque">
          <span className="marque-pastille" aria-hidden="true">
            HG
          </span>
          <span>
            <span className="marque-nom">Box de stockage</span>
            <br />
            <span className="marque-sous">HGWF Cargo</span>
          </span>
        </div>

        <nav style={{ display: 'contents' }}>
          {ONGLETS.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="onglet"
              aria-current={actif === o.href ? 'page' : undefined}
            >
              {o.icone}
              {o.libelle}
            </Link>
          ))}
        </nav>

        <div className="flanc-pied">
          <p className="flanc-identite">{user?.email}</p>
          <form action={seDeconnecter}>
            <button className="bouton-fantome" style={{ width: '100%' }}>
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <main className="contenu">
        <div className="entete">
          <div>
            <h1 className="titre">{titre}</h1>
            {chapeau && <p className="sous-titre">{chapeau}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
