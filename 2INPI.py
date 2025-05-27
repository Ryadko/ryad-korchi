import pandas as pd
import requests
import json
import os
import time
import logging
import sys
import random
import gspread
from datetime import datetime
import concurrent.futures
from tqdm import tqdm
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"inpi_requests_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("INPI-Scraper")

# Configuration
CONFIG = {
    # Google Sheets Configuration
    "SPREADSHEET_ID": "12RM2Kk7An2QiuUMdRFY8tyTn0QlLSjcM4gsVSnRTbkY",
    "SHEET_NAME": "Données",
    "CLIENT_SECRET_FILE": "client_secret.json",
    "TOKEN_FILE": "token.json",
    "PROGRESS_FILE": "scraping_progress.txt",
    "SCOPES": [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ],
    
    # INPI API Configuration
    "API_BASE_URL": "https://recherche-entreprises.api.gouv.fr/search",
    "EXCEL_PATH": "./BDDSIRET.xlsx",
    "BATCH_SIZE": 2,        # Nombre de requêtes par salve
    "BATCH_DELAY": 3,       # Délai entre les salves (en secondes)
    "REQUEST_TIMEOUT": 15,  # Timeout des requêtes (en secondes)
    "MAX_RETRIES": 3,       # Nombre maximal de tentatives par SIRET
    "JITTER": 0.5           # Variation aléatoire du délai (en secondes)
}

class INPIScraperWithTracking:
    def __init__(self, config=CONFIG):
        self.config = config
        self.client = None
        self.siret_list = []
        self.all_results = []
        self.start_time = None
        self.processed_count = 0
        self.total_count = 0
        
    def authenticate(self):
        """Handle OAuth 2.0 authentication with improved error handling"""
        creds = None
        
        # Remove existing token to avoid state conflicts
        if os.path.exists(self.config["TOKEN_FILE"]):
            try:
                os.remove(self.config["TOKEN_FILE"])
                logger.info(f"File {self.config['TOKEN_FILE']} removed to prevent state conflicts")
            except Exception as e:
                logger.error(f"Error removing token file: {str(e)}")
        
        try:
            # Simplified flow configuration
            flow = InstalledAppFlow.from_client_secrets_file(
                self.config["CLIENT_SECRET_FILE"], 
                self.config["SCOPES"]
            )
            
            logger.info("Opening browser for authentication...")
            creds = flow.run_local_server(port=8080)  # Using port=0 for automatic port selection
            
            # Save token
            with open(self.config["TOKEN_FILE"], 'w') as token:
                token.write(creds.to_json())
            
            self.client = gspread.authorize(creds)
            return True
            
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return False

    def load_siret_list(self):
        """
        Charge les numéros SIRET à partir d'un fichier Excel et filtre les valeurs incorrectes.
        Retourne une liste des SIRET valides.
        """
        try:
            logger.info(f"Chargement des SIRET depuis {self.config['EXCEL_PATH']}")
            df = pd.read_excel(self.config["EXCEL_PATH"], sheet_name="BDDSIRET", dtype=str)
            
            if df.empty or df.iloc[:, 0].isnull().all():
                logger.error("Aucun SIRET valide trouvé dans la feuille BDDSIRET.")
                return []
            
            df.iloc[:, 0] = df.iloc[:, 0].astype(str).str.strip()

            # Vérifier que chaque SIRET fait exactement 14 chiffres
            valid_sirets = df[df.iloc[:, 0].str.match(r'^\d{14}$', na=False)]
            invalid_count = len(df) - len(valid_sirets)
            
            if invalid_count > 0:
                logger.warning(f"{invalid_count} SIRET invalides ignorés")
            
            siret_list = valid_sirets.iloc[:, 0].tolist()
            logger.info(f"{len(siret_list)} SIRET valides chargés")
            
            # Vérifier s'il existe une feuille "INPI" avec des SIRET déjà traités
            try:
                if "INPI" in pd.ExcelFile(self.config["EXCEL_PATH"]).sheet_names:
                    df_processed = pd.read_excel(self.config["EXCEL_PATH"], sheet_name="INPI", dtype=str)
                    if not df_processed.empty and "SIRET" in df_processed.columns:
                        processed_sirets = set(df_processed["SIRET"].astype(str).tolist())
                        new_siret_list = [s for s in siret_list if s not in processed_sirets]
                        logger.info(f"{len(processed_sirets)} SIRET déjà traités détectés")
                        logger.info(f"Reste {len(new_siret_list)} SIRET à traiter")
                        self.siret_list = new_siret_list
                        return len(siret_list), len(new_siret_list)
            except Exception as e:
                logger.warning(f"Impossible de vérifier les SIRET déjà traités: {e}")
            
            self.siret_list = siret_list
            return len(siret_list), len(siret_list)
        except Exception as e:
            logger.error(f"Erreur lors du chargement des SIRET : {e}")
            return 0, 0

    def update_progress_sheet(self):
        """Send data to Google Sheet with proper error handling and retries"""
        if not self.client:
            if not self.authenticate():
                return False
                
        try:
            # Calculate values
            if self.total_count <= 0:
                logger.warning("Total items is zero or negative, cannot calculate progress")
                return False
                
            progress = round((self.processed_count / self.total_count) * 100, 2)
            remaining = self.total_count - self.processed_count
            status = "Terminé" if progress >= 100 else "En cours"
            
            # Prepare data
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            new_row = [
                timestamp,          # Date
                self.total_count,   # Total
                self.processed_count, # Scrapped
                f"{progress}%",     # Progress
                remaining,          # Remaining
                status              # Status
            ]
            
            # Get sheet and append row
            sheet = self.client.open_by_key(self.config["SPREADSHEET_ID"]).worksheet(self.config["SHEET_NAME"])
            sheet.append_row(new_row, value_input_option="USER_ENTERED")
            logger.info(f"Data successfully sent to Google Sheet: {progress}% complete")
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending data to sheet: {str(e)}")
            # Try to reauthenticate once in case of token expiration
            try:
                logger.info("Attempting to reauthenticate...")
                if self.authenticate():
                    sheet = self.client.open_by_key(self.config["SPREADSHEET_ID"]).worksheet(self.config["SHEET_NAME"])
                    sheet.append_row(new_row, value_input_option="USER_ENTERED")
                    logger.info("Data sent after reauthentication")
                    return True
            except Exception as e2:
                logger.error(f"Reauthentication failed: {str(e2)}")
            
            return False

    def update_progress_file(self):
        """Update progress file with number of scraped items"""
        try:
            with open(self.config["PROGRESS_FILE"], "w") as f:
                f.write(f"{self.total_count},{self.processed_count}")
                
            logger.info(f"Progress file updated: {self.processed_count}/{self.total_count} items")
            return True
            
        except Exception as e:
            logger.error(f"Error updating progress file: {str(e)}")
            return False

    def fetch_company_data(self, siret):
        """
        Envoie une requête à l'API Recherche d'entreprises pour récupérer les données associées à un SIRET donné.
        Retourne un dictionnaire contenant les données de l'entreprise ou un message d'erreur.
        """
        try:
            if len(siret) != 14 or not siret.isdigit():
                logger.warning(f"SIRET invalide ignoré : {siret}")
                return {
                    "header": {
                        "statut": 400,
                        "message": "SIRET invalide - Doit contenir 14 chiffres"
                    },
                    "siret": siret,
                    "error": "Format SIRET incorrect"
                }
            
            # Définition des paramètres de requête
            params = {
                "q": siret,
                "per_page": 1  # On limite à un seul résultat
            }
            
            # Ajout d'un User-Agent aléatoire pour éviter d'être détecté comme un bot
            headers = {
                "User-Agent": f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{random.randint(90, 110)}.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Accept-Language": "fr,fr-FR;q=0.9,en-US;q=0.8,en;q=0.7"
            }
            
            logger.debug(f"Envoi de la requête pour le SIRET : {siret}")
            response = requests.get(
                self.config["API_BASE_URL"], 
                params=params, 
                headers=headers,
                timeout=self.config["REQUEST_TIMEOUT"]
            )

            if response.status_code == 200:
                data = response.json()
                # Vérifier si les résultats contiennent le SIRET recherché
                results = data.get("results", [])
                if not results:
                    logger.warning(f"Aucun résultat trouvé pour le SIRET {siret}")
                    return {
                        "header": {
                            "statut": 404,
                            "message": "Aucun résultat trouvé"
                        },
                        "siret": siret,
                        "data": {"results": []}
                    }
                
                logger.info(f"Données récupérées avec succès pour SIRET {siret}")
                return {
                    "header": {
                        "statut": response.status_code,
                        "message": "ok"
                    },
                    "siret": siret,
                    "data": data
                }
            elif response.status_code == 429:  # Too Many Requests
                logger.warning(f"Rate limit atteint pour le SIRET {siret}")
                return {
                    "header": {
                        "statut": response.status_code,
                        "message": "Too Many Requests - Réessayer plus tard"
                    },
                    "siret": siret,
                    "error": "Rate limit exceeded"
                }
            else:
                logger.error(f"Erreur API pour SIRET {siret} : {response.status_code}")
                return {
                    "header": {
                        "statut": response.status_code,
                        "message": "Erreur lors de la récupération"
                    },
                    "siret": siret,
                    "error": response.text if hasattr(response, 'text') else "Erreur inconnue"
                }
        except requests.exceptions.Timeout:
            logger.error(f"Timeout pour le SIRET {siret}")
            return {
                "header": {
                    "statut": 408,
                    "message": "Timeout"
                },
                "siret": siret,
                "error": "Requête expirée"
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur réseau/API pour {siret} : {e}")
            return {
                "header": {
                    "statut": 500,
                    "message": "Erreur réseau/API"
                },
                "siret": siret,
                "error": str(e)
            }

    def fetch_company_data_with_retry(self, siret):
        """
        Tente de récupérer les données d'un SIRET avec plusieurs essais en cas d'échec.
        """
        for attempt in range(1, self.config["MAX_RETRIES"] + 1):
            try:
                if attempt > 1:
                    # Attente exponentielle en cas de tentatives multiples
                    backoff_time = self.config["BATCH_DELAY"] * (2 ** (attempt - 1)) + random.uniform(0, self.config["JITTER"])
                    logger.info(f"SIRET {siret}: Tentative {attempt}/{self.config['MAX_RETRIES']} après {backoff_time:.2f}s")
                    time.sleep(backoff_time)
                
                result = self.fetch_company_data(siret)
                
                # Si succès ou erreur définitive (mauvais format), on arrête les tentatives
                if result["header"]["statut"] == 200 or result["header"]["statut"] == 400:
                    return result
                    
                # Si erreur de rate limit, on attend plus longtemps avant la prochaine tentative
                if result["header"]["statut"] == 429:
                    continue
                    
            except Exception as e:
                logger.error(f"Erreur non gérée pour {siret}, tentative {attempt}: {e}")
                if attempt == self.config["MAX_RETRIES"]:
                    return {
                        "header": {
                            "statut": 500,
                            "message": f"Échec après {self.config['MAX_RETRIES']} tentatives"
                        },
                        "siret": siret,
                        "error": str(e)
                    }
        
        # Si on arrive ici, c'est que toutes les tentatives ont échoué
        logger.warning(f"Toutes les tentatives ont échoué pour le SIRET {siret}")
        return {
            "header": {
                "statut": 429,
                "message": f"Échec après {self.config['MAX_RETRIES']} tentatives - Rate limiting persistant"
            },
            "siret": siret,
            "error": "Rate limit exceeded on all attempts"
        }

    def process_batch(self, batch):
        """
        Traite un lot de SIRET en parallèle et retourne les résultats.
        """
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.config["BATCH_SIZE"]) as executor:
            futures = {executor.submit(self.fetch_company_data_with_retry, siret): siret for siret in batch}
            for future in concurrent.futures.as_completed(futures):
                siret = futures[future]
                try:
                    data = future.result()
                    results.append([siret, json.dumps(data, ensure_ascii=False)])
                    
                    # Incrémenter le compteur des éléments traités
                    self.processed_count += 1
                except Exception as e:
                    logger.exception(f"Exception non gérée pour {siret}")
                    results.append([siret, json.dumps({
                        "header": {
                            "statut": 500,
                            "message": "Exception non gérée"
                        },
                        "siret": siret,
                        "error": str(e)
                    }, ensure_ascii=False)])
                    
                    # Incrémenter même en cas d'erreur
                    self.processed_count += 1
        return results

    def save_results_to_excel(self, results, final=False):
        """
        Enregistre les résultats sous forme de JSON dans une feuille Excel.
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            df_results = pd.DataFrame(results, columns=["SIRET", "Données_JSON"])
            logger.info(f"Enregistrement de {len(df_results)} résultats dans Excel")
            
            # Créer une copie de sauvegarde du fichier original lors de la première sauvegarde
            if not os.path.exists(f"backup_{os.path.basename(self.config['EXCEL_PATH'])}") and os.path.exists(self.config["EXCEL_PATH"]):
                try:
                    backup_path = f"backup_{timestamp}_{os.path.basename(self.config['EXCEL_PATH'])}"
                    pd.read_excel(self.config["EXCEL_PATH"]).to_excel(backup_path, index=False)
                    logger.info(f"Sauvegarde créée : {backup_path}")
                except Exception as e:
                    logger.warning(f"Impossible de créer une sauvegarde : {e}")
            
            # Vérifier s'il existe déjà une feuille INPI et fusionner les résultats
            if not final:
                try:
                    # On vérifie si on peut ajouter à une feuille existante
                    existing_df = None
                    if os.path.exists(self.config["EXCEL_PATH"]):
                        with pd.ExcelFile(self.config["EXCEL_PATH"]) as xls:
                            if "INPI" in xls.sheet_names:
                                existing_df = pd.read_excel(xls, sheet_name="INPI")
                    
                    if existing_df is not None and not existing_df.empty:
                        # Fusion avec les données existantes
                        logger.info(f"Fusion avec {len(existing_df)} entrées existantes")
                        combined_df = pd.concat([existing_df, df_results], ignore_index=True)
                        # Suppression des doublons éventuels
                        combined_df.drop_duplicates(subset=["SIRET"], keep="last", inplace=True)
                        df_results = combined_df
                except Exception as e:
                    logger.warning(f"Impossible de fusionner avec les données existantes: {e}")
            
            # Sauvegarde des résultats
            try:
                # Pour les sauvegardes finales ou si le fichier existe déjà, utiliser le writer
                if os.path.exists(self.config["EXCEL_PATH"]):
                    with pd.ExcelWriter(self.config["EXCEL_PATH"], mode="a", if_sheet_exists="replace", engine="openpyxl") as writer:
                        df_results.to_excel(writer, sheet_name="INPI", index=False)
                    logger.info("Données enregistrées dans la feuille INPI du fichier existant")
                else:
                    # Sinon, créer un nouveau fichier
                    df_results.to_excel(self.config["EXCEL_PATH"], sheet_name="INPI", index=False)
                    logger.info(f"Nouveau fichier créé : {self.config['EXCEL_PATH']}")
            except Exception as e:
                # En cas d'erreur, on essaie de sauvegarder dans un nouveau fichier
                output_path = f"resultats_INPI_{timestamp}.xlsx"
                df_results.to_excel(output_path, index=False)
                logger.warning(f"Erreur avec le fichier original, données sauvegardées dans : {output_path}")
                logger.error(f"Détail de l'erreur : {e}")
        except Exception as e:
            logger.critical(f"Erreur lors de l'enregistrement Excel : {e}")
            # Sauvegarde d'urgence en JSON
            try:
                emergency_file = f"emergency_backup_INPI_{timestamp}.json"
                with open(emergency_file, 'w', encoding='utf-8') as f:
                    json.dump(results, f, ensure_ascii=False, indent=4)
                logger.warning(f"Sauvegarde d'urgence créée : {emergency_file}")
            except Exception as backup_error:
                logger.critical(f"ERREUR CRITIQUE - Impossible de sauvegarder les données : {backup_error}")

    def analyze_results(self, results):
        """
        Analyse les résultats pour déterminer le taux de succès et d'erreur.
        """
        if not results:
            return {"success_rate": 0, "error_rate": 100, "rate_limit_count": 0}
        
        total = len(results)
        success_count = 0
        rate_limit_count = 0
        timeout_count = 0
        other_errors = 0
        
        for siret, json_data in results:
            try:
                data = json.loads(json_data)
                if data.get("header", {}).get("statut") == 200:
                    success_count += 1
                elif data.get("header", {}).get("statut") == 429:
                    rate_limit_count += 1
                elif data.get("header", {}).get("statut") == 408:
                    timeout_count += 1
                else:
                    other_errors += 1
            except:
                other_errors += 1
        
        return {
            "success_rate": (success_count / total) * 100,
            "error_rate": ((total - success_count) / total) * 100,
            "rate_limit_count": rate_limit_count,
            "timeout_count": timeout_count,
            "other_errors": other_errors
        }

    def run(self):
        """
        Fonction principale qui coordonne l'exécution du script.
        """
        logger.info(f"Démarrage du script avec limitation de débit : {self.config['BATCH_SIZE']} requêtes toutes les {self.config['BATCH_DELAY']} secondes")
        self.start_time = time.time()
        
        # Authentifier pour le suivi dans Google Sheets
        self.authenticate()
        
        # Charger les SIRET et initialiser les compteurs
        self.total_count, remaining_count = self.load_siret_list()
        
        if not self.siret_list:
            logger.error("Aucun SIRET valide à traiter. Arrêt du script.")
            return
            
        # Initialiser le tracking dans Google Sheets
        self.processed_count = self.total_count - remaining_count
        self.update_progress_sheet()
        
        # Diviser la liste en lots (batches)
        batches = [self.siret_list[i:i+self.config["BATCH_SIZE"]] for i in range(0, len(self.siret_list), self.config["BATCH_SIZE"])]
        total_batches = len(batches)
        
        # Créer une barre de progression
        with tqdm(total=len(self.siret_list), desc="Traitement des SIRET") as pbar:
            # Mise à jour initiale pour montrer les progrès déjà réalisés
            if self.processed_count > 0:
                pbar.update(self.processed_count)
                
            self.all_results = []
            adaptive_delay = self.config["BATCH_DELAY"]  # Délai adaptatif initial
            
            try:
                for i, batch in enumerate(batches):
                    logger.info(f"Traitement du lot {i+1}/{total_batches} ({len(batch)} SIRET)")
                    batch_start = time.time()
                    
                    # Traitement du lot actuel
                    batch_results = self.process_batch(batch)
                    self.all_results.extend(batch_results)
                    
                    # Mise à jour de la barre de progression
                    pbar.update(len(batch))
                    
                    # Mettre à jour le fichier de progression et Google Sheets
                    if (i+1) % 5 == 0:
                        self.update_progress_file()
                        self.update_progress_sheet()
                    
                    # Analyse des résultats pour ajuster le délai
                    if (i+1) % 5 == 0:  # Tous les 5 lots
                        analysis = self.analyze_results(batch_results)
                        logger.info(f"Analyse des derniers résultats: {analysis}")
                        
                        # Ajustement adaptatif du délai en fonction du taux d'erreur de rate limiting
                        if analysis["rate_limit_count"] > 0:
                            # Augmenter le délai si on a des erreurs de rate limit
                            adaptive_delay = min(adaptive_delay * 1.5, 10)
                            logger.warning(f"Trop d'erreurs de rate limit, augmentation du délai à {adaptive_delay}s")
                        elif analysis["success_rate"] > 95:
                            # Réduire légèrement le délai si le taux de succès est très bon
                            adaptive_delay = max(adaptive_delay * 0.9, self.config["BATCH_DELAY"])
                            logger.info(f"Bon taux de succès, ajustement du délai à {adaptive_delay}s")
                    
                    # Sauvegarde intermédiaire tous les 10 lots ou si c'est le dernier lot
                    if (i+1) % 10 == 0:
                        self.save_results_to_excel(self.all_results, final=False)
                        logger.info(f"Sauvegarde intermédiaire effectuée après le lot {i+1}")
                    
                    # Pause entre les lots (sauf pour le dernier)
                    if i+1 < total_batches:
                        # Attente dynamique avec un peu de jitter
                        wait_time = adaptive_delay + random.uniform(-self.config["JITTER"], self.config["JITTER"])
                        wait_time = max(0.5, wait_time)  # Au moins 0.5 seconde
                        
                        batch_duration = time.time() - batch_start
                        if batch_duration < wait_time:
                            sleep_time = wait_time - batch_duration
                            logger.debug(f"Pause de {sleep_time:.2f}s avant le prochain lot...")
                            time.sleep(sleep_time)
                
                # Analyse finale des résultats
                final_analysis = self.analyze_results(self.all_results)
                logger.info(f"Analyse finale: Taux de succès {final_analysis['success_rate']:.2f}%, "
                          f"Erreurs de rate limit: {final_analysis['rate_limit_count']}, "
                          f"Timeouts: {final_analysis['timeout_count']}")
                
                # Sauvegarde finale
                self.save_results_to_excel(self.all_results, final=True)
                
            except KeyboardInterrupt:
                logger.warning("Interruption par l'utilisateur, sauvegarde des résultats partiels...")
                if self.all_results:
                    self.save_results_to_excel(self.all_results, final=True)
            except Exception as e:
                logger.critical(f"Erreur inattendue : {e}")
                if self.all_results:
                    self.save_results_to_excel(self.all_results, final=True)
            finally:
                # Mise à jour finale du suivi dans Google Sheets
                self.update_progress_sheet()
        
        total_time = time.time() - self.start_time
        logger.info(f"Scraping terminé en {total_time/60:.1f} minutes.")
        logger.info(f"{self.processed_count}/{self.total_count} SIRET traités.")
        
        # Génération d'un bilan final
        success_count = sum(1 for _, json_data in self.all_results if json.loads(json_data).get("header", {}).get("statut") == 200)
        logger.info(f"Bilan: {success_count} requêtes réussies sur {len(self.all_results)} ({success_count/len(self.all_results)*100:.1f}%)")
        return True

if __name__ == "__main__":
    scraper = INPIScraperWithTracking()
    scraper.run()