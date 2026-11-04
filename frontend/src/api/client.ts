// Configuration du client API

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

/**
 * Transforme le corps d'erreur de l'API en message affichable.
 *
 * FastAPI renvoie `detail` sous trois formes : une chaîne (erreur métier),
 * un tableau (validation Pydantic — 422) ou un objet. Passer ce détail
 * directement à `new Error()` produisait « [object Object] » : on
 * reconstruit ici un texte lisible pour chaque cas.
 */
function detailVersMessage(detail: unknown): string {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((entree: any) => {
      const champ = Array.isArray(entree?.loc)
        ? entree.loc.filter((p: unknown) => p !== 'body' && p !== 'query').pop()
        : undefined;
      const msg = typeof entree?.msg === 'string' ? entree.msg : '';
      return champ ? `${champ} : ${msg}` : msg;
    }).filter(Boolean);
    if (messages.length) return messages.join(' · ');
  }
  if (detail && typeof detail === 'object') {
    const msg = (detail as any).message ?? (detail as any).msg;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'Erreur serveur';
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Le token vit soit dans localStorage (« se souvenir de moi »), soit dans
    // sessionStorage (session limitée à l'onglet/navigateur).
    this.token = localStorage.getItem('token') ?? sessionStorage.getItem('token');
  }

  /**
   * @param persistant true = survit à la fermeture du navigateur
   *                   (localStorage), false = durée de la session seulement.
   */
  setToken(token: string, persistant = true) {
    this.clearToken();
    this.token = token;
    (persistant ? localStorage : sessionStorage).setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }

  /**
   * Un 401 signifie que le token est absent, expiré ou invalide. On purge
   * alors la session et on prévient l'app, sinon l'interface reste "connectée"
   * alors que toutes les requêtes échouent.
   */
  private handleUnauthorized(endpoint: string) {
    if (endpoint.startsWith('/api/auth/login')) return;

    this.clearToken();
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    // Mémorisé pour que la page de connexion explique la redirection.
    sessionStorage.setItem('session-expiree', '1');
    window.dispatchEvent(new Event('auth:expired'));
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.handleUnauthorized(endpoint);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
      throw new Error(detailVersMessage(error?.detail ?? error));
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // GET
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST — `data` est optionnel : certaines routes POST n'attendent aucun
  // corps (rattacher un service, par exemple).
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  }

  // PUT
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  }

  // PATCH — mise à jour partielle d'une ressource.
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  }

  // DELETE
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // GET binaire — utilisé pour les images, qui ne peuvent pas passer par
  // <img src> car le navigateur n'y joint pas l'en-tête Authorization.
  async getBlob(endpoint: string): Promise<Blob> {
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (response.status === 401) {
      this.handleUnauthorized(endpoint);
    }

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    return response.blob();
  }

  // POST multipart/form-data — le Content-Type est laissé au navigateur
  // pour qu'il ajoute la boundary du formulaire.
  async upload<T>(endpoint: string, form: FormData): Promise<T> {
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: form,
    });

    if (response.status === 401) {
      this.handleUnauthorized(endpoint);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
      throw new Error(detailVersMessage(error?.detail ?? error));
    }

    return response.json();
  }
}

export const api = new ApiClient(API_URL);
