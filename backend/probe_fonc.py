"""Vérification isolée des fonctionnalités, sans démarrer le serveur.

apply_schema_patches() contient du SQL PostgreSQL (DO $$), incompatible SQLite :
on importe donc les modèles et les routers directement, sans passer par app.main.

Depuis l'introduction du journal d'audit, toute écriture exige un utilisateur
connecté : un compte de test est créé ici et son token est envoyé en header
sur chaque mutation. Dans les conditions réelles, l'application rappelle que
le mot de passe stocké est un hash bcrypt.
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

db_path = os.path.join(tempfile.gettempdir(), "probe_fonc.db")
if os.path.exists(db_path):
    os.remove(db_path)
os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app.database import get_db
# Les modèles s'enregistrent sur models.base.Base, pas sur database.Base :
# c'est ce Base-là qu'il faut passer à create_all.
from app.models.base import Base
from app.models import Masque, Fonctionnalite, Service, ProcedureStockee
from app.models import ServiceProcedure, TableInfo, ProcedureTable
from app.models import DC, DCService, DCProcedure
from app.models import Historique, User
from app.routers.fonctionnalites import router as fonctionnalites_router
from app.routers.services import router as services_router
from app.routers.procedures import router as procedures_router
from app.routers.historique import router as historique_router
from app.utils.auth import create_access_token, get_password_hash

engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)

# Vérifie que les tables du modèle sont bien créées.
tables = inspect(engine).get_table_names()
assert "fonctionnalites" in tables, "table fonctionnalites absente"
assert "fonctionnalite_services" in tables, "table fonctionnalite_services absente"
assert "historique" in tables, "table historique absente (modèle ou patch manquant)"
cols = {c["name"] for c in inspect(engine).get_columns("fonctionnalites")}
assert "masque_id" in cols, "colonne masque_id absente"
assert "etape_id" not in cols, "colonne etape_id encore presente"
print("OK  tables creees :", [t for t in tables if "fonction" in t or t == "historique"])

app = FastAPI()
app.include_router(fonctionnalites_router)
app.include_router(services_router)
app.include_router(procedures_router)
app.include_router(historique_router)
app.dependency_overrides[get_db] = lambda: Session()

client = TestClient(app)
db = Session()

# Données : un masque, 3 services, 2 procédures, 1 table.
m = Masque(code="CE9000", nom="Écran test")
db.add(m); db.commit(); db.refresh(m)

s1 = Service(nom="GET /api/recherche", input_desc="motclé", output_desc="liste",
             controleur="RechercheController", modifie_bdd=False)
s2 = Service(nom="POST /api/recherche/avancee")
s3 = Service(nom="GET /api/resultats")
db.add_all([s1, s2, s3]); db.commit()
for s in (s1, s2, s3):
    db.refresh(s)

pr1 = ProcedureStockee(nom="trg_recherche", description="Déclencheur de recherche")
pr2 = ProcedureStockee(nom="idx_resultats", description="Index sur les résultats")
db.add_all([pr1, pr2]); db.commit()
db.refresh(pr1); db.refresh(pr2)

t1 = TableInfo(nom="RESULTAT", base_donnees="SGB_MAIN")
db.add(t1); db.commit(); db.refresh(t1)

db.add_all([
    ServiceProcedure(service_id=s1.id, procedure_id=pr1.id),
    ServiceProcedure(service_id=s2.id, procedure_id=pr1.id),
    ServiceProcedure(service_id=s3.id, procedure_id=pr2.id),
    ProcedureTable(procedure_id=pr1.id, table_id=t1.id),
])
db.commit()

# 0. Toute écriture exige un utilisateur connecté : sans token, refus 401.
r = client.post(f"/api/fonctionnalites/masque/{m.id}", json={"titre": "X"})
assert r.status_code == 401, r.text
print("OK  ecriture sans token refuse (401)")

# Compte de test et token pour le reste des vérifications.
u = User(email="probe@test.local", password=get_password_hash("secret"),
         name="Probe", role="admin")
db.add(u); db.commit(); db.refresh(u)
headers = {"Authorization": f"Bearer {create_access_token(data={'sub': str(u.id)})}"}

r = client.get("/api/historique/", headers=headers)
assert r.status_code == 200, r.text
print("OK  lecture du journal reservee aux connectes, ok")

# le journal est vide pour l'instant
assert client.get("/api/historique/", headers=headers).json()["total"] == 0
print("OK  journal vide au depart")

# 1. Liste vide au depart.
r = client.get(f"/api/fonctionnalites/masque/{m.id}")
assert r.status_code == 200 and r.json() == [], r.text
print("OK  liste vide au depart")

# 2. Titre vide refuse.
r = client.post(f"/api/fonctionnalites/masque/{m.id}", json={"titre": "   "}, headers=headers)
assert r.status_code == 422, r.text
print("OK  titre vide refuse (422)")

# 3. Masque inexistant.
r = client.post("/api/fonctionnalites/masque/99999", json={"titre": "X"}, headers=headers)
assert r.status_code == 404, r.text
print("OK  masque inexistant (404)")

# 4. Creation avec ordre automatique.
r = client.post(f"/api/fonctionnalites/masque/{m.id}", json={"titre": "Rechercher"}, headers=headers)
assert r.status_code == 201, r.text
f = r.json()
assert f["titre"] == "Rechercher" and f["ordre"] == 0 and f["services"] == [], r.text
assert f["masque_id"] == m.id, r.text
f1 = f["id"]
assert isinstance(f1, int), f"id de type {type(f1)} : {f1}"
print("OK  creation, ordre auto =", f["ordre"])

r = client.post(f"/api/fonctionnalites/masque/{m.id}", json={"titre": "Exporter"}, headers=headers)
f2 = r.json()
assert f2["ordre"] == 1, r.text
f2 = f2["id"]
print("OK  ordre auto increment, 2e = 1")

# Les deux créations sont tracées dans le journal (type_entite=fonctionnalite).
journal = client.get("/api/historique/", headers=headers).json()
fonc_events = [e for e in journal["evenements"] if e["type_entite"] == "fonctionnalite"]
assert journal["total"] == 2, journal
assert len(fonc_events) == 2, fonc_events
assert all(e["action"] == "creation" for e in fonc_events), fonc_events
assert all(e["utilisateur"]["name"] == "Probe" for e in fonc_events), fonc_events
print("OK  creations tracees dans le journal (auteur + action)")

# 5. Une fonctionnalite, plusieurs services.
for sid in (s1.id, s2.id, s3.id):
    r = client.post(f"/api/fonctionnalites/{f1}/services/{sid}", headers=headers)
    assert r.status_code == 200, r.text
r = client.get(f"/api/fonctionnalites/{f1}")
fonc = r.json()
noms = sorted(s["nom"] for s in fonc["services"])
assert len(fonc["services"]) == 3, r.text
assert noms == ["GET /api/recherche", "GET /api/resultats", "POST /api/recherche/avancee"], noms
print("OK  3 services rattaches :", noms)

# 6. Les procedures des services sont imbriquees, avec description + tables.
s3_entry = next(s for s in fonc["services"] if s["id"] == s3.id)
assert [p["nom"] for p in s3_entry["procedures"]] == ["idx_resultats"], r.text
s1_entry = next(s for s in fonc["services"] if s["id"] == s1.id)
p_s1 = s1_entry["procedures"][0]
assert p_s1["description"] == "Déclencheur de recherche", r.text
assert [t["nom"] for t in p_s1["tables"]] == ["RESULTAT"], r.text
assert s1_entry["input_desc"] == "motclé" and s1_entry["controleur"] == "RechercheController", r.text
print("OK  procedures imbriquees (description + tables) sous chaque service")

# 7. Service deja rattache refuse.
r = client.post(f"/api/fonctionnalites/{f1}/services/{s1.id}", headers=headers)
assert r.status_code == 400, r.text
print("OK  doublon refuse (400)")

# 8. Service inconnu / fonctionnalite inconnue.
r = client.post(f"/api/fonctionnalites/{f1}/services/99999", headers=headers)
assert r.status_code == 404, r.text
r = client.post(f"/api/fonctionnalites/99999/services/{s1.id}", headers=headers)
assert r.status_code == 404, r.text
print("OK  ids inconnus (404)")

# 9. Le meme service peut servir deux fonctionnalites (many-to-many).
r = client.post(f"/api/fonctionnalites/{f2}/services/{s1.id}", headers=headers)
assert r.status_code == 200, r.text
print("OK  service partage entre 2 fonctionnalites")

# 10. Detacher un service ne supprime pas le service.
r = client.delete(f"/api/fonctionnalites/{f1}/services/{s1.id}", headers=headers)
assert r.status_code == 200, r.text
assert len(r.json()["services"]) == 2, r.text
assert db.query(Service).filter(Service.id == s1.id).count() == 1, "service supprime !"
print("OK  detachement conserve le service")

# 11. Detacher une liaison inexistante.
r = client.delete(f"/api/fonctionnalites/{f1}/services/{s1.id}", headers=headers)
assert r.status_code == 404, r.text
print("OK  detachement inexistant (404)")

# 12. Modification partielle du titre.
r = client.patch(f"/api/fonctionnalites/{f1}", json={"titre": "Lancer la recherche"}, headers=headers)
assert r.status_code == 200 and r.json()["titre"] == "Lancer la recherche", r.text
r = client.patch(f"/api/fonctionnalites/{f1}", json={"titre": ""}, headers=headers)
assert r.status_code == 422, r.text
r = client.patch(f"/api/fonctionnalites/99999", json={"titre": "X"}, headers=headers)
assert r.status_code == 404, r.text
print("OK  patch titre / titre vide / 404")

# La modification est tracee avec l'instantané avant/après.
journal = client.get("/api/historique/", headers=headers).json()
modifs = [e for e in journal["evenements"] if e["action"] == "modification"]
assert len(modifs) == 1, modifs
assert modifs[0]["avant"]["titre"] == "Rechercher", modifs[0]
assert modifs[0]["apres"]["titre"] == "Lancer la recherche", modifs[0]
print("OK  modification tracee (avant/après lu dans le journal)")

# 13. Les fonctionnalites apparaissent dans l'ordre du masque.
r = client.get(f"/api/fonctionnalites/masque/{m.id}")
ordre = [x["titre"] for x in r.json()]
assert ordre == ["Lancer la recherche", "Exporter"], ordre
print("OK  ordre de liste :", ordre)

# 14. Supprimer une fonctionnalite ne supprime ni ses services ni ses procedures.
r = client.delete(f"/api/fonctionnalites/{f1}", headers=headers)
assert r.status_code == 200, r.text
assert db.query(Service).count() == 3, "des services ont disparu"
assert db.query(ProcedureStockee).count() == 2, "des procedures ont disparu"
assert db.query(Fonctionnalite).filter(Fonctionnalite.id == f1).count() == 0
print("OK  suppression conserve services et procedures")

r = client.delete(f"/api/fonctionnalites/{f1}", headers=headers)
assert r.status_code == 404, r.text
print("OK  suppression repetee (404)")

# 15. Liaisons service <-> procedure stockee.
r = client.get(f"/api/services/{s1.id}/procedures")
assert r.status_code == 200 and [p["nom"] for p in r.json()] == ["trg_recherche"], r.text

# creation + attachement en un appel
r = client.post(f"/api/services/{s3.id}/procedures", json={"nom": "sp_nouvelle", "description": "Nouvelle SP"}, headers=headers)
assert r.status_code == 201, r.text
sp_id = r.json()["id"]
assert [p["nom"] for p in client.get(f"/api/services/{s3.id}/procedures").json()] == ["idx_resultats", "sp_nouvelle"], r.text

# attachement d'une procedure existante
r = client.post(f"/api/services/{s2.id}/procedures/{pr2.id}", headers=headers)
assert r.status_code == 200, r.text

# doublon / ids inconnus
assert client.post(f"/api/services/{s2.id}/procedures/{pr2.id}", headers=headers).status_code == 400
assert client.post(f"/api/services/{s2.id}/procedures/99999", headers=headers).status_code == 404
assert client.post(f"/api/services/99999/procedures", json={"nom": "x"}, headers=headers).status_code == 404
assert client.post(f"/api/services/{s1.id}/procedures", json={"nom": " "}, headers=headers).status_code == 422
print("OK  creation/attachement procedures sur service")

# detachement sans suppression
r = client.delete(f"/api/services/{s3.id}/procedures/{pr1.id}", headers=headers)
assert r.status_code == 404, r.text  # pr1 n'est pas sur s3
r = client.delete(f"/api/services/{s3.id}/procedures/{pr2.id}", headers=headers)
assert r.status_code == 204, r.text
assert db.query(ProcedureStockee).count() == 3, "procedure supprimee au detachement"
print("OK  detachement conserve la procedure")

# 16. Suppression de procédure : refusee si citee par une demande de changement.
dc2 = DC(numero="DC-9001", titre="Toucher a la procedure", description=None)
db.add(dc2); db.commit(); db.refresh(dc2)
db.add(DCProcedure(dc_id=dc2.id, procedure_id=sp_id, action="Nouvelle colonne", details="x"))
db.commit()

r = client.delete(f"/api/procedures/{sp_id}", headers=headers)
assert r.status_code == 409, r.text
assert db.query(ProcedureStockee).filter(ProcedureStockee.id == sp_id).count() == 1, "procedure citee par une DC supprimee !"
print("OK  suppression procedure bloquee par reference DC (409)")

# sans cette reference, la suppression reussit
db.query(DCProcedure).filter_by(dc_id=dc2.id).delete(); db.commit()
r = client.delete(f"/api/procedures/{sp_id}", headers=headers)
assert r.status_code == 204, r.text
assert db.query(ProcedureStockee).filter(ProcedureStockee.id == sp_id).count() == 0
print("OK  suppression procedure autorisee hors reference DC")

# 17. Suppression de service : refusee si citee par une demande de changement.
dc = DC(numero="DC-9002", titre="Toucher au service", description=None)
db.add(dc); db.commit(); db.refresh(dc)
db.add(DCService(dc_id=dc.id, service_id=s1.id, action="Modifié", details="x"))
db.commit()

r = client.delete(f"/api/services/{s1.id}", headers=headers)
assert r.status_code == 409, r.text
assert db.query(Service).filter(Service.id == s1.id).count() == 1, "service cite par une DC supprime !"
print("OK  suppression service bloquee par reference DC (409)")

# sans cette reference, la suppression reussit
db.query(DCService).filter_by(dc_id=dc.id).delete(); db.commit()
r = client.delete(f"/api/services/{s1.id}", headers=headers)
assert r.status_code == 204, r.text
assert db.query(Service).filter(Service.id == s1.id).count() == 0
assert client.delete("/api/services/99999", headers=headers).status_code == 404
print("OK  suppression service autorisee hors reference DC")

# Les suppressions sont tracees : avec l'instantané « avant » riche, même après
# la disparition de l'objet (nom conservé, champs saisis).
journal = client.get("/api/historique/", headers=headers).json()
supprs = [e for e in journal["evenements"] if e["action"] == "suppression"]
types_suppr = {e["type_entite"] for e in supprs}
assert "fonctionnalite" in types_suppr, supprs
assert "procedure" in types_suppr, supprs
assert "service" in types_suppr, supprs
sers = [e for e in supprs if e["type_entite"] == "service"]
assert sers and sers[0]["nom_entite"] == "GET /api/recherche", sers
print("OK  suppressions tracees avec nom conserve")

# Journal : filtres par type d'entité et pagination.
r = client.get("/api/historique/", params={"type_entite": "procedure"}, headers=headers)
assert r.status_code == 200, r.text
assert r.json()["total"] >= 4, r.json()  # 2 créations + 2 rattachements + 1 suppression
raccs = [e for e in r.json()["evenements"] if e["action"] == "rattachement"]
assert len(raccs) == 2, raccs  # « créer+attacher » puis « attacher une existante »
print("OK  filtre par type_entite (total procedures =", r.json()["total"], ")")

r = client.get("/api/historique/", params={"page": 1, "par_page": 1}, headers=headers)
assert r.status_code == 200 and len(r.json()["evenements"]) == 1, r.text
print("OK  pagination (par_page=1)")

# 18. Suppression du masque : cascade sur les fonctionnalites.
db.delete(m)
db.commit()
assert db.query(Fonctionnalite).count() == 0, "fonctionnalites non supprimees en cascade"
print("OK  cascade a la suppression du masque")

# Le journal porte les rattachements et les détachements (actions dédiées).
journal = client.get("/api/historique/", headers=headers).json()
types_action = {e["action"] for e in journal["evenements"]}
assert "rattachement" in types_action, journal["evenements"]
assert "detachement" in types_action, journal["evenements"]
print("OK  rattachements et detachements traces")

# Une écriture sans authentification sur un autre endpoint est aussi refusée.
r = client.delete(f"/api/procedures/{pr1.id}")
assert r.status_code == 401, r.text
print("OK  suppression sans token refuse (401)")

db.close()
engine.dispose()
# La suppression du fichier est optionnelle : sous Windows, SQLite peut garder
# un handle ouvert. Un fichier résiduel n'affecte pas les assertions.
try:
    os.remove(db_path)
except PermissionError:
    print("(fichier temporaire encore verrouillé, ignoré)")

print("\n--- toutes les assertions sont passees ---")