import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const role = localStorage.getItem("role");

  if (role !== "admin") {
    return <Navigate to="/clients" />;
  }

  return children;
}