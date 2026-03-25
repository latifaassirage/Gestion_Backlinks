// Reset Password Page Component

// Debug: Vérifier si React est disponible
console.log('React disponible:', window.React);
console.log('ReactDOM disponible:', window.ReactDOM);
console.log('Configuration APP_CONFIG:', window.APP_CONFIG);

// Utiliser seulement React, pas besoin de Router
const { useState, useEffect } = React;

// Composant Login simple pour la page /login
function LoginPage() {
  const [email, setEmail] = useState('admin@agency.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/login', { email, password });
      console.log('Login successful:', response.data);
      
      // Rediriger vers le dashboard selon le rôle
      if (response.data.user.role === 'admin') {
        window.location.href = window.location.origin + '/dashboard';
      } else {
        window.location.href = window.location.origin + '/staff/dashboard';
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  
  return React.createElement('div', { className: 'login-container' },
    // Logo avec fallback SVG si favicon ne se charge pas
    React.createElement('div', { className: 'login-logo' },
      React.createElement('img', { 
        src: '/favicon.ico', 
        alt: 'Logo', 
        className: 'logo-image',
        onError: (e) => {
          console.error('Erreur de chargement du logo, utilisation du fallback SVG');
          // Utiliser le logo SVG intégré comme fallback
          const logoContent = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="8" fill="url(#gradient)"/>
            <path d="M24 12C18 12 12 18 12 24C12 30 18 36 24 36C30 36 36 30 36 24C36 18 30 12 24 12Z" stroke="white" stroke-width="2" fill="none"/>
            <path d="M20 24L22 26L28 20" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="48" y2="48">
                <stop stop-color="#ff7f50"/>
                <stop offset="1" stop-color="#e55a2b"/>
              </linearGradient>
            </defs>
          </svg>`;
          
          e.target.style.display = 'none';
          const parent = e.target.parentNode;
          if (!parent.querySelector('.logo-svg-fallback')) {
            const svgContainer = document.createElement('div');
            svgContainer.className = 'logo-svg-fallback';
            svgContainer.innerHTML = logoContent;
            svgContainer.style.cssText = `
              display: inline-block;
              width: 48px;
              height: 48px;
            `;
            parent.appendChild(svgContainer);
          }
        },
        onLoad: () => {
          console.log('Logo favicon chargé avec succès');
        }
      })
    ),
    
    React.createElement('div', { className: 'login-box' },
      React.createElement('h2', null, 'Login'),
      
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'input-group' },
          React.createElement('input', {
            type: 'email',
            placeholder: 'Email Address',
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true,
            disabled: loading
          })
        ),
        
        React.createElement('div', { className: 'input-group' },
          React.createElement('input', {
            type: 'password',
            placeholder: 'Password',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            required: true,
            disabled: loading
          })
        ),
        
        error && React.createElement('div', { className: 'error-message' }, error),
        
        React.createElement('button', {
          type: 'submit',
          className: 'login-btn',
          disabled: loading
        }, loading ? 'Logging in...' : 'Sign In'),
        
        // Lien "Forgot password?" comme dans votre vraie page
        React.createElement('div', { className: 'reset-password-link' },
          React.createElement('a', {
            href: '#',
            className: 'reset-password-btn',
            onClick: (e) => {
              e.preventDefault();
              window.location.href = window.location.origin + '/password/reset';
            }
          }, 'Forgot password?')
        )
      )
    )
  );
}

function ResetPassword() {
  // Récupérer le token de manière intelligente avec double vérification
  const pathname = window.location.pathname;
  const search = window.location.search;
  
  console.log('ResetPassword - pathname:', pathname);
  console.log('ResetPassword - search:', search);
  
  let token = pathname.split('/').pop(); // Check 1: fin de l'URL
  console.log('Token depuis pathname:', token);
  
  // Check 2 (Secours) : si le token est invalide, regarder dans les query params
  if (!token || token === 'login' || token === 'reset' || token.length < 20) {
    console.log('Check 1 échoué, essai Check 2 avec query params');
    const urlParams = new URLSearchParams(search);
    token = urlParams.get('token');
    console.log('Token depuis query params:', token);
  } else {
    console.log('Check 1 réussi avec token depuis pathname');
  }
  
  console.log('Token final utilisé:', token);
  console.log('URL complète:', window.location.href);
  
  // Valider que le token est long et valide
  const isValidToken = token && 
    token !== 'undefined' && 
    token !== 'null' && 
    token !== 'reset' && 
    token !== 'login' && // Ajout explicite pour rejeter 'login'
    token.length >= 20; // Au moins 20 caractères
  
  if (!isValidToken) {
    console.error('Token invalide:', token);
  }
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(''); // Ajout du champ email
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Vérifier si le token est valide (une seule fois au montage)
    if (!isValidToken) {
      setError('Invalid or missing reset token. Please check your email link and try again.');
      console.error('Token invalide ou manquant:', token);
    } else {
      console.log('Token valide trouvé:', token);
    }
  }, [isValidToken, token]); // Dépendances pour la validation

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation du token avant la soumission
    if (!isValidToken) {
      setError('Invalid reset token. Please request a new password reset link.');
      return;
    }
    
    // Validation de l'email
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    
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
      const response = await axios.post('/api/reset-password', {
        token: token,
        email: email,
        password: newPassword,
        password_confirmation: confirmPassword
      });

      setMessage('✅ Password has been reset successfully! Redirecting to login...');
      
      // Rediriger vers la page de login après 3 secondes
      setTimeout(() => {
        console.log('Redirection automatique vers page principale...');
        window.location.href = window.location.origin + '/';
      }, 3000);

    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return React.createElement('div', { className: 'login-container' },
    React.createElement('div', { className: 'login-box' },
      React.createElement('h2', null, 'Reset Password'),
      
      token ? (
        React.createElement('form', { onSubmit: handleSubmit },
          React.createElement('div', { className: 'input-group' },
            React.createElement('input', {
              type: 'email',
              placeholder: 'Email Address',
              value: email,
              onChange: (e) => setEmail(e.target.value),
              required: true,
              disabled: loading
            })
          ),
          React.createElement('div', { className: 'input-group' },
            React.createElement('input', {
              type: 'password',
              placeholder: 'New Password',
              value: newPassword,
              onChange: (e) => setNewPassword(e.target.value),
              required: true,
              disabled: loading,
              minLength: '8'
            })
          ),
          React.createElement('div', { className: 'input-group' },
            React.createElement('input', {
              type: 'password',
              placeholder: 'Confirm New Password',
              value: confirmPassword,
              onChange: (e) => setConfirmPassword(e.target.value),
              required: true,
              disabled: loading,
              minLength: '8'
            })
          ),
          
          error && React.createElement('div', { className: 'error-message' }, error),
          message && React.createElement('div', { className: 'success-message' }, message),
          
          React.createElement('button', {
            type: 'submit',
            className: 'login-btn',
            disabled: loading
          }, loading ? 'Resetting...' : 'Reset Password'),
          
          React.createElement('div', { className: 'reset-password-link' },
            React.createElement('a', {
              href: window.location.origin + '/',
              className: 'reset-password-btn',
              onClick: (e) => {
                console.log('Clic sur Back to Login - redirection vers page principale');
                // Pas de preventDefault() pour permettre la redirection naturelle
              }
            }, 'Back to Login')
          )
        )
      ) : (
        React.createElement('div', { className: 'error-container' },
          React.createElement('p', null, 'Invalid or missing reset token.'),
          React.createElement('a', {
            href: window.location.origin + '/',
            className: 'reset-password-btn',
            onClick: (e) => {
              console.log('Clic sur Back to Login (erreur token) - redirection vers page principale');
              // Pas de preventDefault() pour permettre la redirection naturelle
            }
          }, 'Back to Login')
        )
      )
    )
  );
}

// Rendu direct du composant selon la page
function App() {
  const pathname = window.location.pathname;
  const isResetPasswordPage = pathname.includes('/password/reset');
  const isRootPage = pathname === '/' || pathname === '';
  
  console.log('App render - pathname:', pathname);
  console.log('isRootPage:', isRootPage);
  console.log('isResetPasswordPage:', isResetPasswordPage);
  
  if (isResetPasswordPage) {
    console.log('Render ResetPassword component');
    return React.createElement(ResetPassword);
  } else if (isRootPage) {
    console.log('Render LoginPage component (page principale)');
    return React.createElement(LoginPage);
  } else {
    // Pour toutes les autres pages, afficher aussi LoginPage (fallback)
    console.log('Render LoginPage component (fallback)');
    return React.createElement(LoginPage);
  }
}

// Render component
console.log('Tentative de render...');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
console.log('Render terminé avec succès');
