'use client';

/**
 * Saisie d'adresse assistée par la Base Adresse Nationale.
 *
 * Volontairement pas d'IA ici : une adresse est un fait, pas une rédaction.
 * api-adresse.data.gouv.fr est la source officielle, gratuite, sans clé, et
 * elle ne peut pas inventer une rue qui n'existe pas — ce qu'un modèle de
 * langage, lui, fait très bien.
 *
 * Choisir une suggestion remplit aussi le code postal et la ville du même
 * formulaire : c'est tout l'intérêt, éviter trois champs recopiés à la main.
 */
import { useEffect, useRef, useState } from 'react';

type Suggestion = { label: string; voie: string; codePostal: string; ville: string };

export default function ChampAdresse({
  nom,
  libelle,
  obligatoire,
  aide,
}: {
  nom: string;
  libelle: string;
  obligatoire?: boolean;
  aide?: string;
}) {
  const [valeur, setValeur] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  // Quatre caractères minimum, et 300 ms de silence avant d'interroger : sans
  // cela, taper une adresse déclenche une requête par frappe.
  useEffect(() => {
    const q = valeur.trim();
    if (q.length < 4) {
      setSuggestions([]);
      return;
    }

    const stop = new AbortController();
    const minuteur = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5&type=housenumber`,
          { signal: stop.signal },
        );
        if (!r.ok) return;
        const j = (await r.json()) as {
          features?: { properties: { label: string; name: string; postcode: string; city: string } }[];
        };
        setSuggestions(
          (j.features ?? []).map((f) => ({
            label: f.properties.label,
            voie: f.properties.name,
            codePostal: f.properties.postcode,
            ville: f.properties.city,
          })),
        );
        setOuvert(true);
      } catch {
        // Requête annulée ou service indisponible : la saisie manuelle reste
        // possible, l'assistance n'est jamais un passage obligé.
      }
    }, 300);

    return () => {
      clearTimeout(minuteur);
      stop.abort();
    };
  }, [valeur]);

  // Un clic ailleurs referme la liste.
  useEffect(() => {
    function dehors(e: MouseEvent) {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener('mousedown', dehors);
    return () => document.removeEventListener('mousedown', dehors);
  }, []);

  function choisir(s: Suggestion) {
    setValeur(s.voie);
    setOuvert(false);

    // Le formulaire parent porte les champs code_postal et ville : on les
    // remplit par le DOM plutôt que de remonter un état à travers trois
    // composants pour un gain de deux champs.
    const form = conteneur.current?.closest('form');
    if (!form) return;
    const poser = (champ: string, v: string) => {
      const el = form.querySelector<HTMLInputElement>(`input[name="${champ}"]`);
      if (el && !el.value) el.value = v;
    };
    poser('code_postal', s.codePostal);
    poser('ville', s.ville);
  }

  return (
    <div ref={conteneur} style={{ position: 'relative' }}>
      <label style={{ display: 'block' }}>
        <span className="etiquette">
          {libelle}
          {obligatoire && <span className="obligatoire"> *</span>}
        </span>
        <input
          className="champ"
          name={nom}
          required={obligatoire}
          autoComplete="off"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOuvert(true)}
        />
        {aide && <span className="aide">{aide}</span>}
      </label>

      {ouvert && suggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% - 18px)',
            left: 0,
            right: 0,
            margin: '4px 0 0',
            padding: 6,
            listStyle: 'none',
            background: 'var(--carte)',
            border: '1px solid var(--trait)',
            borderRadius: 'var(--r-controle)',
            boxShadow: 'var(--ombre-portee)',
          }}
        >
          {suggestions.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => choisir(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--champ)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {s.label}
              </button>
            </li>
          ))}
          <li
            style={{
              padding: '7px 10px 3px',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: 0.6,
              color: 'var(--texte-faible)',
            }}
          >
            BASE ADRESSE NATIONALE
          </li>
        </ul>
      )}
    </div>
  );
}
