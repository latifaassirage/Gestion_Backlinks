// Simple test pour vérifier que la route fonctionne
console.log('Route password.reset fonctionne!');

// Créer un élément simple pour tester
const root = document.getElementById('root');
root.innerHTML = `
    <div style="text-align: center; padding: 50px; font-family: Arial;">
        <h1 style="color: #ff7f50;">Reset Password Page</h1>
        <p>Token: ${window.location.pathname.split('/').pop()}</p>
        <p>Route: password.reset</p>
        <a href="/" style="color: #ff7f50;">Retour à l'accueil</a>
    </div>
`;
