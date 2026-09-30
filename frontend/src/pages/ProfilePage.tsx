import { useEffect, useRef, useState } from "react";
import { User } from "../types";
import { authApi } from "../api/auth";
import { uploadApi } from "../api/upload";
import { useProtectedImage } from "../hooks/useProtectedImage";

function formatDate(valeur: string): string {
  return new Date(valeur).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Édition du compte ouvert dans la fenêtre de détail : null = lecture seule.
  const [editionUser, setEditionUser] = useState<{
    name: string;
    email: string;
    role: string;
    blocked: number;
    avatar_key: string | null;
  } | null>(null);
  const [enregistrementUser, setEnregistrementUser] = useState(false);
  const [envoiPhotoUser, setEnvoiPhotoUser] = useState(false);
  const [erreurUser, setErreurUser] = useState<string | null>(null);
  const inputPhotoUser = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({ email: "", password: "", name: "", role: "developer" });
  const [loading, setLoading] = useState(true);

  const photoAffichee = useProtectedImage(editionUser?.avatar_key ?? null);

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

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleBlockUnblock = async (user: User) => {
    if (user.blocked) {
      await authApi.unblockUser(user.id);
    } else {
      await authApi.blockUser(user.id);
    }
    // La fenêtre de détail peut être ouverte sur ce compte : on la referme
    // pour ne pas afficher un statut périmé.
    if (selectedUser?.id === user.id) fermerDetail();
    await fetchUsers();
  };

  const envoyerPhotoUser = async (fichier: File) => {
    if (!editionUser) return;
    setErreurUser(null);
    setEnvoiPhotoUser(true);
    const ancienne = editionUser.avatar_key;
    try {
      const { key } = await uploadApi.upload(fichier);
      setEditionUser({ ...editionUser, avatar_key: key });
      // L'ancienne image n'est plus référencée : on libère le stockage.
      if (ancienne) uploadApi.remove(ancienne).catch(() => {});
    } catch (e: any) {
      setErreurUser(e?.message ?? "Impossible d'envoyer la photo");
    } finally {
      setEnvoiPhotoUser(false);
    }
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
    } catch (e: any) {
      setErreurUser(e?.message ?? "Impossible d'enregistrer les modifications");
    } finally {
      setEnregistrementUser(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await authApi.createUser(formData);
    setShowForm(false);
    setFormData({ email: "", password: "", name: "", role: "developer" });
    await fetchUsers();
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
          onClick={() => setShowForm(true)}
          className="flex h-[46px] shrink-0 items-center gap-2 rounded-xl bg-[#003049] px-5 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Ajouter un utilisateur
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e6e8f5] dark:border-white/10">
              <th className="pb-3 text-left font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/50">Nom</th>
              <th className="pb-3 text-left font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/50">Email</th>
              <th className="pb-3 text-left font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/50">Rôle</th>
              <th className="pb-3 text-left font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/50">Statut</th>
              <th className="pb-3 text-right font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/50">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="cursor-pointer border-b border-[#e6e8f5] transition hover:bg-[#fbfbfe] dark:border-white/10 dark:hover:bg-white/5"
              >
                <td className="py-3 font-poppins text-sm text-[#0c1d31] dark:text-white">{user.name}</td>
                <td className="py-3 font-poppins text-sm text-[#525f6d] dark:text-white/60">{user.email}</td>
                <td className="py-3 font-poppins text-sm text-[#525f6d] dark:text-white/60">{user.role}</td>
                <td className="py-3">
                  <span className={`font-poppins text-xs font-semibold ${user.blocked ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {user.blocked ? "Bloqué" : "Actif"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBlockUnblock(user);
                    }}
                    className={`w-24 rounded-lg border px-3 py-1.5 font-poppins text-xs font-semibold transition ${
                      user.blocked
                        ? "border-green-600 bg-transparent text-green-600 hover:bg-green-600 hover:text-white dark:border-green-400 dark:text-green-400 dark:hover:bg-green-400 dark:hover:text-[#131313]"
                        : "border-red-600 bg-transparent text-red-600 hover:bg-red-600 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400 dark:hover:text-[#131313]"
                    }`}
                  >
                    {user.blocked ? "Débloquer" : "Bloquer"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-6 text-center font-poppins text-sm text-[#525f6d] dark:text-white/50">
            Aucun utilisateur trouvé.
          </p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]">
            <h3 className="mb-4 font-poppins text-lg font-bold text-[#0c1d31] dark:text-white">
              Ajouter un utilisateur
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block font-poppins text-sm font-medium text-[#0c1d31] dark:text-white">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#e6e8f5] px-4 py-2 font-poppins text-sm outline-none focus:border-[#003049] dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block font-poppins text-sm font-medium text-[#0c1d31] dark:text-white">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#e6e8f5] px-4 py-2 font-poppins text-sm outline-none focus:border-[#003049] dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block font-poppins text-sm font-medium text-[#0c1d31] dark:text-white">Mot de passe *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#e6e8f5] px-4 py-2 font-poppins text-sm outline-none focus:border-[#003049] dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block font-poppins text-sm font-medium text-[#0c1d31] dark:text-white">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-lg border border-[#e6e8f5] px-4 py-2 font-poppins text-sm outline-none focus:border-[#003049] dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg px-4 py-2 font-poppins text-sm font-medium text-[#525f6d] transition hover:bg-[#e6e8f5] dark:text-white/60 dark:hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#003049] px-4 py-2 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a]"
                >
                  Créer
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
                {/* Photo de profil : un clic ouvre le sélecteur, comme sur
                    Mon profil. L'upload est immédiat, il ne reste qu'à
                    valider avec « Enregistrer ». */}
                <div className="flex flex-col items-center gap-2">
                  <input
                    ref={inputPhotoUser}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void envoyerPhotoUser(f);
                    }}
                  />
                  <button
                    type="button"
                    disabled={envoiPhotoUser}
                    onClick={() => inputPhotoUser.current?.click()}
                    title="Changer la photo"
                    aria-label="Changer la photo"
                    className="group relative block h-24 w-24 overflow-hidden rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004a86] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131313] disabled:cursor-wait"
                  >
                    {photoAffichee ? (
                      <img alt="" className="h-24 w-24 rounded-full object-cover" src={photoAffichee} />
                    ) : (
                      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[#e6e8f5] font-poppins text-3xl font-bold text-[#004a86] dark:bg-white/10">
                        {editionUser.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
                      {envoiPhotoUser
                        ? "Envoi en cours..."
                        : editionUser.avatar_key
                          ? "Cliquez sur la photo pour la remplacer"
                          : "Cliquez pour ajouter une photo"}
                    </span>
                    {editionUser.avatar_key && !envoiPhotoUser && (
                      <button
                        type="button"
                        onClick={() => setEditionUser({ ...editionUser, avatar_key: null })}
                        className="rounded font-poppins text-xs font-semibold text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
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
                    className="mt-1 w-full rounded-lg border border-[#e6e8f5] bg-white px-3 py-2 font-poppins text-sm capitalize text-[#0c1d31] focus:border-[#004a86] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
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
              <dl className="grid grid-cols-2 gap-px bg-[#e6e8f5] dark:bg-white/10">
                <InfoCell label="Rôle" value={selectedUser.role} />
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
                <button
                  type="button"
                  onClick={() => {
                    setEditionUser({
                      name: selectedUser.name,
                      email: selectedUser.email,
                      role: selectedUser.role,
                      blocked: selectedUser.blocked ? 1 : 0,
                      avatar_key: selectedUser.avatar_key ?? null,
                    });
                    setErreurUser(null);
                  }}
                  className="ml-auto flex items-center gap-2 rounded-lg border border-[#e6e8f5] px-5 py-2 font-poppins text-sm font-semibold text-[#003049] transition hover:bg-[#e6e8f5] dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  Modifier
                </button>
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
                    disabled={enregistrementUser || envoiPhotoUser}
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
    </div>
  );
}
