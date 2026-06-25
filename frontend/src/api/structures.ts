import axios from "axios";

const BASE = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000") + "/api";

export interface Structure {
  id: number;
  name: string;
  type: string;
  district: string;
  condition: string;
  risk_level: string;
  latitude: number;
  longitude: number;
}

export const getStructures = (params?: Record<string, string>) =>
  axios.get(`${BASE}/structures`, { params }).catch(() => ({ data: [] }));

export const getStructure = (id: number) =>
  axios.get(`${BASE}/structures/${id}`);

export const createStructure = (data: Record<string, any>) =>
  axios.post(`${BASE}/structures`, data);

export const updateStructure = (id: number, data: Record<string, any>) =>
  axios.put(`${BASE}/structures/${id}`, data);

export const deleteStructure = (id: number) =>
  axios.delete(`${BASE}/structures/${id}`);

export const getMapData = () =>
  axios.get(`${BASE}/structures/map`);

export const getSummary = () =>
  axios.get(`${BASE}/analytics/summary`);

export const getAnalyticsDashboard = () =>
  axios.get(`${BASE}/analytics/dashboard`);

export const getAnalyticsCharts = () =>
  axios.get(`${BASE}/analytics/charts`);

export const getAnalyticsDynamics = () =>
  axios.get(`${BASE}/analytics/dynamics`);

export const getTopRisk = (limit = 10) =>
  axios.get(`${BASE}/analytics/top-risk`, { params: { limit } });

export const getStructureRisk = (id: number) =>
  axios.get(`${BASE}/structures/${id}/risk`);

export const recomputeRisk = (id: number) =>
  axios.post(`${BASE}/structures/${id}/risk`);

export const getInspections = (id: number) =>
  axios.get(`${BASE}/structures/${id}/inspections`);

export const addInspection = (id: number, data: Record<string, any>) =>
  axios.post(`${BASE}/structures/${id}/inspections`, data);

export const getMeta = (key: string) =>
  axios.get(`${BASE}/meta/${key}`);

// Добавить объект из OSM/Detection в каталог
export const addStructureFromOSM = (data: {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  district?: string;
  source?: string;
  confidence?: number;
}) => axios.post(`${BASE}/structures`, {
  name: data.name,
  type: data.type,
  latitude: data.latitude,
  longitude: data.longitude,
  district: data.district ?? "Не указан",
  condition: "monitoring",
  risk_level: "medium",
  source: data.source,
  confidence: data.confidence,
});
