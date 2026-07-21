/**
 * Back-office HGWF — outil Studio fidèle à la maquette Back-office HGWF.dc.html.
 * Données stockées dans Sanity (demandeDevis, expedition, clientFiche,
 * conteneurOccasion, rotation, statsMensuelles), mutations via le client
 * authentifié du Studio.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useClient, useCurrentUser } from 'sanity';
import * as XLSX from 'xlsx';
import { STATUTS_DEMANDE } from '../../schemaTypes/backoffice/demandeDevis';
import { ETAPES_EXPEDITION } from '../../schemaTypes/backoffice/expedition';
import { STATUTS_CONTENEUR } from '../../schemaTypes/backoffice/conteneurOccasion';

// ── Palette HGWF ──────────────────────────────────────────────────────────────
const MARINE = '#12395B';
const CREME = '#FBF4E6';
const IVOIRE = '#FFFDF8';
const CIEL = '#4EA8DE';
const CORAIL = '#FF6F5E';
const OR = '#FFB23E';
const ENCRE = '#29638D';
const ROUGE = '#C24435';
const SANS = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'Space Mono', monospace";

// ── Types documents ───────────────────────────────────────────────────────────
type Demande = {
  _id: string;
  _updatedAt?: string;
  reference: string;
  clientNom?: string;
  contact?: string;
  typeEnvoi?: string;
  destination?: string;
  volume?: string;
  recueLe?: string;
  statut?: number;
  message?: string;
};
type Expedition = {
  _id: string;
  _updatedAt?: string;
  reference: string;
  clientNom?: string;
  trajet?: string;
  etape?: number;
  eta?: string;
};
type ClientFiche = {
  _id: string;
  nom: string;
  contact?: string;
  destination?: string;
  envois?: number;
  volume?: string;
};
type Conteneur = {
  _id: string;
  _updatedAt?: string;
  reference: string;
  taille?: string;
  etat?: string;
  lieu?: string;
  prix?: string;
  statut?: number;
};
type Rotation = { _id: string; nom: string; cloture?: string; depart?: string; remplissage?: number };
type Stats = {
  volumeMoisEnCours?: string;
  progression?: string;
  barres?: { mois?: string; valeur?: number }[];
};

type Vue = 'dashboard' | 'devis' | 'expeditions' | 'clients' | 'conteneurs';

const ACTIONS_DEMANDE = ['Prendre en charge', 'Envoyer le devis', 'Marquer acceptée', "Créer l'expédition"];
const ACTIONS_CONTENEUR = ['Réserver', 'Marquer vendu', 'Remettre en stock'];
const TITRES: Record<Vue, string> = {
  dashboard: 'Tableau de bord.',
  devis: 'Demandes de devis.',
  expeditions: 'Expéditions.',
  clients: 'Clients.',
  conteneurs: "Conteneurs d'occasion.",
};

// ── Styles réutilisés ─────────────────────────────────────────────────────────
const carte: CSSProperties = {
  border: `1px solid rgba(18,57,91,0.12)`,
  borderRadius: 20,
  background: IVOIRE,
};
const eyebrow: CSSProperties = {
  fontWeight: 500,
  fontSize: 10,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: ENCRE,
};
const champ: CSSProperties = {
  fontSize: 14,
  fontFamily: SANS,
  color: MARINE,
  background: IVOIRE,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1.5px solid rgba(18,57,91,0.2)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
const boutonPlein: CSSProperties = {
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: 14,
  whiteSpace: 'nowrap',
  background: CORAIL,
  color: CREME,
  border: 'none',
  borderRadius: 999,
  padding: '10px 22px',
  cursor: 'pointer',
};
const boutonContour: CSSProperties = {
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: 14,
  whiteSpace: 'nowrap',
  border: `1.5px solid ${MARINE}`,
  color: MARINE,
  background: 'none',
  borderRadius: 999,
  padding: '10px 22px',
  cursor: 'pointer',
};
const boutonRond: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: '1px solid rgba(18,57,91,0.2)',
  background: 'none',
  cursor: 'pointer',
  color: MARINE,
};

const badgeBase: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  padding: '5px 10px',
  borderRadius: 999,
  justifySelf: 'start',
};
const BADGES_DEMANDE: CSSProperties[] = [
  { background: 'rgba(255,111,94,0.15)', color: ROUGE },
  { background: 'rgba(255,178,62,0.2)', color: '#8A5A10' },
  { background: 'rgba(78,168,222,0.18)', color: '#1F5E8A' },
  { background: MARINE, color: CREME },
];
function badgeEtape(i: number): CSSProperties {
  return {
    ...badgeBase,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    ...(i === 4
      ? { background: MARINE, color: CREME }
      : i >= 2
        ? { background: 'rgba(78,168,222,0.18)', color: '#1F5E8A' }
        : { background: CREME, color: MARINE, border: '1px solid rgba(18,57,91,0.2)' }),
  };
}
const BADGES_CONTENEUR: CSSProperties[] = [
  { background: 'rgba(78,168,222,0.18)', color: '#1F5E8A' },
  { background: 'rgba(255,178,62,0.2)', color: '#8A5A10' },
  { background: MARINE, color: CREME },
];
const AVATARS = [CORAIL, CIEL, OR, MARINE];

function IconeExport() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function fmtQuand(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slug(ref: string): string {
  return ref.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// Bornage des index de statut/étape (les tableaux sont des tuples fixes).
const clampDemande = (i?: number) => Math.min(3, Math.max(0, i ?? 0)) as 0 | 1 | 2 | 3;
const clampEtape = (i?: number) => Math.min(4, Math.max(0, i ?? 0)) as 0 | 1 | 2 | 3 | 4;
const clampConteneur = (i?: number) => Math.min(2, Math.max(0, i ?? 0)) as 0 | 1 | 2;
const TONES_DEMANDE = [CORAIL, OR, CIEL, MARINE] as const;

// ── Composant principal ───────────────────────────────────────────────────────
export function BackOffice() {
  const client = useClient({ apiVersion: '2024-10-01' });
  const user = useCurrentUser();

  const [vue, setVue] = useState<Vue>('dashboard');
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState(-1);
  const [selection, setSelection] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [clients, setClients] = useState<ClientFiche[]>([]);
  const [conteneurs, setConteneurs] = useState<Conteneur[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [clientForm, setClientForm] = useState<(Partial<ClientFiche> & { envoisTexte?: string }) | null>(null);
  const [conteneurForm, setConteneurForm] = useState<Partial<Conteneur> | null>(null);

  const charger = useCallback(async () => {
    const data = await client.fetch<{
      demandes: Demande[];
      expeditions: Expedition[];
      clients: ClientFiche[];
      conteneurs: Conteneur[];
      rotations: Rotation[];
      stats: Stats | null;
    }>(`{
      "demandes": *[_type == "demandeDevis"] | order(reference desc){_id, _updatedAt, reference, clientNom, contact, typeEnvoi, destination, volume, recueLe, statut, message},
      "expeditions": *[_type == "expedition"] | order(_updatedAt desc){_id, _updatedAt, reference, clientNom, trajet, etape, eta},
      "clients": *[_type == "clientFiche"] | order(nom asc){_id, nom, contact, destination, envois, volume},
      "conteneurs": *[_type == "conteneurOccasion"] | order(reference asc){_id, _updatedAt, reference, taille, etat, lieu, prix, statut},
      "rotations": *[_type == "rotation"] | order(cloture asc){_id, nom, cloture, depart, remplissage},
      "stats": *[_type == "statsMensuelles"][0]{volumeMoisEnCours, progression, barres[]{mois, valeur}}
    }`);
    setDemandes(data.demandes);
    setExpeditions(data.expeditions);
    setClients(data.clients);
    setConteneurs(data.conteneurs);
    setRotations(data.rotations);
    setStats(data.stats);
    setChargement(false);
  }, [client]);

  useEffect(() => {
    charger();
  }, [charger]);

  const q = recherche.trim().toLowerCase();

  // ── Dérivés ──
  const demandesFiltrees = demandes
    .filter((d) => filtre === -1 || (d.statut ?? 0) === filtre)
    .filter(
      (d) =>
        !q ||
        `${d.reference}${d.clientNom ?? ''}${d.destination ?? ''}${d.typeEnvoi ?? ''}`.toLowerCase().includes(q),
    );
  const sel = demandes.find((d) => d._id === selection) ?? demandesFiltrees[0] ?? demandes[0] ?? null;

  const kpiNouvelles = demandes.filter((d) => (d.statut ?? 0) === 0).length;
  const kpiEnvoyes = demandes.filter((d) => d.statut === 2).length;
  const kpiEnMer = expeditions.filter((x) => x.etape === 2).length;

  const activite = useMemo(() => {
    const evts: { texte: string; quand?: string; tone: string }[] = [];
    for (const d of demandes) {
      evts.push({
        texte: `Demande ${d.reference} — ${d.clientNom ?? '?'}, ${d.typeEnvoi ?? 'envoi'} vers ${d.destination ?? '?'} (${STATUTS_DEMANDE[clampDemande(d.statut)].toLowerCase()}).`,
        quand: d._updatedAt,
        tone: TONES_DEMANDE[clampDemande(d.statut)],
      });
    }
    for (const x of expeditions) {
      evts.push({
        texte: `${x.reference} — ${ETAPES_EXPEDITION[clampEtape(x.etape)]} (${x.trajet ?? ''}).`,
        quand: x._updatedAt,
        tone: (x.etape ?? 0) >= 4 ? MARINE : CIEL,
      });
    }
    for (const k of conteneurs) {
      if ((k.statut ?? 0) > 0) {
        evts.push({
          texte: `Conteneur ${k.reference} ${STATUTS_CONTENEUR[clampConteneur(k.statut)].toLowerCase()} (${k.lieu ?? ''}).`,
          quand: k._updatedAt,
          tone: OR,
        });
      }
    }
    return evts.sort((a, b) => (b.quand ?? '').localeCompare(a.quand ?? '')).slice(0, 5);
  }, [demandes, expeditions, conteneurs]);

  // ── Mutations ──
  const avancerStatutDemande = async () => {
    if (!sel) return;
    const statut = sel.statut ?? 0;
    if (statut < 3) {
      setDemandes((prev) => prev.map((d) => (d._id === sel._id ? { ...d, statut: statut + 1 } : d)));
      await client.patch(sel._id).set({ statut: statut + 1 }).commit();
    } else {
      const id = `expedition-${slug(sel.reference)}`;
      const nouvelle: Expedition = {
        _id: id,
        reference: sel.reference,
        clientNom: sel.clientNom,
        trajet: `Le Havre → ${sel.destination ?? ''}`,
        etape: 0,
        eta: 'À PLANIFIER',
      };
      await client.createIfNotExists({ ...nouvelle, _type: 'expedition' });
      setExpeditions((prev) => (prev.some((x) => x._id === id) ? prev : [nouvelle, ...prev]));
      setVue('expeditions');
    }
  };

  const bougerExpedition = async (x: Expedition, delta: 1 | -1) => {
    const etape = Math.max(0, Math.min(4, (x.etape ?? 0) + delta));
    setExpeditions((prev) => prev.map((e) => (e._id === x._id ? { ...e, etape } : e)));
    await client.patch(x._id).set({ etape }).commit();
  };

  const enregistrerClient = async () => {
    const f = clientForm;
    if (!f || !f.nom?.trim()) {
      setClientForm(null);
      return;
    }
    const fiche = {
      nom: f.nom.trim(),
      contact: f.contact ?? '',
      destination: f.destination ?? '',
      envois: parseInt(f.envoisTexte ?? '') || 0,
      volume: f.volume ?? '',
    };
    if (f._id) {
      await client.patch(f._id).set(fiche).commit();
      setClients((prev) => prev.map((c) => (c._id === f._id ? { ...c, ...fiche } : c)));
    } else {
      const cree = await client.create({ _type: 'clientFiche', ...fiche });
      setClients((prev) =>
        [...prev, { _id: cree._id, ...fiche }].sort((a, b) => a.nom.localeCompare(b.nom)),
      );
    }
    setClientForm(null);
  };

  const supprimerClient = async (c: ClientFiche) => {
    if (!window.confirm(`Supprimer la fiche client « ${c.nom} » ?`)) return;
    setClients((prev) => prev.filter((x) => x._id !== c._id));
    await client.delete(c._id);
  };

  const enregistrerConteneur = async () => {
    const f = conteneurForm;
    if (!f || !f.reference?.trim()) {
      setConteneurForm(null);
      return;
    }
    const fiche = {
      reference: f.reference.trim(),
      taille: f.taille ?? '',
      etat: f.etat ?? '',
      lieu: f.lieu ?? '',
      prix: f.prix ?? '',
    };
    if (f._id) {
      await client.patch(f._id).set(fiche).commit();
      setConteneurs((prev) => prev.map((k) => (k._id === f._id ? { ...k, ...fiche } : k)));
    } else {
      const cree = await client.create({ _type: 'conteneurOccasion', ...fiche, statut: 0 });
      setConteneurs((prev) => [...prev, { _id: cree._id, ...fiche, statut: 0 }]);
    }
    setConteneurForm(null);
  };

  const supprimerConteneur = async (k: Conteneur) => {
    if (!window.confirm(`Supprimer le conteneur « ${k.reference} » ?`)) return;
    setConteneurs((prev) => prev.filter((x) => x._id !== k._id));
    await client.delete(k._id);
  };

  const cyclerConteneur = async (k: Conteneur) => {
    const statut = ((k.statut ?? 0) + 1) % 3;
    setConteneurs((prev) => prev.map((c) => (c._id === k._id ? { ...c, statut } : c)));
    await client.patch(k._id).set({ statut }).commit();
  };

  // ── Exports XLSX ──
  const exporterTout = () => {
    const rows = [
      ['Référence', 'Client', 'Contact', "Type d'envoi", 'Destination', 'Volume', 'Reçue le', 'Statut', 'Message'],
      ...demandes.map((d) => [
        d.reference,
        d.clientNom ?? '',
        d.contact ?? '',
        d.typeEnvoi ?? '',
        d.destination ?? '',
        d.volume ?? '',
        d.recueLe ?? '',
        STATUTS_DEMANDE[d.statut ?? 0],
        d.message ?? '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 17 }, { wch: 20 }, { wch: 32 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Demandes de devis');
    XLSX.writeFile(wb, 'HGWF-demandes-devis.xlsx');
  };

  const telechargerFiche = () => {
    if (!sel) return;
    const rows = [
      ['FICHE DE DEVIS — HGWF CARGO', ''],
      ['Référence', sel.reference],
      ['Statut', STATUTS_DEMANDE[sel.statut ?? 0]],
      ['Client', sel.clientNom ?? ''],
      ['Contact', sel.contact ?? ''],
      ["Type d'envoi", sel.typeEnvoi ?? ''],
      ['Destination', sel.destination ?? ''],
      ['Volume estimé', sel.volume ?? ''],
      ['Reçue le', sel.recueLe ?? ''],
      ['Message', sel.message ?? ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 22 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Devis');
    XLSX.writeFile(wb, `${sel.reference}.xlsx`);
  };

  // ── Rendu ──
  const menu: { id: Vue; label: string; badge?: string }[] = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'devis', label: 'Demandes de devis', badge: kpiNouvelles ? String(kpiNouvelles) : undefined },
    { id: 'expeditions', label: 'Expéditions' },
    { id: 'clients', label: 'Clients' },
    { id: 'conteneurs', label: 'Conteneurs' },
  ];

  const prochaine = rotations[0];
  const initiale = (user?.name ?? 'H').charAt(0).toUpperCase();
  const aujourdHui = new Date()
    .toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    .toUpperCase();

  const barres = stats?.barres ?? [];
  const maxBarre = Math.max(1, ...barres.map((b) => b.valeur ?? 0));

  return (
    <div style={{ fontFamily: SANS, color: MARINE, background: IVOIRE, minHeight: '100%', display: 'flex' }}>
      <style>
        {`@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap");`}
      </style>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 250,
          flexShrink: 0,
          background: MARINE,
          color: CREME,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
          padding: '24px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px 22px' }}>
          <img
            src="/static/embleme.svg"
            width={42}
            height={42}
            alt="HGWF Cargo"
            style={{ borderRadius: '50%', boxShadow: '0 0 0 2px rgba(251,244,230,0.35)' }}
          />
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: 17, lineHeight: 1 }}>HGWF</span>
            <span style={{ fontWeight: 500, fontSize: 8, letterSpacing: '0.42em', color: OR, textTransform: 'uppercase' }}>
              Back-office
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menu.map((m) => (
            <button
              key={m.id}
              onClick={() => setVue(m.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: 14,
                padding: '11px 14px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: vue === m.id ? 'rgba(251,244,230,0.14)' : 'none',
                color: vue === m.id ? CREME : 'rgba(251,244,230,0.7)',
              }}
            >
              <span>{m.label}</span>
              {m.badge && (
                <span style={{ fontFamily: MONO, fontSize: 11, background: CORAIL, color: CREME, borderRadius: 999, padding: '2px 8px' }}>
                  {m.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {prochaine && (
            <div
              style={{
                background: 'rgba(251,244,230,0.1)',
                border: '1px solid rgba(251,244,230,0.2)',
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span style={{ fontWeight: 500, fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: OR }}>
                Prochaine clôture
              </span>
              <span style={{ fontFamily: MONO, fontSize: 13 }}>{prochaine.nom.toUpperCase()}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: CIEL }}>
                CLÔTURE {prochaine.cloture} · DÉPART {prochaine.depart}
              </span>
            </div>
          )}
          <div style={{ borderTop: '1px solid rgba(251,244,230,0.18)', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: CORAIL,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {initiale}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{user?.name ?? 'Équipe HGWF'}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{user?.roles?.[0]?.title ?? 'Équipe'}</span>
            </span>
          </div>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <main style={{ flex: 1, minWidth: 0, padding: '28px 40px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: 26, letterSpacing: '-0.03em' }}>{TITRES[vue]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher réf, client, destination…"
              style={{ ...champ, borderRadius: 999, padding: '10px 16px', width: 280 }}
            />
            <span style={{ fontFamily: MONO, fontSize: 12, color: ENCRE }}>{aujourdHui}</span>
          </div>
        </div>

        {chargement ? (
          <p style={{ margin: 0, color: ENCRE }}>Chargement…</p>
        ) : (
          <>
            {vue === 'dashboard' && (
              <VueDashboard
                kpiNouvelles={kpiNouvelles}
                kpiEnvoyes={kpiEnvoyes}
                kpiEnMer={kpiEnMer}
                stats={stats}
                barres={barres}
                maxBarre={maxBarre}
                activite={activite}
                rotations={rotations}
                allerDevis={() => setVue('devis')}
                allerExp={() => setVue('expeditions')}
              />
            )}

            {vue === 'devis' && (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[{ label: 'Toutes', val: -1 }, ...STATUTS_DEMANDE.map((s, i) => ({ label: s, val: i }))].map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setFiltre(f.val)}
                      style={{
                        fontFamily: SANS,
                        fontWeight: 500,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        borderRadius: 999,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        ...(filtre === f.val
                          ? { background: MARINE, color: CREME, border: `1.5px solid ${MARINE}` }
                          : { background: 'none', color: MARINE, border: '1.5px solid rgba(18,57,91,0.2)' }),
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                  <span style={{ flex: 1 }} />
                  <button
                    onClick={exporterTout}
                    style={{ ...boutonPlein, display: 'inline-flex', alignItems: 'center', gap: 8, background: MARINE, fontSize: 13, padding: '10px 20px' }}
                  >
                    <IconeExport />
                    Exporter tout (XLSX)
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(430px,1fr))', gap: 20, alignItems: 'start' }}>
                  <div style={{ ...carte, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(18,57,91,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <h2 style={{ margin: 0, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Demandes reçues.</h2>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: ENCRE }}>{demandesFiltrees.length} DEMANDES</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(96px,110px) minmax(0,1.2fr) minmax(0,1fr) auto',
                        gap: 12,
                        padding: '10px 24px',
                        background: CREME,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: ENCRE,
                      }}
                    >
                      <span>Réf.</span>
                      <span>Client · envoi</span>
                      <span>Destination</span>
                      <span>Statut</span>
                    </div>
                    {demandesFiltrees.map((d) => (
                      <button
                        key={d._id}
                        onClick={() => setSelection(d._id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(96px,110px) minmax(0,1.2fr) minmax(0,1fr) auto',
                          gap: 12,
                          alignItems: 'center',
                          width: '100%',
                          boxSizing: 'border-box',
                          overflowWrap: 'anywhere',
                          padding: '14px 24px',
                          border: 'none',
                          borderTop: '1px solid rgba(18,57,91,0.08)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          color: MARINE,
                          textAlign: 'left',
                          background: sel?._id === d._id ? CREME : IVOIRE,
                        }}
                      >
                        <span style={{ fontFamily: MONO, fontSize: 12 }}>{d.reference}</span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', minWidth: 0 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{d.clientNom}</span>
                          <span style={{ fontSize: 12, color: ENCRE }}>
                            {d.typeEnvoi} · {d.volume}
                          </span>
                        </span>
                        <span style={{ fontSize: 13, textAlign: 'left', minWidth: 0 }}>{d.destination}</span>
                        <span style={{ ...badgeBase, alignSelf: 'center', ...BADGES_DEMANDE[d.statut ?? 0] }}>
                          {STATUTS_DEMANDE[d.statut ?? 0]}
                        </span>
                      </button>
                    ))}
                    {!demandesFiltrees.length && (
                      <p style={{ margin: 0, padding: '18px 24px', fontSize: 13, color: ENCRE }}>Aucune demande.</p>
                    )}
                  </div>

                  {sel && (
                    <div style={{ ...carte, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 24, minWidth: 0 }}>
                      <span style={eyebrow}>Détail de la demande</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: MONO, fontSize: 18 }}>{sel.reference}</span>
                        <span style={{ ...badgeBase, ...BADGES_DEMANDE[sel.statut ?? 0] }}>{STATUTS_DEMANDE[sel.statut ?? 0]}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                        <LigneDetail libelle="Client" valeur={<b>{sel.clientNom}</b>} />
                        <LigneDetail
                          libelle="Contact"
                          valeur={<span style={{ fontFamily: MONO, fontSize: 12, overflowWrap: 'anywhere', textAlign: 'right' }}>{sel.contact}</span>}
                        />
                        <LigneDetail libelle="Envoi" valeur={<b>{sel.typeEnvoi}</b>} />
                        <LigneDetail libelle="Destination" valeur={<b>{sel.destination}</b>} />
                        <LigneDetail libelle="Volume estimé" valeur={<span style={{ fontFamily: MONO }}>{sel.volume}</span>} />
                        <LigneDetail libelle="Reçue le" valeur={<span style={{ fontFamily: MONO }}>{sel.recueLe}</span>} />
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: ENCRE, background: CREME, borderRadius: 12, padding: '12px 14px' }}>
                        {sel.message}
                      </p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button onClick={avancerStatutDemande} style={{ ...boutonPlein, padding: '11px 22px' }}>
                          {ACTIONS_DEMANDE[sel.statut ?? 0]}
                        </button>
                        <button onClick={telechargerFiche} style={{ ...boutonContour, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px' }}>
                          <IconeExport />
                          Fiche XLSX
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {vue === 'expeditions' && (
              <>
                <div style={{ ...carte, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(18,57,91,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ margin: 0, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Expéditions en cours.</h2>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: ENCRE }}>MISE À JOUR DE L'AVANCEMENT</span>
                  </div>
                  {expeditions
                    .filter((x) => !q || `${x.reference}${x.clientNom ?? ''}${x.trajet ?? ''}`.toLowerCase().includes(q))
                    .map((x) => (
                      <div
                        key={x._id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(110px,150px) minmax(0,1.3fr) minmax(0,1fr) auto',
                          gap: 14,
                          alignItems: 'center',
                          padding: '16px 24px',
                          borderTop: '1px solid rgba(18,57,91,0.08)',
                        }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <span style={{ fontFamily: MONO, fontSize: 13 }}>{x.reference}</span>
                          <span style={{ fontSize: 12, color: ENCRE }}>{x.clientNom}</span>
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{x.trajet}</span>
                          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {ETAPES_EXPEDITION.map((_, k) => (
                              <span
                                key={k}
                                style={{
                                  display: 'inline-block',
                                  width: 8 + k,
                                  height: 8 + k,
                                  borderRadius: '50%',
                                  ...(k < (x.etape ?? 0)
                                    ? { background: CIEL }
                                    : k === (x.etape ?? 0)
                                      ? { background: CORAIL }
                                      : { background: 'none', border: '1.5px solid rgba(18,57,91,0.25)' }),
                                }}
                              />
                            ))}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>ETA {x.eta}</span>
                        </span>
                        <span style={badgeEtape(x.etape ?? 0)}>{ETAPES_EXPEDITION[x.etape ?? 0]}</span>
                        <span style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => bougerExpedition(x, -1)} aria-label="Étape précédente" style={{ ...boutonRond, width: 36, height: 36 }}>
                            ←
                          </button>
                          <button
                            onClick={() => bougerExpedition(x, 1)}
                            style={{ ...boutonPlein, background: MARINE, fontSize: 13, padding: '9px 16px' }}
                          >
                            {(x.etape ?? 0) >= 4 ? 'Livré ✓' : 'Étape suivante →'}
                          </button>
                        </span>
                      </div>
                    ))}
                  {!expeditions.length && <p style={{ margin: 0, padding: '18px 24px', fontSize: 13, color: ENCRE }}>Aucune expédition.</p>}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: ENCRE }}>
                  Chaque avancement met à jour le statut visible par le client sur la page Suivi.
                </p>
              </>
            )}

            {vue === 'clients' && (
              <>
                {clientForm && (
                  <div style={{ ...carte, background: CREME, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{clientForm._id ? 'Modifier le client.' : 'Nouveau client.'}</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                      <input placeholder="Nom" value={clientForm.nom ?? ''} onChange={(e) => setClientForm({ ...clientForm, nom: e.target.value })} style={champ} />
                      <input placeholder="Contact (mail · tél)" value={clientForm.contact ?? ''} onChange={(e) => setClientForm({ ...clientForm, contact: e.target.value })} style={champ} />
                      <input placeholder="Destination habituelle" value={clientForm.destination ?? ''} onChange={(e) => setClientForm({ ...clientForm, destination: e.target.value })} style={champ} />
                      <input placeholder="Nb d'envois" value={clientForm.envoisTexte ?? ''} onChange={(e) => setClientForm({ ...clientForm, envoisTexte: e.target.value })} style={champ} />
                      <input placeholder="Volume cumulé" value={clientForm.volume ?? ''} onChange={(e) => setClientForm({ ...clientForm, volume: e.target.value })} style={champ} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={enregistrerClient} style={boutonPlein}>Enregistrer</button>
                      <button onClick={() => setClientForm(null)} style={boutonContour}>Annuler</button>
                    </div>
                  </div>
                )}
                <div style={{ ...carte, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(18,57,91,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Clients.</h2>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: ENCRE }}>{clients.length} FICHES</span>
                      <button
                        onClick={() => setClientForm({ nom: '', contact: '', destination: '', envoisTexte: '', volume: '' })}
                        style={{ ...boutonPlein, fontSize: 13, padding: '9px 18px' }}
                      >
                        + Nouveau client
                      </button>
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1.4fr) minmax(0,1fr) auto auto auto',
                      gap: 12,
                      padding: '10px 24px',
                      background: CREME,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: ENCRE,
                    }}
                  >
                    <span>Client</span>
                    <span>Contact</span>
                    <span>Destination habituelle</span>
                    <span>Envois</span>
                    <span>Volume</span>
                    <span />
                  </div>
                  {clients
                    .filter((c) => !q || `${c.nom}${c.contact ?? ''}${c.destination ?? ''}`.toLowerCase().includes(q))
                    .map((c, i) => (
                      <div
                        key={c._id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1.4fr) minmax(0,1fr) auto auto auto',
                          gap: 12,
                          alignItems: 'center',
                          padding: '14px 24px',
                          borderTop: '1px solid rgba(18,57,91,0.08)',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 13,
                              color: CREME,
                              flexShrink: 0,
                              background: AVATARS[i % AVATARS.length],
                            }}
                          >
                            {c.nom.charAt(0)}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{c.nom}</span>
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 12, minWidth: 0, overflowWrap: 'anywhere' }}>{c.contact}</span>
                        <span style={{ fontSize: 13, minWidth: 0 }}>{c.destination}</span>
                        <span style={{ fontFamily: MONO, fontSize: 13, textAlign: 'right' }}>{c.envois}</span>
                        <span style={{ fontFamily: MONO, fontSize: 13, color: ENCRE, textAlign: 'right' }}>{c.volume}</span>
                        <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setClientForm({ ...c, envoisTexte: String(c.envois ?? 0) })}
                            aria-label="Modifier"
                            title="Modifier"
                            style={boutonRond}
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => supprimerClient(c)}
                            aria-label="Supprimer"
                            title="Supprimer"
                            style={{ ...boutonRond, border: '1px solid rgba(255,111,94,0.4)', color: ROUGE }}
                          >
                            ✕
                          </button>
                        </span>
                      </div>
                    ))}
                  {!clients.length && <p style={{ margin: 0, padding: '18px 24px', fontSize: 13, color: ENCRE }}>Aucune fiche client.</p>}
                </div>
              </>
            )}

            {vue === 'conteneurs' && (
              <>
                {conteneurForm && (
                  <div style={{ ...carte, background: CREME, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{conteneurForm._id ? 'Modifier le conteneur.' : 'Nouveau conteneur.'}</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
                      <input placeholder="Référence (ex. CTN-20-130)" value={conteneurForm.reference ?? ''} onChange={(e) => setConteneurForm({ ...conteneurForm, reference: e.target.value })} style={champ} />
                      <input placeholder="Taille (20 / 40 pieds)" value={conteneurForm.taille ?? ''} onChange={(e) => setConteneurForm({ ...conteneurForm, taille: e.target.value })} style={champ} />
                      <input placeholder="État (A / B / C)" value={conteneurForm.etat ?? ''} onChange={(e) => setConteneurForm({ ...conteneurForm, etat: e.target.value })} style={champ} />
                      <input placeholder="Lieu" value={conteneurForm.lieu ?? ''} onChange={(e) => setConteneurForm({ ...conteneurForm, lieu: e.target.value })} style={champ} />
                      <input placeholder="Prix (ex. 1 450 €)" value={conteneurForm.prix ?? ''} onChange={(e) => setConteneurForm({ ...conteneurForm, prix: e.target.value })} style={champ} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={enregistrerConteneur} style={boutonPlein}>Enregistrer</button>
                      <button onClick={() => setConteneurForm(null)} style={boutonContour}>Annuler</button>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setConteneurForm({ reference: '', taille: '20 pieds', etat: 'A', lieu: 'Dépôt Rosny-sous-Bois', prix: '' })}
                    style={{ ...boutonPlein, fontSize: 13, padding: '9px 18px' }}
                  >
                    + Ajouter un conteneur
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                  {conteneurs
                    .filter((k) => !q || `${k.reference}${k.taille ?? ''}${k.lieu ?? ''}`.toLowerCase().includes(q))
                    .map((k) => (
                      <div key={k._id} style={{ ...carte, borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: MONO, fontSize: 14 }}>{k.reference}</span>
                          <span style={{ ...badgeBase, padding: '4px 10px', ...BADGES_CONTENEUR[k.statut ?? 0] }}>
                            {STATUTS_CONTENEUR[k.statut ?? 0]}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 18 }}>
                          {k.taille} · état {k.etat}
                        </span>
                        <span style={{ fontSize: 13, color: ENCRE }}>{k.lieu}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTop: '1px solid rgba(18,57,91,0.1)', paddingTop: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: MONO, fontSize: 18, color: CORAIL }}>{k.prix}</span>
                          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button onClick={() => setConteneurForm(k)} aria-label="Modifier" title="Modifier" style={boutonRond}>
                              ✎
                            </button>
                            <button
                              onClick={() => supprimerConteneur(k)}
                              aria-label="Supprimer"
                              title="Supprimer"
                              style={{ ...boutonRond, border: '1px solid rgba(255,111,94,0.4)', color: ROUGE }}
                            >
                              ✕
                            </button>
                            <button onClick={() => cyclerConteneur(k)} style={{ ...boutonContour, fontSize: 13, padding: '8px 16px' }}>
                              {ACTIONS_CONTENEUR[k.statut ?? 0]}
                            </button>
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                {!conteneurs.length && <p style={{ margin: 0, fontSize: 13, color: ENCRE }}>Aucun conteneur en stock.</p>}
                <p style={{ margin: 0, fontSize: 12, color: ENCRE }}>
                  Stock « dernier voyage » — Disponible → Réservé → Vendu (cliquer pour changer l'état).
                </p>
              </>
            )}
          </>
        )}

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: 12,
            color: ENCRE,
            borderTop: '1px solid rgba(18,57,91,0.1)',
            paddingTop: 16,
          }}
        >
          <span>Back-office HGWF Cargo.</span>
          <a href="http://localhost:3000/fr/" target="_blank" rel="noreferrer" style={{ fontWeight: 500, textDecoration: 'underline', color: MARINE }}>
            Voir le site public
          </a>
        </div>
      </main>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────
function LigneDetail({ libelle, valeur }: { libelle: string; valeur: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: ENCRE, flexShrink: 0 }}>{libelle}</span>
      {valeur}
    </div>
  );
}

function VueDashboard({
  kpiNouvelles,
  kpiEnvoyes,
  kpiEnMer,
  stats,
  barres,
  maxBarre,
  activite,
  rotations,
  allerDevis,
  allerExp,
}: {
  kpiNouvelles: number;
  kpiEnvoyes: number;
  kpiEnMer: number;
  stats: Stats | null;
  barres: { mois?: string; valeur?: number }[];
  maxBarre: number;
  activite: { texte: string; quand?: string; tone: string }[];
  rotations: Rotation[];
  allerDevis: () => void;
  allerExp: () => void;
}) {
  const kpiStyle: CSSProperties = {
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: SANS,
    ...carte,
    borderRadius: 16,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16 }}>
        <button onClick={allerDevis} style={kpiStyle}>
          <span style={eyebrow}>Nouvelles demandes</span>
          <span style={{ fontFamily: MONO, fontSize: 30, color: CORAIL }}>{kpiNouvelles}</span>
          <span style={{ fontSize: 12, color: ENCRE }}>à traiter sous 24–48 h</span>
        </button>
        <button onClick={allerDevis} style={kpiStyle}>
          <span style={eyebrow}>Devis envoyés</span>
          <span style={{ fontFamily: MONO, fontSize: 30, color: MARINE }}>{kpiEnvoyes}</span>
          <span style={{ fontSize: 12, color: ENCRE }}>en attente de réponse</span>
        </button>
        <button onClick={allerExp} style={kpiStyle}>
          <span style={eyebrow}>En mer</span>
          <span style={{ fontFamily: MONO, fontSize: 30, color: CIEL }}>{kpiEnMer}</span>
          <span style={{ fontSize: 12, color: ENCRE }}>conteneurs suivis</span>
        </button>
        <div style={{ ...kpiStyle, cursor: 'default', background: MARINE, border: 'none', color: CREME }}>
          <span style={{ ...eyebrow, color: OR }}>Volume expédié — mois en cours</span>
          <span style={{ fontFamily: MONO, fontSize: 30 }}>{stats?.volumeMoisEnCours ?? '—'}</span>
          <span style={{ fontSize: 12, opacity: 0.75 }}>{stats?.progression ?? ''}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20, alignItems: 'start' }}>
        <div style={{ ...carte, padding: 24, display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Volumes expédiés (m³).</h2>
            <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>{barres.length} DERNIERS MOIS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 160 }}>
            {barres.map((b, i) => (
              <div key={b.mois ?? i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>{b.valeur}</span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '100%',
                    maxWidth: 44,
                    borderRadius: '8px 8px 4px 4px',
                    height: Math.round(((b.valeur ?? 0) / maxBarre) * 96),
                    background: i === barres.length - 1 ? CORAIL : CIEL,
                  }}
                />
                <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>{b.mois}</span>
              </div>
            ))}
            {!barres.length && <p style={{ margin: 0, fontSize: 13, color: ENCRE }}>Renseignez les statistiques mensuelles.</p>}
          </div>
        </div>
        <div style={{ ...carte, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Activité récente.</h2>
          {activite.map((a) => (
            <div key={a.texte} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderTop: '1px solid rgba(18,57,91,0.08)', paddingTop: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: a.tone }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, lineHeight: 1.4 }}>{a.texte}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: ENCRE }}>{fmtQuand(a.quand)}</span>
              </span>
            </div>
          ))}
          {!activite.length && <p style={{ margin: 0, fontSize: 13, color: ENCRE }}>Aucune activité pour l'instant.</p>}
        </div>
      </div>

      <div style={{ ...carte, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(18,57,91,0.1)' }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Prochaines rotations.</h2>
        </div>
        {rotations.map((r) => {
          const plein = (r.remplissage ?? 0) >= 75;
          return (
            <div
              key={r._id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) auto',
                gap: 14,
                alignItems: 'center',
                padding: '14px 24px',
                borderTop: '1px solid rgba(18,57,91,0.08)',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>{r.nom}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: CORAIL }}>CLÔTURE {r.cloture}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: ENCRE }}>DÉPART {r.depart}</span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  padding: '5px 12px',
                  borderRadius: 999,
                  ...(plein
                    ? { background: 'rgba(255,111,94,0.15)', color: ROUGE }
                    : { background: 'rgba(78,168,222,0.18)', color: '#1F5E8A' }),
                }}
              >
                {r.remplissage ?? 0} %
              </span>
            </div>
          );
        })}
        {!rotations.length && <p style={{ margin: 0, padding: '16px 24px', fontSize: 13, color: ENCRE }}>Aucune rotation planifiée.</p>}
      </div>
    </div>
  );
}
