import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useProtectedImage } from "../hooks/useProtectedImage";
import { authApi } from "../api/auth";
import { uploadApi } from "../api/upload";
import type { User } from "../types";

/**
 * Page « Mon profil ».
 *
 * Les champs sont en lecture seule tant qu'on n'a pas cliqué sur « Modifier » :
 * on ne propose pas un formulaire d'édition permanent, où un simple affichage
 * de page autoriserait la saisie par erreur.
 *
 * L'email, le rôle et le statut relèvent de l'administration, ils ne sont donc
 * jamais modifiables ici.
 *
 * La photo vit dans le bucket privé comme les images de masques : seule une clé
 * est stockée en base. Remplacer une photo supprime l'ancienne du bucket pour
 * ne pas y laisser d'orphelin.
 */
export function MonProfilPage() {
  const { user, setUser } = useAuth();

  const [edition, setEdition] = useState(false);
  const [nom, setNom] = useState(user?.name ?? "");
  const [avatarKey, setAvatarKey] = useState<string | null>(user?.avatar_key ?? null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const inputFile = useRef<HTMLInputElement>(null);
  const avatarAffiche = useProtectedImage(avatarKey);

  // Si le compte change ailleurs dans l'app, on repart de ses données.
  useEffect(() => {
    setNom(user?.name ?? "");
    setAvatarKey(user?.avatar_key ?? null);
  }, [user?.id]);

  const nomModifie = nom.trim() !== (user?.name ?? "");
  const photoModifiee = avatarKey !== (user?.avatar_key ?? null);
  const modifie = nomModifie || photoModifiee;

  const annuler = () => {
    setNom(user?.name ?? "");
    setAvatarKey(user?.avatar_key ?? null);
    setErreur(null);
    setSucces(false);
    setEdition(false);
  };

  const choisirPhoto = async (fichier: File) => {
    setErreur(null);
    setSucces(false);
    // Choisir un fichier depuis la photo doit suffire : on passe en édition,
    // sinon la nouvelle photo n'aurait aucun bouton pour être enregistrée.
    setEdition(true);

    if (!fichier.type.startsWith("image/")) {
      setErreur("Le fichier doit être une image.");
      return;
    }
    if (fichier.size > 10 * 1024 * 1024) {
      setErreur("L'image dépasse 10 Mo.");
      return;
    }

    setEnvoiPhoto(true);
    const ancienne = avatarKey;
    try {
      const { key } = await uploadApi.upload(fichier);
      setAvatarKey(key);
      if (ancienne) {
        uploadApi.remove(ancienne).catch(() => {
          /* l'ancienne image est déjà partie : sans conséquence */
        });
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi de la photo impossible.");
    } finally {
      setEnvoiPhoto(false);
      if (inputFile.current) inputFile.current.value = "";
    }
  };

  const retirerPhoto = () => {
    setErreur(null);
    const ancienne = avatarKey;
    setAvatarKey(null);
    if (ancienne) {
      uploadApi.remove(ancienne).catch(() => {
        /* sans conséquence */
      });
    }
  };

  const enregistrer = async () => {
    if (!nom.trim()) {
      setErreur("Le nom ne peut pas être vide.");
      return;
    }
    setErreur(null);
    setEnregistrement(true);
    try {
      const maj: User = await authApi.updateMe({
        name: nom.trim(),
        avatar_key: avatarKey,
      });
      setUser(maj);
      localStorage.setItem("user", JSON.stringify(maj));
      setSucces(true);
      setEdition(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-[#0c1d31] dark:text-white">
          Mon profil
        </h1>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-[#131313]">
        <div className="flex flex-col items-center gap-4 border-b border-[#e6e8f5] pb-6 dark:border-white/10">
          {/* Le sélecteur de fichier est monté une seule fois : cliquer sur la
              photo ou sur son initiale suffit ensuite à ouvrir la boîte de
              dialogue, en lecture comme en édition. */}
          <input
            ref={inputFile}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void choisirPhoto(f);
            }}
          />

          <div className="relative">
            <button
              type="button"
              disabled={envoiPhoto}
              onClick={() => inputFile.current?.click()}
              title={avatarAffiche ? "Changer la photo" : "Ajouter une photo"}
              aria-label={
                avatarAffiche ? "Changer la photo" : "Ajouter une photo"
              }
              className="group relative block h-28 w-28 overflow-hidden rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004a86] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131313] disabled:cursor-wait"
            >
              {avatarAffiche ? (
                <img
                  alt=""
                  className="h-28 w-28 rounded-full object-cover"
                  src={avatarAffiche}
                />
              ) : (
                <span className="flex h-28 w-28 items-center justify-center rounded-full bg-[#e6e8f5] font-poppins text-4xl font-bold text-[#004a86] dark:bg-white/10">
                  {(user?.name ?? "?").charAt(0).toUpperCase()}
                </span>
              )}

              {/* Survol : voile sombre + icône photo, pour signaler clairement
                  que l'image est cliquable. Le fond blanc garde l'icône
                  lisible quelle que soit la photo. */}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <svg
                  className="h-7 w-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </span>
            </button>

            {envoiPhoto && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-medium text-white">
                Envoi...
              </div>
            )}
          </div>

          {/* L'ajout et le remplacement passent par un clic sur la photo ; il ne
              reste que la suppression, qui est destructive et mérite un bouton
              explicite. */}
          {edition && avatarKey && (
            <button
              type="button"
              onClick={retirerPhoto}
              className="rounded-lg border border-red-200 px-4 py-2 font-poppins text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
            >
              Supprimer la photo
            </button>
          )}
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="profil-nom"
              className="mb-1 block font-poppins text-sm font-medium text-[#0c1d31] dark:text-white"
            >
              Nom
            </label>
            <input
              id="profil-nom"
              type="text"
              value={nom}
              readOnly={!edition}
              onChange={(e) => {
                setNom(e.target.value);
                setSucces(false);
              }}
              className={`w-full rounded-lg border px-4 py-2.5 font-poppins text-sm outline-none ${
                edition
                  ? "border-[#e6e8f5] focus:border-[#003049] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  : "cursor-default border-transparent bg-[#f6f8fa] text-[#525f6d] dark:border-transparent dark:bg-white/5 dark:text-white/60"
              }`}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/40">
                Email
              </p>
              <p className="mt-1 font-poppins text-sm text-[#0c1d31] dark:text-white">
                {user?.email}
              </p>
            </div>
            <div>
              <p className="font-poppins text-xs font-bold uppercase tracking-wider text-[#525f6d] dark:text-white/40">
                Rôle
              </p>
              <p className="mt-1 font-poppins text-sm text-[#0c1d31] dark:text-white">
                {user?.role}
              </p>
            </div>
          </div>
          <p className="font-poppins text-xs text-[#8ea0b3] dark:text-white/40">
            L'email et le rôle sont modifiés par l'administration.
          </p>
        </div>

        {erreur && (
          <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 font-poppins text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {erreur}
          </p>
        )}
        {succes && !erreur && (
          <p className="mt-5 rounded-lg bg-green-50 px-3 py-2 font-poppins text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300">
            Profil mis à jour.
          </p>
        )}

        {/* Les actions restent dans la carte, en bas : le titre au-dessus ne
            sert qu'à situer la page. */}
        <div className="mt-6 flex justify-end gap-3 border-t border-[#e6e8f5] pt-5 dark:border-white/10">
          {!edition ? (
            <button
              type="button"
              onClick={() => setEdition(true)}
              className="flex items-center gap-2 rounded-xl bg-[#003049] px-5 py-2.5 font-poppins text-sm font-semibold text-white transition hover:bg-[#00263a]"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Modifier
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={annuler}
                disabled={enregistrement}
                className="rounded-xl px-5 py-2.5 font-poppins text-sm font-semibold text-[#525f6d] transition hover:bg-[#e6e8f5] disabled:opacity-50 dark:text-white/60 dark:hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={enregistrer}
                disabled={!modifie || enregistrement}
                className="rounded-xl bg-[#004B87] px-5 py-2.5 font-poppins text-sm font-semibold text-white transition hover:bg-[#003a68] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enregistrement ? "Enregistrement..." : "Enregistrer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}