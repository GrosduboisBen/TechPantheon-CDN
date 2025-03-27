const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const downloadRouter = require('./handlers/download');
const uploadRouter = require('./handlers/upload');

const app = express();

// Middleware pour parser les JSON
app.use(bodyParser.json());

// Routes pour le téléchargement et l'upload
app.use('/download', downloadRouter);
app.use('/upload', uploadRouter);

// Configuration du port
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
