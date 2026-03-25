import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import "./Login.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || window.location.pathname.split('/').pop() || '';
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Vérifier si le token est présent
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/reset-password', {
        token: token,
        password: newPassword,
        password_confirmation: confirmPassword
      });

      setMessage('✅ Password has been reset successfully! Redirecting to login...');
      
      // Rediriger vers la page de login après 3 secondes
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-logo">
        <img src="/favicon.ico" alt="Logo" className="logo-image" />
      </div>
      <div className="login-box">
        <h2>Reset Password</h2>
        
        {token ? (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="New Password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)} 
                required 
                disabled={loading}
                minLength="8"
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Confirm New Password"                
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
                disabled={loading}
                minLength="8"
              />
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            {message && (
              <div className="success-message">
                {message}
              </div>
            )}
            
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            
            <div className="reset-password-link">
              <a 
                href="#" 
                className="reset-password-btn"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
              >
                Back to Login
              </a>
            </div>
          </form>
        ) : (
          <div className="error-container">
            <p>Invalid or missing reset token.</p>
            <a 
              href="#" 
              className="reset-password-btn"
              onClick={(e) => {
                e.preventDefault();
                navigate('/login');
              }}
            >
              Back to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
