import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// existing pages
import PatientHome from "./pages/PatientHome";
import CheckIn from "./pages/CheckIn";
import DoctorDashboard from "./pages/DoctorDashboard";

// auth pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CompleteProfile from "./pages/CompleteProfile";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ✅ DEFAULT → LOGIN FIRST */}
          <Route path="/" element={<Login />} />

          {/* AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

          {/* DASHBOARD */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/doctor" element={<DoctorDashboard />} />

          {/* EXISTING FEATURES */}
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/home" element={<PatientHome />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}