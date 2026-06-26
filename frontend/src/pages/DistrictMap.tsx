import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const BASE = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000") + "/api";

interface District {
  district: string; health_index: number; status: string; color: string;
  objects_count: number; critical_objects: number; repair_required: number; average_risk: number;
}

const LEGEND = [
  { label: "90–100 · Отличное", color: "#16a34a" },
  { label: "75–89 · Хорошее", color: "#84cc16" },
  { label: "60–74 · Удовлетворительное", color: "#eab308" },
  { label: "40–59 · Требует внимания", color: "#f97316" },
  { label: "0–39 · Критическое", color: "#dc2626" },
];

export default function DistrictMap() {
  const [geo, setGeo] = useState<any>(null);
  const [ratings, setRatings] = useState<Record<string, District>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/analytics/district-rating`).then((r) => r.json()),
      fetch(`/zhambyl_districts.geojson`).then((r) => r.json()),
    ])
      .then(([rows, gj]) => {
        const map: Record<string, District> = {};
        (Array.isArray(rows) ? rows : []).forEach((d: District) => (map[d.district] = d));
        setRatings(map);
        setGeo(gj);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const style = (feature: any) => {
    const d = ratings[feature.properties.district];
    return { fillColor: d?.color ?? "#cbd5e1", weight: 1.5, color: "white", fillOpacity: 0.65 };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const d = ratings[feature.properties.district];
    const name = feature.properties.district;
    if (!d) { layer.bindPopup(`<b>${name}</b><br/>Нет данных`); return; }
    layer.bindPopup(
      `<div style="font-family:Inter,sans-serif;min-width:190px">
        <div style="font-weight:800;font-size:14px;margin-bottom:4px">${name}</div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px">
          <span style="font-size:26px;font-weight:900;color:${d.color}">${d.health_index}</span>
          <span style="font-size:12px;color:#94a3b8">/100</span>
          <span style="font-size:12px;font-weight:700;color:${d.color};margin-left:auto">${d.status}</span>
        </div>
        <div style="font-size:12px;color:#475569;line-height:1.7">
          Объектов: <b>${d.objects_count}</b><br/>
          Средний Risk Score: <b>${d.average_risk}</b><br/>
          Критических: <b style="color:#dc2626">${d.critical_objects}</b><br/>
          Требуют ремонта: <b>${d.repair_required}</b>
        </div>
      </div>`
    );
    layer.on({
      mouseover: (e: any) => e.target.setStyle({ fillOpacity: 0.85, weight: 2.5 }),
      mouseout: (e: any) => e.target.setStyle({ fillOpacity: 0.65, weight: 1.5 }),
    });
  };

  return (
    <div style={{ height: "calc(100vh - 0px)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 28px", background: "white", borderBottom: "1px solid var(--gray-200)" }}>
        <h1 style={{ fontSize: "22px", color: "var(--gray-900)", margin: "0 0 4px" }}>🗺️ Рейтинг районов на карте</h1>
        <p style={{ color: "var(--gray-500)", fontSize: "13px", margin: 0 }}>Цвет района = District Health Index. Клик — детали района.</p>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "12px" }}>
          {LEGEND.map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 14, height: 14, borderRadius: "4px", background: l.color }} />
              <span style={{ fontSize: "12px", color: "var(--gray-600)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <MapContainer center={[43.3, 72.2]} zoom={6} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          {ready && geo && (
            <GeoJSON key={Object.keys(ratings).length} data={geo} style={style as any} onEachFeature={onEachFeature} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
