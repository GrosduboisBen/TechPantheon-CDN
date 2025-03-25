const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const port = 3000;
const assetsPath = path.join(__dirname, "cdn-assets");

// Middleware pour servir les fichiers statiques
app.use(express.static(assetsPath));
app.use(express.json());

// Configuration de l'upload avec Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, assetsPath),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// 📂 **Lister les fichiers disponibles**
app.get("/files", (req, res) => {
  fs.readdir(assetsPath, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ files });
  });
});

// 📤 **Uploader un fichier**
app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ message: "Fichier uploadé avec succès", file: req.file.filename });
});

// 🗑️ **Supprimer un fichier**
app.delete("/files/:filename", (req, res) => {
  const filePath = path.join(assetsPath, req.params.filename);
  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Fichier supprimé" });
  });
});

app.listen(port, () => {
  console.log(`CDN en cours sur http://localhost:${port}`);
});
