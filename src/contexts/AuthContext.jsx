import { createContext, useContext } from "react";
import api from "../api/api-simple";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email, password });
      const res = await api.post("/login", { email, password });
      console.log('Login response:', res.data);
      
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("role", res.data.user.role || 'user');
        return true;
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
  };

  const value = { login, logout };
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
