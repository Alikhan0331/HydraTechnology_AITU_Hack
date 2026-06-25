import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import MapPage from "./pages/MapPage";
import ObjectDetails from "./pages/ObjectDetails";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ paddingTop: "60px" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/object/:id" element={<ObjectDetails />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
