const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const router = express.Router();

const BASE_DIR = path.join('storage');
if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    console.log('Storage directory created.');
}

// Configuration de multer pour le stockage temporaire
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = path.join(BASE_DIR, req.params.id);
        if (!fs.existsSync(folder)) {
            return cb(new Error('The specified folder does not exist.'));
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const compressedFileName = `${file.originalname}.gz`;
        cb(null, compressedFileName);
    }
});

const upload = multer({ storage });

router.post('/create-folder/:userId/:folderName', (req, res) => {
    const { userId, folderName } = req.params;
    const userFolderPath = path.join(BASE_DIR, userId, folderName);

    // Vérifier si le dossier existe déjà
    if (fs.existsSync(userFolderPath)) {
        return res.status(400).json({ error: 'Folder already exists.' });
    }

    // Créer le dossier
    fs.mkdirSync(userFolderPath, { recursive: true });

    return res.status(200).json({ message: `Folder '${folderName}' created successfully.` });
});

// Fonction pour supprimer un dossier
router.delete('/delete-folder/:userId/:folderName', (req, res) => {
    const { userId, folderName } = req.params;
    const userFolderPath = path.join(BASE_DIR, userId, folderName);

    // Vérifier si le dossier existe
    if (!fs.existsSync(userFolderPath)) {
        return res.status(404).json({ error: 'The specified folder does not exist.' });
    }

    // Supprimer le dossier
    fs.rmdirSync(userFolderPath, { recursive: true });

    return res.status(200).json({ message: `Folder '${folderName}' deleted successfully.` });
});

router.post('/:id', upload.single('file'), (req, res) => {
    if (!req.file) {
        console.error("❌ Aucun fichier reçu !");
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const userDir = path.join(BASE_DIR, req.params.id);

    // Vérifier et créer le dossier utilisateur si inexistant
    if (!fs.existsSync(userDir)) {
        console.log(`📁 Dossier ${userDir} manquant. Création en cours...`);
        fs.mkdirSync(userDir, { recursive: true });
    }

    const { name } = path.parse(req.file.originalname); // Récupère le nom sans extension
    const compressedFilePath = path.join(userDir, `${name}.gz`);

    console.log(`📝 Compression de ${req.file.originalname} -> ${compressedFilePath}`);

    const fileContents = fs.createReadStream(req.file.path);
    const writeStream = fs.createWriteStream(compressedFilePath);
    const gzip = zlib.createGzip();

    fileContents.pipe(gzip).pipe(writeStream);

    writeStream.on('finish', () => {
        console.log(`✅ Fichier compressé et sauvegardé : ${compressedFilePath}`);
        fs.unlinkSync(req.file.path); // Supprime le fichier temporaire
        res.json({
            message: `File ${req.file.originalname} uploaded and compressed.`,
            storedAs: path.basename(compressedFilePath)
        });
    });

    writeStream.on('error', (err) => {
        console.error('❌ Erreur lors de la compression :', err);
        res.status(500).json({ error: 'Error compressing file' });
    });
});


module.exports = router;
