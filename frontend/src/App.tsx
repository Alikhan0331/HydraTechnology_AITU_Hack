import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import MapPage from "./pages/MapPage";
import ObjectDetails from "./pages/ObjectDetails";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: "240px", overflowY: "auto" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/object/:id" element={<ObjectDetails />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
