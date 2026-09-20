import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serveur } from '@/lib/supabase-serveur';

/**
 * Structure commune : un fond lavande, un grand panneau blanc arrondi, et le
 * rail d'icônes violet qui déborde sur la gauche.
 *
 * La navigation vit **uniquement** dans le rail. Elle était aussi répétée en
 * haut : deux chemins vers la même page, donc deux états actifs à tenir
 * synchronisés pour rien. La barre du haut ne garde que l'identité et la
 * sortie.
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

  const page = ONGLETS.find((o) => o.href === actif);

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
          <span className="identite">
            <span className="identite-nom">Box de stockage</span>
            <span className="identite-fil">HGWF Cargo{page && ` · ${page.libelle}`}</span>
          </span>

          <span className="barre-espace" />

          <span className="identite-compte">{user?.email}</span>

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
