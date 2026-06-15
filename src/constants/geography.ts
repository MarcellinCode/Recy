export interface GeographyData {
  [commune: string]: {
    [quartier: string]: string[]; // Liste des sous-quartiers
  };
}

export const GEOGRAPHY_HIERARCHY: GeographyData = {
  "Cocody": {
    "Angré": ["Angré 7e Tranche", "Angré 8e Tranche", "Château", "Djibi"],
    "Deux Plateaux": ["Vallons", "Las Palmas", "Aghien"],
    "Riviera": [
      "Riviera 1", 
      "Riviera 2", 
      "Riviera 3", 
      "Riviera 4", 
      "Riviera Golf", 
      "Riviera Palmeraie", 
      "Riviera Bonoumin", 
      "Riviera M'Badon"
    ],
    "Faya": ["Faya Centre"],
    "Akouédo": ["Akouédo Village"],
    "M'Pouto": ["M'Pouto"],
    "Danga": ["Danga"],
    "Lycée Technique": ["Lycée Technique"],
    "Ambassades": ["Ambassades"],
    "Cocody Centre": ["Saint-Jean", "Cocovico"]
  },
  "Yopougon": {
    "Niangon": ["Niangon Nord", "Niangon Sud"],
    "Maroc": ["Maroc"],
    "Siporex": ["Siporex"],
    "Gesco": ["Gesco"],
    "Selmer": ["Selmer"],
    "Wassakara": ["Wassakara"],
    "Sicogi": ["Sicogi"],
    "Sogefiha": ["Sogefiha"],
    "Sideci": ["Sideci"],
    "Andokoi": ["Andokoi"],
    "Académie": ["Académie"],
    "Banco Nord": ["Banco Nord"],
    "Yao Séhi": ["Yao Séhi"],
    "Sicobois": ["Sicobois"],
    "Azito": ["Azito"],
    "Lokoa": ["Lokoa"],
    "Adiopodoumé": ["Adiopodoumé"]
  },
  "Marcory": {
    "Zone 4": ["Rue du Canal", "Zone 4C", "Zone 4B"],
    "Zone 3": ["Zone 3 Nord", "Zone 3 Sud"],
    "Biétry": ["Biétry Village", "Résidentiel"],
    "Marcory Résidentiel": ["Résidentiel"],
    "Marcory Sans Fil": ["Sans Fil"],
    "Anoumabo": ["Quartier Sicogi", "Petit Anoumabo"],
    "Aliodan": ["Aliodan"],
    "Hibiscus": ["Hibiscus"],
    "Ebrié": ["Ebrié"]
  },
  "Koumassi": {
    "Remblais": ["Remblais"],
    "Divo": ["Divo"],
    "Sopim": ["Sopim"],
    "Soweto": ["Soweto"],
    "Grand Campement": ["Grand Campement"],
    "Zone Industrielle": ["Zone Industrielle"],
    "Prodomo": ["Prodomo"],
    "Sicogi": ["Sicogi 1", "Sicogi 2"],
    "Campement": ["Campement"],
    "Saint-Étienne": ["Saint-Étienne"],
    "Kankankoura": ["Kankankoura"]
  },
  "Treichville": {
    "Arras": ["Arras 1", "Arras 2"],
    "Belleville": ["Belleville"],
    "France-Amérique": ["France-Amérique"],
    "Avenue 8": ["Avenue 8"],
    "Avenue 12": ["Avenue 12"],
    "Avenue 16": ["Avenue 16"],
    "Biafra": ["Biafra"],
    "Cité du Port": ["Cité du Port"],
    "Zone Portuaire": ["Zone Portuaire"],
    "Mosquée": ["Mosquée"]
  },
  "Plateau": {
    "Cité Administrative": ["Tour A", "Tour B"],
    "Centre des Affaires": ["Plateau Centre", "Boulevard Lagunaire"],
    "Carena": ["Carena"],
    "Indénié": ["Indénié"],
    "Gallieni": ["Gallieni"],
    "République": ["République"]
  },
  "Port-Bouët": {
    "Vridi": ["Vridi Canal", "Vridi Cité"],
    "Gonzagueville": ["Gonzagueville"],
    "Adjouffou": ["Adjouffou 1", "Adjouffou 2"],
    "Jean-Folly": ["Jean-Folly"],
    "Aéroport": ["Zone Aéroportuaire"],
    "Petit-Bassam": ["Petit-Bassam"],
    "Derrière Wharf": ["Derrière Wharf"],
    "Abouabou": ["Abouabou"],
    "Cité Universitaire": ["Cité Universitaire"],
    "Centre-Phare": ["Centre-Phare"]
  },
  "Abobo": {
    "Abobo-Té": ["Abobo-Té"],
    "Sagbé": ["Sagbé Village", "Derrière Rails"],
    "BC": ["BC"],
    "PK18": ["PK18"],
    "Avocatier": ["Avocatier 1", "Avocatier 2"],
    "Akeikoi": ["Akeikoi"],
    "N'Dotré": ["N'Dotré"],
    "Samaké": ["Samaké"],
    "Kennedy": ["Kennedy"],
    "Habitat": ["Habitat"],
    "Clouetcha": ["Clouetcha"],
    "Anonkoua-Kouté": ["Anonkoua-Kouté"],
    "Plaque": ["Plaque 1", "Plaque 2", "Plaque 3"]
  }
};
