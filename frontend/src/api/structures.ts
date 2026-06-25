import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8000/api" });

export const getStructures = (params?: object) =>
  API.get("/structures", { params });

export const getStructure = (id: number) =>
  API.get(`/structures/${id}`);

export const getMapData = () =>
  API.get("/structures/map");

export const getSummary = () =>
  API.get("/analytics/summary");

export interface Structure {
  id: number;
  name: string;
  type: string;
  district: string;
  condition: string;
  risk_level: string;
  latitude: number;
  longitude: number;
  length_km?: number;
  year_built?: number;
  last_inspection?: string;
  description?: string;
}
