const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { register, login, authenticateJWT, users } = require('./auth');

const app = express();
const port = 3000;
const BASE_DIR = path.join(__dirname, 'cdn-assets');

app.use(express.json());

// Ensure base directory exists
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = path.join(BASE_DIR, req.params.id);
    if (!fs.existsSync(folder)) {
      return cb(new Error('The specified folder does not exist.'));
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// 🔐 **User registration and login**
app.post('/register', register);
app.post('/login', login);

// 📁 **Create a folder (User can only create their own)**
app.post('/create-folder/:id', authenticateJWT, (req, res) => {
  if (req.user.username !== req.params.id) {
    return res.status(403).json({ error: 'Unauthorized to create this folder' });
  }

  const folderPath = path.join(BASE_DIR, req.params.id);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    users[req.user.username].allowedFolders.push(req.params.id);
    return res.json({ message: `Folder ${req.params.id} created.` });
  }
  return res.status(400).json({ error: 'Folder already exists' });
});

// 📤 **Upload a file (User can only upload in their folder)**
app.post('/upload/:id', authenticateJWT, upload.single('file'), (req, res) => {
  if (req.user.username !== req.params.id) {
    return res.status(403).json({ error: 'Unauthorized to upload in this folder' });
  }
  res.json({ message: `File ${req.file.originalname} uploaded in ${req.params.id}.` });
});

// 📄 **List files (User can list their folder or allowed ones)**
app.get('/list/:id', authenticateJWT, (req, res) => {
  if (req.user.username !== req.params.id && !users[req.user.username].allowedFolders.includes(req.params.id)) {
    return res.status(403).json({ error: 'Unauthorized to list this folder' });
  }

  const folderPath = path.join(BASE_DIR, req.params.id);
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const files = fs.readdirSync(folderPath);
  res.json({ files });
});

// ⬇️ **Download a file (User can download from their folder or allowed ones)**
app.get('/download/:id/:filename', authenticateJWT, (req, res) => {
  if (req.user.username !== req.params.id && !users[req.user.username].allowedFolders.includes(req.params.id)) {
    return res.status(403).json({ error: 'Unauthorized to download this file' });
  }

  const filePath = path.join(BASE_DIR, req.params.id, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath);
});

// 🚀 Start server
app.listen(port, () => {
  console.log(`🚀 Secure CDN running on port ${port}`);
});
