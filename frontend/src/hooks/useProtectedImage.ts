import { useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * Charge une image du bucket privé via l'API authentifiée et retourne une
 * object-URL affichable dans un <img src>.
 *
 * Le bucket n'étant pas public, une <img src="/api/upload/..."> ne
 * fonctionnerait pas : le navigateur n'envoie pas l'en-tête Authorization
 * sur une requête d'image. On récupère donc les octets en fetch puis on crée
 * une object-URL, révoquée au démontage pour éviter une fuite mémoire.
 */
export function useProtectedImage(key: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setSrc(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    api
      .getBlob(`/api/upload/${encodeURIComponent(key)}`)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key]);

  return src;
}
