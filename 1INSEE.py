import pandas as pd
import requests
import json
import os

# Informations d'authentification INSEE
INSEE_API_URL = "https://api.insee.fr/entreprises/sirene/V3.11/siret/"
ACCESS_TOKEN = "efd84da2-bd54-39f7-93b8-c906152204c6"

BDDSIRET_PATH = "./BDDSIRET.xlsx"

# Charger les SIRET depuis la feuille Excel
def load_siret_list():
    try:
        df = pd.read_excel(BDDSIRET_PATH, sheet_name="BDDSIRET", dtype=str)  # Charger en str pour éviter la conversion en int
        
        if df.empty or df.iloc[:, 0].isnull().all():
            print("❌ Erreur : Aucun SIRET valide trouvé dans la feuille BDDSIRET.")
            return []
        
        # Nettoyer les valeurs, supprimer les espaces et s'assurer que ce sont bien des chaînes
        df.iloc[:, 0] = df.iloc[:, 0].astype(str).str.strip()

        # Vérifier que chaque SIRET fait exactement 14 chiffres
        df = df[df.iloc[:, 0].str.match(r'^\d{14}$', na=False)]
        
        siret_list = df.iloc[:, 0].tolist()
        print(f"✅ {len(siret_list)} SIRET valides chargés : {siret_list[:10]}")  # Afficher un aperçu des 10 premiers

        return siret_list
    except Exception as e:
        print(f"❌ Erreur lors du chargement des SIRET : {e}")
        return []

# Récupérer les données depuis l'API INSEE
def fetch_siret_data(siret):
    try:
        if len(siret) != 14 or not siret.isdigit():
            print(f"⚠️ SIRET invalide ignoré : {siret}")
            return {
                "header": {
                    "statut": 400,
                    "message": "SIRET invalide - Doit contenir 14 chiffres"
                },
                "siret": siret,
                "error": "Format SIRET incorrect"
            }
        
        url = f"{INSEE_API_URL}{siret}"
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Accept": "application/json"
        }
        
        print(f"🔍 Envoi de la requête pour le SIRET : {siret}")
        response = requests.get(url, headers=headers, timeout=10)  # Timeout pour éviter les blocages
        
        if response.status_code == 200:
            data = response.json()
            return {
                "header": {
                    "statut": response.status_code,
                    "message": "ok"
                },
                "etablissement": data.get("etablissement", {})
            }
        else:
            print(f"⚠️ Erreur API pour SIRET {siret} : {response.text}")
            return {
                "header": {
                    "statut": response.status_code,
                    "message": "Erreur lors de la récupération"
                },
                "siret": siret,
                "error": response.text
            }
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur réseau/API pour {siret} : {e}")
        return {
            "header": {
                "statut": 500,
                "message": "Erreur réseau/API"
            },
            "siret": siret,
            "error": str(e)
        }

# Sauvegarder les résultats dans une nouvelle feuille Excel
def save_results_to_excel(results):
    try:
        df_results = pd.DataFrame(results, columns=["SIRET", "Données_JSON"])
        print(f"📊 Enregistrement de {len(df_results)} résultats dans Excel...")
        
        with pd.ExcelWriter(BDDSIRET_PATH, mode="a", if_sheet_exists="replace", engine="openpyxl") as writer:
            df_results.to_excel(writer, sheet_name="INSEE", index=False)
        
        print("✅ Données enregistrées dans 'Résultats_JSON'.")
    except Exception as e:
        print(f"❌ Erreur lors de l'enregistrement Excel : {e}")

# Exécuter le script
if __name__ == "__main__":
    siret_list = load_siret_list()

    if not siret_list:
        print("❌ Aucun SIRET valide à traiter. Arrêt du script.")
        exit()

    results = []
    for siret in siret_list:
        data = fetch_siret_data(siret)
        results.append([siret, json.dumps(data, ensure_ascii=False, indent=4)])

    save_results_to_excel(results)
    print("✅ Scraping terminé. Résultats enregistrés dans la feuille de BDDSIRET.xlsx.")
