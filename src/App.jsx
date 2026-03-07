import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import Clients from "./pages/admin/Clients";
import Sources from "./pages/admin/Sources";
import Backlinks from "./pages/admin/Backlinks";
import Reports from "./pages/admin/Reports";
import Profile from "./pages/admin/Profile";
import StaffDashboard from "./pages/Staff/StaffDashboard";
import StaffBacklinks from "./pages/Staff/StaffBacklinks";
import StaffProfile from "./pages/Staff/StaffProfile";
import PrivateRoute from "./components/PrivateRoute";

function App() {
 return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={<PrivateRoute><Dashboard /></PrivateRoute>} 
          />
          <Route 
            path="/clients" 
            element={<PrivateRoute><Clients /></PrivateRoute>} 
          />
          <Route 
            path="/sources" 
            element={<PrivateRoute><Sources /></PrivateRoute>} 
          />
          <Route 
            path="/backlinks" 
            element={<PrivateRoute><Backlinks /></PrivateRoute>} 
          />
          <Route 
            path="/reports" 
            element={<PrivateRoute><Reports /></PrivateRoute>} 
          />
          <Route 
            path="/profile" 
            element={<PrivateRoute><Profile /></PrivateRoute>} 
          />
          <Route 
            path="/staff/dashboard" 
            element={<PrivateRoute><StaffDashboard /></PrivateRoute>} 
          />
          <Route 
            path="/staff/backlinks" 
            element={<PrivateRoute><StaffBacklinks /></PrivateRoute>} 
          />
          <Route 
            path="/staff/profile" 
            element={<PrivateRoute><StaffProfile /></PrivateRoute>} 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
