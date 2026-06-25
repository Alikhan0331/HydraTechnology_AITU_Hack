import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import MapPage from "./pages/MapPage";
import ObjectDetails from "./pages/ObjectDetails";
import Detection from "./pages/Detection";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--gray-50)" }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: "260px", minHeight: "100vh" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/object/:id" element={<ObjectDetails />} />
            <Route path="/detection" element={<Detection />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
