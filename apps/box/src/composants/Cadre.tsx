import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serveur } from '@/lib/supabase-serveur';

/**
 * Structure commune, reprise du modèle : un fond lavande, un grand panneau
 * blanc arrondi posé dessus, un rail d'icônes violet qui déborde sur la gauche,
 * et une barre d'onglets soulignés en haut.
 *
 * Le rail ne porte que des icônes : chacune a donc un `title` et un
 * `aria-label`, sinon la navigation devient illisible au lecteur d'écran et
 * devinette à la souris.
 */

const ONGLETS = [
  { href: '/', libelle: 'Occupation', icone: 'ph-squares-four' },
  { href: '/clients', libelle: 'Clients', icone: 'ph-users-three' },
  { href: '/contrats', libelle: 'Contrats', icone: 'ph-file-text' },
  { href: '/echeances', libelle: 'Loyers', icone: 'ph-receipt' },
  { href: '/parametrage', libelle: 'Paramétrage', icone: 'ph-sliders-horizontal' },
];

async function seDeconnecter() {
  'use server';
  const client = await serveur();
  await client.auth.signOut();
  redirect('/connexion');
}

export default async function Cadre({
  actif,
  children,
}: {
  actif: string;
  children: React.ReactNode;
}) {
  const client = await serveur();
  const {
    data: { user },
  } = await client.auth.getUser();

  return (
    <div className="scene">
      <div className="panneau">
        <nav className="rail" aria-label="Navigation principale">
          {ONGLETS.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              title={o.libelle}
              aria-label={o.libelle}
              aria-current={actif === o.href ? 'page' : undefined}
            >
              <i className={`ph-duotone ${o.icone}`} aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <div className="barre">
          {ONGLETS.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="barre-onglet"
              aria-current={actif === o.href ? 'page' : undefined}
            >
              <i className={`ph-duotone ${o.icone}`} style={{ fontSize: 17 }} aria-hidden="true" />
              {o.libelle}
            </Link>
          ))}

          <span className="barre-espace" />

          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gris-doux)' }}>
            {user?.email}
          </span>

          <form action={seDeconnecter}>
            <button className="bouton-discret" type="submit">
              <i className="ph ph-sign-out" aria-hidden="true" /> Se déconnecter
            </button>
          </form>
        </div>

        <div className="corps">{children}</div>
      </div>
    </div>
  );
}
