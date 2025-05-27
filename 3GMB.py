import requests
import pandas as pd
import time
from openpyxl import load_workbook

# Remplace par ta clé API
API_KEY = "AIzaSyDRKtdrrochn0hk5zL1PpT4K-fdTovxQy0"

# Chemin du fichier Excel
fichier_excel = "BDDSIRET.xlsx"

def rechercher_entreprise(nom, ville):
    """Fonction qui recherche une entreprise via l'API Google Places"""
    # Création de la requête avec le nom de l'entreprise et la ville
    query = f"{nom} {ville}"
    
    # Étape 1 : Recherche du lieu via Text Search
    textsearch_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    textsearch_params = {
        "query": query,
        "key": API_KEY
    }

    response = requests.get(textsearch_url, params=textsearch_params)
    data = response.json()
    
    # Initialiser les variables avec des valeurs vides
    result_data = {
        "nom": "",
        "adresse": "",
        "telephone_local": "",
        "telephone_international": "",
        "site_web": "",
        "lien_maps": "",
        "statut": "Non trouvé"
    }
    
    if response.status_code != 200 or not data.get("results"):
        return result_data
    
    # On extrait le place_id du premier résultat
    place_id = data["results"][0]["place_id"]
    
    # Étape 2 : Appel à Place Details pour info complémentaire
    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
    details_params = {
        "place_id": place_id,
        "fields": "name,formatted_phone_number,international_phone_number,website,formatted_address,url",
        "key": API_KEY
    }

    details_response = requests.get(details_url, params=details_params)
    details_data = details_response.json()

    if details_response.status_code != 200 or "result" not in details_data:
        result_data["statut"] = "Erreur API"
        return result_data
    
    result = details_data["result"]
    
    # Mise à jour des données avec les résultats trouvés
    result_data = {
        "nom": result.get('name', ''),
        "adresse": result.get('formatted_address', ''),
        "telephone_local": result.get('formatted_phone_number', ''),
        "telephone_international": result.get('international_phone_number', ''),
        "site_web": result.get('website', ''),
        "lien_maps": result.get('url', ''),
        "statut": "Trouvé"
    }
    
    return result_data

def main():
    try:
        # Lire le fichier Excel - prendre uniquement les colonnes nécessaires
        print("Lecture du fichier Excel...")
        df = pd.read_excel(fichier_excel, sheet_name="Reformatage")
        
        # Création d'un DataFrame pour stocker les résultats
        resultats = pd.DataFrame(columns=[
            "Raison Sociale", "Ville", "Nom GMB", "Adresse", 
            "Téléphone local", "Téléphone international", 
            "Site web", "Lien Google Maps", "Statut"
        ])
        
        # Parcourir chaque ligne du DataFrame
        total = len(df)
        print(f"Traitement de {total} entreprises...")
        
        for index, row in df.iterrows():
            nom = row["data_results_0_nom_raison_sociale"]
            ville = row["data_results_0_siege_libelle_commune"]
            
            print(f"Recherche {index+1}/{total}: {nom} à {ville}")
            
            # Rechercher l'entreprise
            resultat = rechercher_entreprise(nom, ville)
            
            # Ajouter le résultat au DataFrame des résultats
            resultats.loc[index] = [
                nom, 
                ville, 
                resultat["nom"], 
                resultat["adresse"], 
                resultat["telephone_local"], 
                resultat["telephone_international"],
                resultat["site_web"], 
                resultat["lien_maps"],
                resultat["statut"]
            ]
            
            # Pause pour éviter de dépasser les limites de l'API
            if index < total - 1:  # Pas de pause après la dernière requête
                time.sleep(0.5)  # 500ms de pause entre chaque requête
        
        print("Enregistrement des résultats...")
        
        # Écrire les résultats dans une nouvelle feuille "GMB" du même fichier
        with pd.ExcelWriter(fichier_excel, engine='openpyxl', mode='a') as writer:
            # Vérifier si la feuille GMB existe déjà
            if 'GMB' in pd.ExcelFile(fichier_excel).sheet_names:
                # Charger le classeur
                book = load_workbook(fichier_excel)
                # Supprimer la feuille existante
                std = book['GMB']
                book.remove(std)
                book.save(fichier_excel)
            
            # Écrire les résultats dans une nouvelle feuille
            resultats.to_excel(writer, sheet_name='GMB', index=False)
        
        print("Traitement terminé avec succès!")
        
    except Exception as e:
        print(f"Une erreur est survenue: {e}")

if __name__ == "__main__":
    main()