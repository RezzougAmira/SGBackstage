import { useEffect, useMemo, useRef, useState } from "react";
import { User } from "../types";
import { ConfirmModal } from "../components/ConfirmModal";
import { Pagination } from "../components/Pagination";
import { authApi } from "../api/auth";
import { useAuth } from "../hooks/useAuth";
import { useProtectedImage } from "../hooks/useProtectedImage";
import { ROLES, roleLabel } from "../utils/roles";

/**
 * Champ du formulaire de création : libellé discret, valeur vide visible et
 * placeholder explicite. On neutralise l'autofill du navigateur — sinon Chrome
 * pré-remplit « admin@agb.com » et le champ paraît déjà renseigné.
 */
function ChampFormulaire({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete = "off",
  suffixe,
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  suffixe?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
        {label}
      </span>
      <div className="relative mt-1">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2.5 font-poppins text-sm text-[#0c1d31] placeholder:text-[#b6c0cc] focus:border-[#003049] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25"
        />
        {suffixe && <span className="absolute right-3 top-1/2 -translate-y-1/2">{suffixe}</span>}
      </div>
    </label>
  );
}

/** Nombre de comptes affichés par page de la liste. */
const PAGE_SIZE = 10;

function formatDate(valeur: string): string {
  return new Date(valeur).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Date compacte pour le tableau (13/10/2025), formatDate étant trop proseuse. */
function dateCourte(valeur: string): string {
  return new Date(valeur).toLocaleDateString("fr-FR");
}

/** Colonnes sur lesquelles le tableau est triable. */
type ColonneTri = "name" | "email" | "role" | "blocked" | "created_at";

/**
 * En-tête de colonne cliquable : le clic alterne croissant/décroissant, et la
 * flèche n'apparaît que sur la colonne triée.
 */
function EnteteTrie({
  libelle,
  colonne,
  tri,
  onToggle,
}: {
  libelle: string;
  colonne: ColonneTri;
  tri: { col: ColonneTri; sens: "asc" | "desc" };
  onToggle: (colonne: ColonneTri) => void;
}) {
  const actif = tri.col === colonne;
  const asc = actif && tri.sens === "asc";
  return (
    <th
      aria-sort={actif ? (asc ? "ascending" : "descending") : "none"}
      className="pb-3 text-left"
    >
      <button
        type="button"
        onClick={() => onToggle(colonne)}
        title={`Trier par ${libelle.toLowerCase()}`}
        className={`inline-flex items-center gap-1 font-poppins text-xs font-bold uppercase tracking-wider transition ${
          actif
            ? "text-[#003049] dark:text-white"
            : "text-[#525f6d] hover:text-[#003049] dark:text-white/50 dark:hover:text-white"
        }`}
      >
        {libelle}
        <svg
          className={`h-3 w-3 transition-opacity ${actif ? "opacity-100" : "opacity-0"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          aria-hidden="true"
        >
          {asc ? (
            <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>
    </th>
  );
}

/**
 * Avatar de la liste des utilisateurs. Les photos vivent dans le bucket privé :
 * on les charge via l'API authentifiée, comme sur la page Mon profil.
 */
function PhotoUtilisateur({ user, className }: { user: User; className: string }) {
  const src = useProtectedImage(user.avatar_key);
  if (!src) return null;
  return <img alt="" className={className} src={src} />;
}

function InfoCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-white px-6 py-4 dark:bg-[#131313]">
      <dt className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
        {label}
      </dt>
      <dd
        className={`mt-1 font-poppins text-sm capitalize ${
          accent ?? "text-[#0c1d31] dark:text-white"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Gestion des utilisateurs — rubrique Administration.
 *
 * Distinguée de MonProfilPage : ici un admin gère tous les comptes (rôles,
 * blocage, création). Chaque utilisateur ne peut modifier que son propre profil
 * via /profil.
 */
export function ProfilePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Édition du compte ouvert dans la fenêtre de détail : null = lecture seule.
  const [editionUser, setEditionUser] = useState<{
    name: string;
    email: string;
    role: string;
    blocked: number;
  } | null>(null);
  const [enregistrementUser, setEnregistrementUser] = useState(false);
  const [erreurUser, setErreurUser] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "", name: "", role: "contributor" });
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Compte connecté : sert à protéger sa propre ligne (pas d'auto-blocage).
  const { user: moi } = useAuth();

  // Filtres et tri du tableau (côté client).
  const [filtreRole, setFiltreRole] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [tri, setTri] = useState<{ col: ColonneTri; sens: "asc" | "desc" }>({
    col: "name",
    sens: "asc",
  });

  // Confirmation de blocage en attente, et message de confirmation éphémère.
  const [aConfirmer, setAConfirmer] = useState<User | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const minuteur = useRef<number>();

  // Réinitialisation de mot de passe d'un compte (cible + formulaire).
  const [reinitUser, setReinitUser] = useState<User | null>(null);
  const [reinitMdp, setReinitMdp] = useState("");
  const [reinitVisible, setReinitVisible] = useState(false);
  const [reinitErreur, setReinitErreur] = useState<string | null>(null);
  const [reinitEnCours, setReinitEnCours] = useState(false);

  /** Message de succès en bas à droite, effacé après 3 s (comme MasquesPage). */
  const show = (message: string) => {
    setToast(message);
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => setToast(null), 3000);
  };

  // Nettoyage du minuteur au démontage de la page.
  useEffect(() => () => window.clearTimeout(minuteur.current), []);

  const fermerFormulaire = () => {
    setShowForm(false);
    setFormData({ email: "", password: "", name: "", role: "developer" });
    setErreurCreation(null);
    setMotDePasseVisible(false);
  };

  // Aperçu de la photo dans la fenêtre d'édition : lecture seule, la photo
  // reste la propriété de l'utilisateur concerné.
  const photoAffichee = useProtectedImage(
    editionUser ? selectedUser?.avatar_key : null,
  );

  const fermerDetail = () => {
    setSelectedUser(null);
    setEditionUser(null);
    setErreurUser(null);
  };

  const fetchUsers = async () => {
    try {
      const data = await authApi.listUsers();
      setUsers(data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Une nouvelle recherche ou un nouveau filtre repart à la première page.
  useEffect(() => setPage(1), [search, filtreRole, filtreStatut]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const correspond =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);
      const roleOk = !filtreRole || u.role === filtreRole;
      const statutOk =
        !filtreStatut || (filtreStatut === "bloque" ? !!u.blocked : !u.blocked);
      return correspond && roleOk && statutOk;
    });
  }, [users, search, filtreRole, filtreStatut]);

  // Tri de la liste filtrée avant pagination.
  const tries = useMemo(() => {
    const comparateur = (a: User, b: User): number => {
      switch (tri.col) {
        case "email":
          return a.email.localeCompare(b.email, "fr");
        case "role":
          return a.role.localeCompare(b.role, "fr");
        case "blocked":
          return Number(a.blocked) - Number(b.blocked);
        case "created_at":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return a.name.localeCompare(b.name, "fr");
      }
    };
    const copie = [...filtered].sort(comparateur);
    return tri.sens === "desc" ? copie.reverse() : copie;
  }, [filtered, tri]);

  const pageItems = useMemo(
    () => tries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [tries, page]
  );

  // Compteurs d'aperçu : l'état global des comptes, indépendant des filtres.
  const totalActifs = users.filter((u) => !u.blocked).length;
  const totalBloques = users.length - totalActifs;

  // Si la liste se réduit (recherche, compte créé ailleurs...), on reste sur
  // une page existante plutôt que sur une page vide.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(tries.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [tries.length, page]);

  const basculerTri = (colonne: ColonneTri) =>
    setTri((t) =>
      t.col === colonne
        ? { col: colonne, sens: t.sens === "asc" ? "desc" : "asc" }
        : { col: colonne, sens: "asc" }
    );

  // Le blocage passe par une confirmation : un clic mal placé ne doit pas
  // désactiver un compte. Les erreurs (ex. auto-blocage refusé par l'API)
  // sont affichées dans la modale par ConfirmModal.
  const confirmerBlocage = async () => {
    const cible = aConfirmer;
    if (!cible) return;
    if (cible.blocked) {
      await authApi.unblockUser(cible.id);
    } else {
      await authApi.blockUser(cible.id);
    }
    // La fenêtre de détail peut être ouverte sur ce compte : on la referme
    // pour ne pas afficher un statut périmé.
    if (selectedUser?.id === cible.id) fermerDetail();
    await fetchUsers();
    setAConfirmer(null);
    show(cible.blocked ? `« ${cible.name} » est débloqué.` : `« ${cible.name} » est bloqué.`);
  };

  const enregistrerUtilisateur = async () => {
    if (!selectedUser || !editionUser) return;
    setEnregistrementUser(true);
    setErreurUser(null);
    try {
      const maj = await authApi.updateUser(selectedUser.id, editionUser);
      // On remplace aussi dans la liste pour éviter un aller-retour réseau.
      setUsers((liste) => liste.map((u) => (u.id === maj.id ? maj : u)));
      setSelectedUser(maj);
      setEditionUser(null);
      show("Modifications enregistrées.");
    } catch (e: any) {
      setErreurUser(e?.message ?? "Impossible d'enregistrer les modifications");
    } finally {
      setEnregistrementUser(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreationEnCours(true);
    setErreurCreation(null);
    const nomCree = formData.name;
    try {
      await authApi.createUser(formData);
      fermerFormulaire();
      await fetchUsers();
      show(`Compte « ${nomCree} » créé.`);
    } catch (err: any) {
      setErreurCreation(err?.message ?? "Impossible de créer le compte");
    } finally {
      setCreationEnCours(false);
    }
  };

  /** Ouvre la fenêtre de réinitialisation du mot de passe d'un compte. */
  const ouvrirReinit = (user: User) => {
    setReinitUser(user);
    setReinitMdp("");
    setReinitVisible(false);
    setReinitErreur(null);
  };

  const reinitialiserMdp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cible = reinitUser;
    if (!cible) return;
    if (reinitMdp.length < 6) {
      setReinitErreur("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setReinitEnCours(true);
    setReinitErreur(null);
    try {
      await authApi.resetPassword(cible.id, reinitMdp);
      setReinitUser(null);
      show(`Mot de passe de « ${cible.name} » réinitialisé.`);
    } catch (err: any) {
      setReinitErreur(err?.message ?? "Impossible de réinitialiser le mot de passe");
    } finally {
      setReinitEnCours(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Chargement...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
          Gestion des utilisateurs
        </h1>
        <p className="mt-1 font-poppins text-sm text-[#525f6d] dark:text-white/60">
          Créez les comptes, attribuez les rôles et bloquez les accès.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <label className="flex w-full max-w-[755px] items-center gap-2 rounded-full bg-[#e6e8f5] px-5 py-3 dark:bg-white/5">
          <svg className="h-5 w-5 text-[#525f6d] dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full bg-transparent font-poppins text-sm text-[#525f6d] placeholder:text-[#525f6d] outline-none dark:text-white/70"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setErreurCreation(null);
          }}
          className="flex h-[46px] shrink-0 items-center gap-2 rounded-xl bg-[#003049] px-5 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Ajouter un utilisateur
        </button>
      </div>

      {/* Compteurs d'aperçu (état global) + filtres role/statut. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 font-poppins text-xs">
          <span className="rounded-full bg-[#e6e8f5] px-3 py-1.5 font-semibold text-[#525f6d] dark:bg-white/5 dark:text-white/70">
            {users.length} compte{users.length > 1 ? "s" : ""}
          </span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
            {totalActifs} actif{totalActifs > 1 ? "s" : ""}
          </span>
          <span className="rounded-full bg-red-50 px-3 py-1.5 font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {totalBloques} bloqué{totalBloques > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtreRole}
            onChange={(e) => setFiltreRole(e.target.value)}
            aria-label="Filtrer par rôle"
            className="rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 font-poppins text-sm text-[#525f6d] focus:border-[#003049] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white/70"
          >
            <option value="">Tous les rôles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
            aria-label="Filtrer par statut"
            className="rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 font-poppins text-sm text-[#525f6d] focus:border-[#003049] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white/70"
          >
            <option value="">Tous les statuts</option>
            <option value="actif">Actifs</option>
            <option value="bloque">Bloqués</option>
          </select>
          {(search || filtreRole || filtreStatut) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFiltreRole("");
                setFiltreStatut("");
              }}
              className="rounded-lg border border-[#e6e8f5] px-3 py-2 font-poppins text-xs font-semibold text-[#525f6d] transition hover:bg-[#f6f8fa] dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e6e8f5] dark:border-white/10">
              <EnteteTrie libelle="Nom" colonne="name" tri={tri} onToggle={basculerTri} />
              <EnteteTrie libelle="Email" colonne="email" tri={tri} onToggle={basculerTri} />
              <EnteteTrie libelle="Rôle" colonne="role" tri={tri} onToggle={basculerTri} />
              <EnteteTrie libelle="Statut" colonne="blocked" tri={tri} onToggle={basculerTri} />
              <EnteteTrie libelle="Créé le" colonne="created_at" tri={tri} onToggle={basculerTri} />
              <th className="pb-3 text-right font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/50">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((user) => {
              const estMoi = moi?.id === user.id;
              return (
              <tr
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="cursor-pointer border-b border-[#e6e8f5] transition hover:bg-[#fbfbfe] dark:border-white/10 dark:hover:bg-white/5"
              >
                <td className="py-3 font-poppins text-sm text-[#0c1d31] dark:text-white">
                  <span className="flex items-center gap-2">
                    {user.name}
                    {estMoi && (
                      <span className="rounded-full bg-[#e6e8f5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#525f6d] dark:bg-white/10 dark:text-white/60">
                        Vous
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-3 font-poppins text-sm text-[#525f6d] dark:text-white/60">{user.email}</td>
                <td className="py-3 font-poppins text-sm text-[#525f6d] dark:text-white/60">{roleLabel(user.role)}</td>
                <td className="py-3">
                  <span className={`font-poppins text-xs font-semibold ${user.blocked ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {user.blocked ? "Bloqué" : "Actif"}
                  </span>
                </td>
                <td className="py-3 font-poppins text-sm text-[#525f6d] dark:text-white/60">{dateCourte(user.created_at)}</td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAConfirmer(user);
                    }}
                    disabled={estMoi}
                    title={estMoi ? "Vous ne pouvez pas bloquer votre propre compte" : undefined}
                    className={`w-24 rounded-lg border px-3 py-1.5 font-poppins text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      user.blocked
                        ? "border-green-600 bg-transparent text-green-600 hover:bg-green-600 hover:text-white dark:border-green-400 dark:text-green-400 dark:hover:bg-green-400 dark:hover:text-[#131313]"
                        : "border-red-600 bg-transparent text-red-600 hover:bg-red-600 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400 dark:hover:text-[#131313]"
                    }`}
                  >
                    {user.blocked ? "Débloquer" : "Bloquer"}
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-6 text-center font-poppins text-sm text-[#525f6d] dark:text-white/50">
            Aucun utilisateur trouvé.
          </p>
        )}
      </div>

      {!loading && (
        <Pagination
          page={page}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={fermerFormulaire}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#131313]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e6e8f5] px-6 py-5 dark:border-white/10">
              <div>
                <h3 className="font-poppins text-lg font-bold text-[#0c1d31] dark:text-white">
                  Ajouter un utilisateur
                </h3>
                <p className="mt-1 font-poppins text-sm text-[#525f6d] dark:text-white/60">
                  Renseignez son identité, puis attribuez-lui un accès.
                </p>
              </div>
              <button
                type="button"
                onClick={fermerFormulaire}
                aria-label="Fermer"
                className="shrink-0 rounded-full p-1 text-[#525f6d] transition hover:bg-[#e6e8f5] dark:text-white/60 dark:hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 px-6 py-5">
              <ChampFormulaire
                label="Nom"
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                placeholder="Ex. Amira Rezzoug"
                autoComplete="off"
              />

              <ChampFormulaire
                label="Email"
                type="email"
                value={formData.email}
                onChange={(v) => setFormData({ ...formData, email: v })}
                placeholder="prenom.nom@agb.com"
                autoComplete="off"
              />

              <ChampFormulaire
                label="Mot de passe"
                type={motDePasseVisible ? "text" : "password"}
                value={formData.password}
                onChange={(v) => setFormData({ ...formData, password: v })}
                placeholder="Au moins 6 caractères"
                autoComplete="new-password"
                suffixe={
                  <button
                    type="button"
                    onClick={() => setMotDePasseVisible((v) => !v)}
                    aria-label={motDePasseVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="text-[#8ea0b3] transition hover:text-[#003049] dark:hover:text-white"
                  >
                    {motDePasseVisible ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                }
              />

              <label className="block">
                <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                  Rôle
                </span>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2.5 font-poppins text-sm text-[#0c1d31] focus:border-[#003049] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                  {ROLES.find((r) => r.value === formData.role)?.description}
                </p>
              </label>

              {erreurCreation && (
                <p className="rounded-lg bg-red-50 px-3 py-2 font-poppins text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  {erreurCreation}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={fermerFormulaire}
                  className="rounded-lg border border-[#e6e8f5] px-5 py-2 font-poppins text-sm font-semibold text-[#525f6d] transition hover:bg-[#f6f8fa] dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creationEnCours}
                  className="rounded-lg bg-[#003049] px-5 py-2 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a] disabled:opacity-50"
                >
                  {creationEnCours ? "Création..." : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={fermerDetail}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#131313]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 border-b border-[#e6e8f5] px-6 py-5 dark:border-white/10">
              <PhotoUtilisateur
                user={selectedUser}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
              {!selectedUser.avatar_key && (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e6e8f5] font-poppins text-xl font-bold text-[#004a86] dark:bg-white/10">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="truncate font-poppins text-lg font-bold text-[#0c1d31] dark:text-white">
                  {selectedUser.name}
                </h3>
                <p className="truncate font-poppins text-sm text-[#525f6d] dark:text-white/60">
                  {selectedUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={fermerDetail}
                aria-label="Fermer"
                className="ml-auto shrink-0 rounded-full p-1 text-[#525f6d] transition hover:bg-[#e6e8f5] dark:text-white/60 dark:hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editionUser ? (
              <div className="space-y-4 px-6 py-5">
                {/* La photo n'est pas modifiable ici : chaque utilisateur gère
                    la sienne depuis /profil. L'admin voit l'aperçu mais ne le
                    change pas, pour qu'une photo reste toujours le choix de son
                    propriétaire. */}
                <div className="flex items-center gap-3 rounded-lg bg-[#f6f8fa] px-3 py-2.5 dark:bg-white/5">
                  {photoAffichee ? (
                    <img alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" src={photoAffichee} />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6e8f5] font-poppins text-base font-bold text-[#004a86] dark:bg-white/10">
                      {editionUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <p className="font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                    La photo se modifie uniquement par l&apos;intéressé, depuis sa page Mon profil.
                  </p>
                </div>

                <label className="block">
                  <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                    Nom
                  </span>
                  <input
                    value={editionUser.name}
                    onChange={(e) => setEditionUser({ ...editionUser, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 font-poppins text-sm text-[#0c1d31] focus:border-[#004a86] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                    Email
                  </span>
                  <input
                    type="email"
                    value={editionUser.email}
                    onChange={(e) => setEditionUser({ ...editionUser, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 font-poppins text-sm text-[#0c1d31] focus:border-[#004a86] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                    Rôle
                  </span>
                  <select
                    value={editionUser.role}
                    onChange={(e) => setEditionUser({ ...editionUser, role: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 font-poppins text-sm text-[#0c1d31] focus:border-[#004a86] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center justify-between rounded-lg bg-[#f6f8fa] px-3 py-2.5 dark:bg-white/5">
                  <span className="font-poppins text-[10px] font-bold uppercase tracking-wider text-[#8ea0b3] dark:text-white/40">
                    Compte bloqué
                  </span>
                  <input
                    type="checkbox"
                    checked={editionUser.blocked === 1}
                    onChange={(e) => setEditionUser({ ...editionUser, blocked: e.target.checked ? 1 : 0 })}
                    className="h-4 w-4 accent-[#003049]"
                  />
                </div>
              </div>
            ) : (
              <dl className="divide-y divide-[#e6e8f5] dark:divide-white/10">
                <InfoCell label="Rôle" value={roleLabel(selectedUser.role)} />
                <InfoCell
                  label="Statut"
                  value={selectedUser.blocked ? "Bloqué" : "Actif"}
                  accent={
                    selectedUser.blocked
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }
                />
                <InfoCell label="Créé le" value={formatDate(selectedUser.created_at)} />
              </dl>
            )}

            <div className="flex justify-end gap-3 px-6 py-5">
              {!editionUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => ouvrirReinit(selectedUser)}
                    className="ml-auto flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#e6e8f5] px-5 py-2 font-poppins text-sm font-semibold text-[#525f6d] transition hover:bg-[#f6f8fa] dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                    Réinitialiser le mot de passe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditionUser({
                        name: selectedUser.name,
                        email: selectedUser.email,
                        role: selectedUser.role,
                        blocked: selectedUser.blocked ? 1 : 0,
                      });
                      setErreurUser(null);
                    }}
                    className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#e6e8f5] px-5 py-2 font-poppins text-sm font-semibold text-[#003049] transition hover:bg-[#e6e8f5] dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                    Modifier
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditionUser(null)}
                    disabled={enregistrementUser}
                    className="rounded-lg border border-[#e6e8f5] px-5 py-2 font-poppins text-sm font-semibold text-[#525f6d] transition hover:bg-[#f6f8fa] disabled:opacity-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={enregistrerUtilisateur}
                    disabled={enregistrementUser}
                    className="rounded-lg bg-[#003049] px-5 py-2 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a] disabled:opacity-50"
                  >
                    {enregistrementUser ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </>
              )}
            </div>

            {editionUser && erreurUser && (
              <p className="mx-6 mb-5 rounded-lg bg-red-50 px-3 py-2 font-poppins text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {erreurUser}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation avant blocage/déblocage d'un compte. */}
      <ConfirmModal
        isOpen={aConfirmer !== null}
        title={aConfirmer?.blocked ? "Débloquer le compte ?" : "Bloquer le compte ?"}
        message={
          <span>
            {aConfirmer?.blocked ? "Débloquer" : "Bloquer"} le compte de{" "}
            <strong>{aConfirmer?.name}</strong> ({aConfirmer?.email}).{" "}
            {aConfirmer?.blocked
              ? "Il pourra de nouveau se connecter."
              : "Il ne pourra plus se connecter tant qu'il n'est pas débloqué."}
          </span>
        }
        confirmLabel={aConfirmer?.blocked ? "Débloquer" : "Bloquer"}
        loadingLabel={aConfirmer?.blocked ? "Déblocage..." : "Blocage..."}
        onConfirm={confirmerBlocage}
        onCancel={() => setAConfirmer(null)}
      />

      {/* Réinitialisation du mot de passe d'un compte. */}
      {reinitUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!reinitEnCours) setReinitUser(null);
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#131313]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e6e8f5] px-6 py-5 dark:border-white/10">
              <div className="min-w-0">
                <h3 className="font-poppins text-lg font-bold text-[#0c1d31] dark:text-white">
                  Réinitialiser le mot de passe
                </h3>
                <p className="mt-1 truncate font-poppins text-sm text-[#525f6d] dark:text-white/60">
                  {reinitUser.name} — {reinitUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReinitUser(null)}
                aria-label="Fermer"
                className="shrink-0 rounded-full p-1 text-[#525f6d] transition hover:bg-[#e6e8f5] dark:text-white/60 dark:hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={reinitialiserMdp} className="space-y-4 px-6 py-5">
              <p className="rounded-lg bg-[#f6f8fa] px-3 py-2.5 font-poppins text-xs text-[#525f6d] dark:bg-white/5 dark:text-white/50">
                L&apos;utilisateur devra utiliser ce nouveau mot de passe à sa
                prochaine connexion. L&apos;ancien cesse immédiatement de valoir.
              </p>

              <ChampFormulaire
                label="Nouveau mot de passe"
                type={reinitVisible ? "text" : "password"}
                value={reinitMdp}
                onChange={setReinitMdp}
                placeholder="Au moins 6 caractères"
                autoComplete="new-password"
                suffixe={
                  <button
                    type="button"
                    onClick={() => setReinitVisible((v) => !v)}
                    aria-label={reinitVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="text-[#8ea0b3] transition hover:text-[#003049] dark:hover:text-white"
                  >
                    {reinitVisible ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                }
              />

              {reinitErreur && (
                <p className="rounded-lg bg-red-50 px-3 py-2 font-poppins text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  {reinitErreur}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setReinitUser(null)}
                  disabled={reinitEnCours}
                  className="rounded-lg border border-[#e6e8f5] px-5 py-2 font-poppins text-sm font-semibold text-[#525f6d] transition hover:bg-[#f6f8fa] disabled:opacity-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reinitEnCours}
                  className="rounded-lg bg-[#003049] px-5 py-2 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a] disabled:opacity-50"
                >
                  {reinitEnCours ? "Réinitialisation..." : "Réinitialiser"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation éphémère des actions réussies. */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] rounded-xl border border-[#26A69A]/50 bg-white px-5 py-3 font-poppins text-sm text-[#0a7d74] shadow-2xl dark:bg-[#131313] dark:text-teal-300">
          {toast}
        </div>
      )}
    </div>
  );
}
