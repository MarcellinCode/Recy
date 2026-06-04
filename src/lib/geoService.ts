/**
 * Service de Géo-intelligence dynamique CleanZone.
 * Utilise l'API Nominatim d'OpenStreetMap pour obtenir les frontières réelles.
 */

export interface OSMResult {
    lat: string;
    lon: string;
    display_name: string;
    geojson: any;
}

/**
 * Récupère les données géographiques réelles d'une commune via OpenStreetMap.
 */
export async function fetchCommuneData(cityName: string) {
    try {
        // Nettoyage du nom
        const query = encodeURIComponent(`${cityName}, Côte d'Ivoire`);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&polygon_geojson=1&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'CleanZone-App/1.0',
                'Accept-Language': 'fr'
            },
            next: { revalidate: 86400 } // Cache d'un jour
        });

        if (!response.ok) throw new Error("Erreur de connexion à OpenStreetMap");

        const data = await response.json() as OSMResult[];

        if (!data || data.length === 0) {
            console.warn(`Aucun résultat trouvé pour la commune : ${cityName}`);
            return null;
        }

        const result = data[0];

        return {
            center: [parseFloat(result.lat), parseFloat(result.lon)] as [number, number],
            displayName: result.display_name,
            geojson: result.geojson,
            // On s'assure que c'est un polygone ou un multipolygone
            isValidGeometry: result.geojson.type === "Polygon" || result.geojson.type === "MultiPolygon"
        };
    } catch (error) {
        console.error("OSM Geocoding Error:", error);
        return null;
    }
}
