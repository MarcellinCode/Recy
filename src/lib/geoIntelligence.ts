/**
 * Référentiel géographique pour l'intelligence automatique du territoire CITICLINE.
 * Contient les centres et polygones simplifiés pour toute la Côte d'Ivoire.
 */

export interface MunicipalityGeo {
    center: [number, number]; // [lat, lng]
    zoom: number;
    boundaries: number[][]; // [lng, lat][] pour GeoJSON
}

export const CI_MUNICIPALITIES: Record<string, MunicipalityGeo> = {
    // --- ABIDJAN ---
    "Yopougon": {
        center: [5.3375, -4.0625],
        zoom: 13,
        boundaries: [[-4.08, 5.32], [-4.03, 5.32], [-4.03, 5.37], [-4.08, 5.37], [-4.08, 5.32]]
    },
    "Cocody": {
        center: [5.3450, -3.9850],
        zoom: 13,
        boundaries: [[-4.01, 5.32], [-3.94, 5.32], [-3.94, 5.38], [-4.01, 5.38], [-4.01, 5.32]]
    },
    "Abobo": {
        center: [5.4166, -4.0166],
        zoom: 13,
        boundaries: [[-4.05, 5.39], [-3.98, 5.39], [-3.98, 5.45], [-4.05, 5.45], [-4.05, 5.39]]
    },
    "Plateau": {
        center: [5.3200, -4.0200],
        zoom: 15,
        boundaries: [[-4.03, 5.31], [-4.01, 5.31], [-4.01, 5.33], [-4.03, 5.33], [-4.03, 5.31]]
    },
    "Marcory": {
        center: [5.3000, -3.9900],
        zoom: 14,
        boundaries: [[-4.01, 5.28], [-3.97, 5.28], [-3.97, 5.32], [-4.01, 5.32], [-4.01, 5.28]]
    },
    "Treichville": {
        center: [5.3000, -4.0150],
        zoom: 14,
        boundaries: [[-4.03, 5.28], [-4.00, 5.28], [-4.00, 5.32], [-4.03, 5.32], [-4.03, 5.28]]
    },
    "Koumassi": {
        center: [5.3000, -3.9600],
        zoom: 14,
        boundaries: [[-3.98, 5.28], [-3.94, 5.28], [-3.94, 5.32], [-3.98, 5.32], [-3.98, 5.28]]
    },
    "Port-Bouët": {
        center: [5.2500, -3.9400],
        zoom: 13,
        boundaries: [[-4.00, 5.20], [-3.88, 5.20], [-3.88, 5.30], [-4.00, 5.30], [-4.00, 5.20]]
    },
    "Adjamé": {
        center: [5.3500, -4.0200],
        zoom: 14,
        boundaries: [[-4.04, 5.33], [-4.00, 5.33], [-4.00, 5.37], [-4.04, 5.37], [-4.04, 5.33]]
    },
    "Attécoubé": {
        center: [5.3300, -4.0300],
        zoom: 14,
        boundaries: [[-4.05, 5.31], [-4.01, 5.31], [-4.01, 5.35], [-4.05, 5.35], [-4.05, 5.31]]
    },

    // --- INTERIEUR DU PAYS ---
    "Yamoussoukro": {
        center: [6.8276, -5.2893],
        zoom: 13,
        boundaries: [[-5.32, 6.80], [-5.25, 6.80], [-5.25, 6.85], [-5.32, 6.85], [-5.32, 6.80]]
    },
    "Bouaké": {
        center: [7.6894, -5.0303],
        zoom: 13,
        boundaries: [[-5.07, 7.65], [-4.99, 7.65], [-4.99, 7.72], [-5.07, 7.72], [-5.07, 7.65]]
    },
    "San-Pédro": {
        center: [4.7485, -6.6363],
        zoom: 13,
        boundaries: [[-6.68, 4.72], [-6.59, 4.72], [-6.59, 4.78], [-6.68, 4.78], [-6.68, 4.72]]
    },
    "Korhogo": {
        center: [9.4580, -5.6295],
        zoom: 13,
        boundaries: [[-5.67, 9.42], [-5.58, 9.42], [-5.58, 9.50], [-5.67, 9.50], [-5.67, 9.42]]
    },
    "Daloa": {
        center: [6.8773, -6.4502],
        zoom: 13,
        boundaries: [[-6.49, 6.84], [-6.41, 6.84], [-6.41, 6.91], [-6.49, 6.91], [-6.49, 6.84]]
    },
    "Man": {
        center: [7.4125, -7.5538],
        zoom: 13,
        boundaries: [[-7.60, 7.38], [-7.51, 7.38], [-7.51, 7.45], [-7.60, 7.45], [-7.60, 7.38]]
    },
    "Gagnoa": {
        center: [6.1319, -5.9506],
        zoom: 13,
        boundaries: [[-6.00, 6.10], [-5.90, 6.10], [-5.90, 6.16], [-6.00, 6.16], [-6.00, 6.10]]
    }
};

/**
 * Retourne les données géographiques par défaut pour une ville de Côte d'Ivoire.
 */
export function getMunicipalityGeo(name: string): MunicipalityGeo {
    if (!name) return CI_MUNICIPALITIES["Yopougon"]; // Default to Yopougon if empty for safety

    const cleanName = name
        .replace(/Mairie de |Commune de |Ville de /gi, "")
        .trim()
        .toLowerCase();
    
    // Recherche par correspondance exacte ou inclusion
    const match = Object.keys(CI_MUNICIPALITIES).find(k => 
        cleanName.includes(k.toLowerCase()) || k.toLowerCase().includes(cleanName)
    );

    if (match) return CI_MUNICIPALITIES[match];

    // Fallback Abidjan Centre (Yopougon par défaut pour cette instance)
    return CI_MUNICIPALITIES["Yopougon"];
}
