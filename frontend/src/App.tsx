import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { getRegions, type RegionFeatureCollection } from "./api";

const defaultCenter: LatLngExpression = [28.61, 77.16];

export default function App() {
  const [regions, setRegions] = useState<RegionFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRegions() {
      try {
        const data = await getRegions();
        setRegions(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadRegions();
  }, []);

  const mapMessage = useMemo(() => {
    if (loading) return "Loading regions...";
    if (error) return `Failed to load regions: ${error}`;
    if (!regions || regions.features.length === 0) return "No regions found.";
    return null;
  }, [loading, error, regions]);

  return (
    <div className="app">
      <header className="header">
        <h1>Satellite Crop Advisory</h1>
        <p>Day 1 Task 6: Region map from live API</p>
      </header>

      <main className="main">
        {mapMessage ? (
          <div className="status">{mapMessage}</div>
        ) : (
          <MapContainer center={defaultCenter} zoom={10} className="map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {regions && (
              <GeoJSON
                data={regions as unknown as GeoJSON.GeoJsonObject}
                style={{
                  color: "#0f766e",
                  weight: 2,
                  fillColor: "#14b8a6",
                  fillOpacity: 0.2
                }}
              />
            )}
          </MapContainer>
        )}
      </main>
    </div>
  );
}
