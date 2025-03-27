const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const express = require('express');
const router = express.Router();

const BASE_DIR = path.join('storage');
if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    console.log('Storage directory created.');
}

router.get('/:id/*', (req, res) => {
    const userDir = path.join(BASE_DIR, req.params.id);
    let requestedFile = path.join(userDir, req.params[0]); // Gère les sous-dossiers

    console.log(`🔍 Recherche du fichier : ${requestedFile}`);

    // Vérifier si le fichier compressé existe
    if (!fs.existsSync(requestedFile)) {
        requestedFile += '.gz'; // Ajoute l'extension .gz si absente
        console.log(`🔄 Tentative avec fichier compressé : ${requestedFile}`);
    }

    if (!fs.existsSync(requestedFile)) {
        console.error(`❌ Fichier introuvable : ${requestedFile}`);
        return res.status(404).json({ error: 'File not found', filePath: requestedFile });
    }

    console.log(`📤 Décompression et envoi du fichier : ${requestedFile}`);

    // Décompression du fichier (GZIP)
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(requestedFile, '.gz')}`);
    const compressedFile = fs.createReadStream(requestedFile);
    const unzip = zlib.createGunzip();

    compressedFile.pipe(unzip).pipe(res);
});

module.exports = router;
