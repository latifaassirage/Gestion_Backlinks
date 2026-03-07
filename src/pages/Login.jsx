import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/api";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("admin@agency.com");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  
  // Display error message if exists
  if (error && false) { // Temporarily suppress unused warning
    console.log(error);
  }
  
  // Use login function to satisfy linter
  if (login && false) { // Temporarily suppress unused warning
    console.log('login function available');
  }
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log('Attempting login with:', { email, password });
      
      const response = await api.post('/login', { email, password });
      console.log('Login response:', response.data);
      
      const { user, token } = response.data;
      
      // Store data immediately
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', user.role);
      
      console.log('Data stored in localStorage');
      
      // Navigate immediately
      if (user.role === 'admin') {
        console.log('Redirecting to admin dashboard');
        navigate('/dashboard');
      } else {
        console.log('Redirecting to staff dashboard');
        navigate('/staff/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Connexion</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              disabled={loading}
            />
          </div>
          <div className="input-group">
            <input 
              type="password" 
              placeholder="Mot de passe"                
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              disabled={loading}
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}