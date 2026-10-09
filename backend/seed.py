"""
Script de seed pour peupler la base de données avec des données de démonstration.
Usage: python seed.py
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
from app.models.base import Base
from app.models.user import User
from app.models.domaine import Domaine
from app.models.process import Process
from app.models.etape import Etape
from app.models.masque import Masque, EtapeMasque
from app.models.service import Service, MasqueService
from app.models.fonctionnalite import Fonctionnalite, FonctionnaliteService
from app.models.procedure import ProcedureStockee, ServiceProcedure
from app.models.table import TableInfo, ProcedureTable
from app.models.attribut import Attribut
from app.models.archive import Archive
from app.utils.auth import get_password_hash

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def seed():
    db = SessionLocal()

    try:
        # Vérifier si des données existent déjà
        if db.query(Domaine).count() > 0:
            print("La base contient déjà des données. Seed annulé.")
            return

        print("Création des données de démonstration...")

        # ======================
        # UTILISATEURS
        # ======================
        users = [
            User(email="jean.dupont@agb.com", password=get_password_hash("password123"), name="Jean Dupont", role="developer"),
            User(email="marie.martin@agb.com", password=get_password_hash("password123"), name="Marie Martin", role="developer"),
            User(email="admin@agb.com", password=get_password_hash("admin123"), name="Administrateur", role="admin"),
        ]
        db.add_all(users)
        db.commit()

        # ======================
        # DOMAINES
        # ======================
        domaines = [
            Domaine(nom="Commerce extérieur", description="Couverture des opérations et des échanges relatifs au commerce extérieur de la banque"),
            Domaine(nom="Télécompense", description="Traitement des opérations de télécompensation et des échanges interbancaires"),
            Domaine(nom="Monétique", description="Gestion des opérations liées aux cartes bancaires et aux systèmes de paiement électronique"),
            Domaine(nom="CRM", description="Gestion de la relation client et des outils associés"),
            Domaine(nom="BI", description="Conception et exploitation des solutions de Business Intelligence et de reporting"),
            Domaine(nom="Crédits", description="Gestion du cycle de vie des crédits, prêts et échéanciers"),
        ]
        db.add_all(domaines)
        db.commit()

        # ======================
        # PROCESSUS
        # ======================
        processes = [
            # Commerce
            Process(nom="Ouverture de compte", description="Processus d'ouverture d'un nouveau compte client", domaine_id=domaines[0].id),
            Process(nom="Modification client", description="Mise à jour des informations client", domaine_id=domaines[0].id),
            Process(nom="Clôture de compte", description="Processus de clôture définitive d'un compte", domaine_id=domaines[0].id),

            # Crédit
            Process(nom="Demande de prêt", description="Traitement des demandes de crédit", domaine_id=domaines[1].id),
            Process(nom="Gestion échéancier", description="Suivi et modification des échéanciers", domaine_id=domaines[1].id),

            # Monétique
            Process(nom="Émission carte", description="Émission de nouvelles cartes bancaires", domaine_id=domaines[2].id),
            Process(nom="Transaction carte", description="Traitement des transactions par carte", domaine_id=domaines[2].id),

            # Clientèle
            Process(nom="Identification client", description="Vérification et identification des clients", domaine_id=domaines[3].id),

            # Compensation
            Process(nom="Compensation interbancaire", description="Traitement des opérations de compensation", domaine_id=domaines[4].id),
        ]
        db.add_all(processes)
        db.commit()

        # ======================
        # ÉTAPES
        # ======================
        etapes = [
            # Ouverture de compte
            Etape(nom="Saisie des informations", description="Saisie des données personnelles du client", ordre=1, process_id=processes[0].id),
            Etape(nom="Vérification identité", description="Contrôle des pièces d'identité", ordre=2, process_id=processes[0].id),
            Etape(nom="Validation", description="Validation par le responsable", ordre=3, process_id=processes[0].id),
            Etape(nom="Confirmation", description="Confirmation et ouverture effective", ordre=4, process_id=processes[0].id),

            # Modification client
            Etape(nom="Consultation", description="Affichage des informations actuelles", ordre=1, process_id=processes[1].id),
            Etape(nom="Modification", description="Saisie des modifications", ordre=2, process_id=processes[1].id),
            Etape(nom="Validation modification", description="Validation des changements", ordre=3, process_id=processes[1].id),

            # Clôture de compte
            Etape(nom="Demande de clôture", description="Enregistrement de la demande", ordre=1, process_id=processes[2].id),
            Etape(nom="Vérification soldes", description="Contrôle des soldes et opérations en cours", ordre=2, process_id=processes[2].id),
            Etape(nom="Clôture effective", description="Exécution de la clôture", ordre=3, process_id=processes[2].id),

            # Demande de prêt
            Etape(nom="Soumission demande", description="Enregistrement de la demande de crédit", ordre=1, process_id=processes[3].id),
            Etape(nom="Analyse risque", description="Évaluation du risque crédit", ordre=2, process_id=processes[3].id),
            Etape(nom="Décision", description="Décision d'accord ou de refus", ordre=3, process_id=processes[3].id),

            # Émission carte
            Etape(nom="Demande carte", description="Enregistrement de la demande de carte", ordre=1, process_id=processes[5].id),
            Etape(nom="Fabrication", description="Fabrication de la carte physique", ordre=2, process_id=processes[5].id),
            Etape(nom="Activation", description="Activation de la carte", ordre=3, process_id=processes[5].id),
        ]
        db.add_all(etapes)
        db.commit()

        # ======================
        # MASQUES
        # ======================
        masques = [
            Masque(code="CE2100", nom="Écran saisie client", description="Formulaire de saisie des informations client"),
            Masque(code="CE2200", nom="Écran compte", description="Affichage et gestion des comptes"),
            Masque(code="CE2300", nom="Écran transfert", description="Formulaire de transfert inter-comptes"),
            Masque(code="CE2400", nom="Écran prêt", description="Gestion des demandes de prêt"),
            Masque(code="CE2500", nom="Écran carte", description="Gestion des cartes bancaires"),
            Masque(code="CE2600", nom="Écran consultation", description="Consultation des informations client"),
            Masque(code="CE2700", nom="Écran validation", description="Écran de validation des opérations"),
        ]
        db.add_all(masques)
        db.commit()

        # ======================
        # SERVICES
        # ======================
        services = [
            Service(nom="CustomerService", methode_http="GET", url="/api/customers", input_desc="ID client", output_desc="Informations client", controleur="CustomerController", modifie_bdd=True),
            Service(nom="AccountService", methode_http="POST", url="/api/accounts", input_desc="Données compte", output_desc="Compte créé", controleur="AccountController", modifie_bdd=True),
            Service(nom="TransferService", methode_http="POST", url="/api/transfers", input_desc="Données transfert", output_desc="Transfert effectué", controleur="TransferController", modifie_bdd=True),
            Service(nom="ValidationService", methode_http="POST", url="/api/validate", input_desc="Données à valider", output_desc="Résultat validation", controleur="ValidationController", modifie_bdd=False),
            Service(nom="CardService", methode_http="POST", url="/api/cards", input_desc="Données carte", output_desc="Carte émise", controleur="CardController", modifie_bdd=True),
            Service(nom="LoanService", methode_http="POST", url="/api/loans", input_desc="Demande prêt", output_desc="Prêt accordé", controleur="LoanController", modifie_bdd=True),
        ]
        db.add_all(services)
        db.commit()

        # ======================
        # PROCÉDURES STOCKÉES
        # ======================
        procedures = [
            ProcedureStockee(nom="SP_CREATE_CUSTOMER", description="Créer un nouveau client dans la base"),
            ProcedureStockee(nom="SP_UPDATE_CUSTOMER", description="Mettre à jour les informations client"),
            ProcedureStockee(nom="SP_CREATE_ACCOUNT", description="Créer un nouveau compte"),
            ProcedureStockee(nom="SP_EXECUTE_TRANSFER", description="Exécuter un transfert entre comptes"),
            ProcedureStockee(nom="SP_CREATE_CARD", description="Émettre une nouvelle carte"),
            ProcedureStockee(nom="SP_LOAN_APPROVAL", description="Traiter l'approbation d'un prêt"),
        ]
        db.add_all(procedures)
        db.commit()

        # ======================
        # TABLES
        # ======================
        tables = [
            TableInfo(nom="CUSTOMER", base_donnees="SGB_MAIN", description="Table des clients"),
            TableInfo(nom="ACCOUNT", base_donnees="SGB_MAIN", description="Table des comptes"),
            TableInfo(nom="TRANSFER", base_donnees="SGB_MAIN", description="Table des transferts"),
            TableInfo(nom="CARD", base_donnees="SGB_MAIN", description="Table des cartes"),
            TableInfo(nom="LOAN", base_donnees="SGB_MAIN", description="Table des prêts"),
            TableInfo(nom="CUSTOMER_TYPE", base_donnees="SGB_MAIN", description="Types de clients"),
        ]
        db.add_all(tables)
        db.commit()

        # ======================
        # ATTRIBUTS
        # ======================
        attributs = [
            # CUSTOMER
            Attribut(nom="CUSTOMER_ID", type="nombre", table_id=tables[0].id),
            Attribut(nom="FIRST_NAME", type="texte", table_id=tables[0].id),
            Attribut(nom="LAST_NAME", type="texte", table_id=tables[0].id),
            Attribut(nom="EMAIL", type="texte", table_id=tables[0].id),
            Attribut(nom="PHONE", type="texte", table_id=tables[0].id),
            Attribut(nom="CUSTOMER_TYPE", type="texte", table_id=tables[0].id),

            # ACCOUNT
            Attribut(nom="ACCOUNT_ID", type="nombre", table_id=tables[1].id),
            Attribut(nom="ACCOUNT_NUMBER", type="texte", table_id=tables[1].id),
            Attribut(nom="BALANCE", type="nombre", table_id=tables[1].id),
            Attribut(nom="CUSTOMER_ID", type="nombre", table_id=tables[1].id),

            # TRANSFER
            Attribut(nom="TRANSFER_ID", type="nombre", table_id=tables[2].id),
            Attribut(nom="FROM_ACCOUNT", type="texte", table_id=tables[2].id),
            Attribut(nom="TO_ACCOUNT", type="texte", table_id=tables[2].id),
            Attribut(nom="AMOUNT", type="nombre", table_id=tables[2].id),

            # CARD
            Attribut(nom="CARD_ID", type="nombre", table_id=tables[3].id),
            Attribut(nom="CARD_NUMBER", type="texte", table_id=tables[3].id),
            Attribut(nom="EXPIRY_DATE", type="date", table_id=tables[3].id),
            Attribut(nom="CUSTOMER_ID", type="nombre", table_id=tables[3].id),
        ]
        db.add_all(attributs)
        db.commit()

        # ======================
        # LIAISONS ÉTAPE-MASQUE
        # ======================
        etape_masques = [
            EtapeMasque(etape_id=etapes[0].id, masque_id=masques[0].id),  # Saisie → CE2100
            EtapeMasque(etape_id=etapes[4].id, masque_id=masques[5].id),  # Consultation → CE2600
            EtapeMasque(etape_id=etapes[5].id, masque_id=masques[0].id),  # Modification → CE2100
            EtapeMasque(etape_id=etapes[9].id, masque_id=masques[2].id),  # Demande clôture → CE2300
            EtapeMasque(etape_id=etapes[10].id, masque_id=masques[3].id), # Soumission prêt → CE2400
            EtapeMasque(etape_id=etapes[13].id, masque_id=masques[4].id), # Demande carte → CE2500
        ]
        db.add_all(etape_masques)
        db.commit()

        # ======================
        # LIAISONS MASQUE-SERVICE
        # ======================
        masque_services = [
            MasqueService(masque_id=masques[0].id, service_id=services[0].id),  # CE2100 → CustomerService
            MasqueService(masque_id=masques[1].id, service_id=services[1].id),  # CE2200 → AccountService
            MasqueService(masque_id=masques[2].id, service_id=services[2].id),  # CE2300 → TransferService
            MasqueService(masque_id=masques[3].id, service_id=services[5].id),  # CE2400 → LoanService
            MasqueService(masque_id=masques[4].id, service_id=services[4].id),  # CE2500 → CardService
            MasqueService(masque_id=masques[5].id, service_id=services[0].id),  # CE2600 → CustomerService
            MasqueService(masque_id=masques[6].id, service_id=services[3].id),  # CE2700 → ValidationService
        ]
        db.add_all(masque_services)
        db.commit()

        # ======================
        # FONCTIONNALITÉS (par masque) + LEURS SERVICES
        # ======================
        fonctionnalites = [
            Fonctionnalite(titre="Saisir un client", description="Enregistrer les informations d'un nouveau client", masque_id=masques[0].id, ordre=0),
            Fonctionnalite(titre="Modifier un client", description="Corriger les informations d'un client existant", masque_id=masques[0].id, ordre=1),
            Fonctionnalite(titre="Gérer les comptes", description="Créer et consulter les comptes d'un client", masque_id=masques[1].id, ordre=0),
            Fonctionnalite(titre="Effectuer un transfert", description="Virer un montant entre deux comptes", masque_id=masques[2].id, ordre=0),
            Fonctionnalite(titre="Demander un prêt", description="Soumettre une demande de crédit", masque_id=masques[3].id, ordre=0),
            Fonctionnalite(titre="Émettre une carte", description="Commander et activer une carte bancaire", masque_id=masques[4].id, ordre=0),
            Fonctionnalite(titre="Consulter un client", description="Afficher la fiche complète d'un client", masque_id=masques[5].id, ordre=0),
            Fonctionnalite(titre="Valider une opération", description="Approuver ou refuser une opération en attente", masque_id=masques[6].id, ordre=0),
        ]
        db.add_all(fonctionnalites)
        db.commit()

        fonctionnalite_services = [
            # CE2100 → Saisir/Modifier un client
            FonctionnaliteService(fonctionnalite_id=fonctionnalites[0].id, service_id=services[0].id),
            FonctionnaliteService(fonctionnalite_id=fonctionnalites[1].id, service_id=services[0].id),
            FonctionnaliteService(fonctionnalite_id=fonctionnalites[1].id, service_id=services[3].id),
            # CE2200 → Gérer les comptes
            FonctionnaliteService(fonctionnalite_id=fonctionnalites[2].id, service_id=services[1].id),
            # CE2300 → Transfert
            FonctionnaliteService(fonctionnalite_id=fonctionnalites[3].id, service_id=services[2].id),
            # CE2400 → Prêt
            FonctionnaliteService(fonctionnalite_id=fonctionnalites[4].id, service_id=services[5].id),
            # CE2500 → Carte
            FonctionnaliteService(fonctionnalite_id=fonctionnalites[5].id, service_id=services[4].id),
            # CE2600 → Consultation
            FonctionnaliteService(fonctionnalite_id=fonctionnalites[6].id, service_id=services[0].id),
            # CE2700 → Validation
            FonctionnaliteService(fonctionnalite_id=fonctionnalites[7].id, service_id=services[3].id),
        ]
        db.add_all(fonctionnalite_services)
        db.commit()

        # ======================
        # LIAISONS SERVICE-PROCÉDURE
        # ======================
        service_procedures = [
            ServiceProcedure(service_id=services[0].id, procedure_id=procedures[0].id),  # CustomerService → SP_CREATE_CUSTOMER
            ServiceProcedure(service_id=services[0].id, procedure_id=procedures[1].id),  # CustomerService → SP_UPDATE_CUSTOMER
            ServiceProcedure(service_id=services[1].id, procedure_id=procedures[2].id),  # AccountService → SP_CREATE_ACCOUNT
            ServiceProcedure(service_id=services[2].id, procedure_id=procedures[3].id),  # TransferService → SP_EXECUTE_TRANSFER
            ServiceProcedure(service_id=services[4].id, procedure_id=procedures[4].id),  # CardService → SP_CREATE_CARD
            ServiceProcedure(service_id=services[5].id, procedure_id=procedures[5].id),  # LoanService → SP_LOAN_APPROVAL
        ]
        db.add_all(service_procedures)
        db.commit()

        # ======================
        # LIAISONS PROCÉDURE-TABLE
        # ======================
        procedure_tables = [
            ProcedureTable(procedure_id=procedures[0].id, table_id=tables[0].id),  # SP_CREATE_CUSTOMER → CUSTOMER
            ProcedureTable(procedure_id=procedures[1].id, table_id=tables[0].id),  # SP_UPDATE_CUSTOMER → CUSTOMER
            ProcedureTable(procedure_id=procedures[2].id, table_id=tables[1].id),  # SP_CREATE_ACCOUNT → ACCOUNT
            ProcedureTable(procedure_id=procedures[3].id, table_id=tables[2].id),  # SP_EXECUTE_TRANSFER → TRANSFER
            ProcedureTable(procedure_id=procedures[3].id, table_id=tables[1].id),  # SP_EXECUTE_TRANSFER → ACCOUNT
            ProcedureTable(procedure_id=procedures[4].id, table_id=tables[3].id),  # SP_CREATE_CARD → CARD
            ProcedureTable(procedure_id=procedures[5].id, table_id=tables[4].id),  # SP_LOAN_APPROVAL → LOAN
        ]
        db.add_all(procedure_tables)
        db.commit()

        # ======================
        # ARCHIVES
        # ======================
        archives = [
            Archive(identifiant="1500"),
            Archive(identifiant="1501"),
        ]
        db.add_all(archives)
        db.commit()

        print("Seed terminé avec succès !")
        print(f"  - {len(users)} utilisateurs")
        print(f"  - {len(domaines)} domaines")
        print(f"  - {len(processes)} processus")
        print(f"  - {len(etapes)} étapes")
        print(f"  - {len(masques)} masques")
        print(f"  - {len(fonctionnalites)} fonctionnalités")
        print(f"  - {len(services)} services")
        print(f"  - {len(procedures)} procédures")
        print(f"  - {len(tables)} tables")
        print(f"  - {len(attributs)} attributs")
        print(f"  - {len(archives)} archives")

    except Exception as e:
        db.rollback()
        print(f"Erreur lors du seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
