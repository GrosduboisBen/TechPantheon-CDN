const express = require('express');
const app = express();
const port = 3000;

// Middleware de base pour gérer les requêtes
app.use(express.static('./cdn-assets'));
app.listen(port, () => {
  console.log(`Serveur CDN Node.js en cours d'exécution sur le port ${port}`);
});
