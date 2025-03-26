const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { register, login, authenticateJWT, users, isAdmin } = require('./auth');

const app = express();
const port = 3000;
const BASE_DIR = path.join(__dirname, 'cdn-assets');

app.use(express.json());

// Ensure base directory exists
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

// Automatically create protected folders for a new user
const createUserFolders = (userId) => {
  const userDir = path.join(BASE_DIR, userId);
  const defaultFolders = ["assets", "invoices", "misc", "resume"];

  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  defaultFolders.forEach(folder => {
    const folderPath = path.join(userDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
  });
};

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
app.post('/register', (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: "User ID and password are required" });
  }

  // First register the user using the register function from auth.js
  register(userId, password)
    .then(() => {
      // After successful registration, create default folders
      createUserFolders(userId);

      // Add the user to the system
      users[userId] = { allowedFolders: [userId] };

      res.json({ message: "User registered and folders created!" });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
});

app.post('/login', login);

// 📁 **Create a subfolder**
app.post('/create-subfolder/:id/:subFolder', authenticateJWT, (req, res) => {
  if (req.user.username !== req.params.id) {
    return res.status(403).json({ error: 'Unauthorized to create a subfolder here' });
  }

  const parentPath = path.join(BASE_DIR, req.params.id);
  const subFolderPath = path.join(parentPath, req.params.subFolder);
  if (!fs.existsSync(parentPath)) {
    return res.status(404).json({ error: 'Parent folder does not exist.' });
  }
  if (!fs.existsSync(subFolderPath)) {
    fs.mkdirSync(subFolderPath);
    return res.json({ message: `Subfolder ${req.params.subFolder} created in ${req.params.id}.` });
  }
  return res.status(400).json({ error: 'Subfolder already exists.' });
});

// 📤 **Upload a file**
app.post('/upload/:id', authenticateJWT, upload.single('file'), (req, res) => {
  if (req.user.username !== req.params.id) {
    return res.status(403).json({ error: 'Unauthorized to upload in this folder' });
  }
  res.json({ message: `File ${req.file.originalname} uploaded in ${req.params.id}.` });
});

// 📄 **List files**
app.get('/list/:id', authenticateJWT, (req, res) => {
  if (req.user.username !== req.params.id && !users[req.user.username].allowedFolders.includes(req.params.id)) {
    return res.status(403).json({ error: 'Unauthorized to list this folder' });
  }

  const folderPath = path.join(BASE_DIR, req.params.id);
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Folder not found' });
  }
  res.json({ files: fs.readdirSync(folderPath) });
});

// ⬇️ **Download a file**
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

// 🚮 **Delete a folder** (only for admins or user's own folders)
app.delete('/delete-folder/:id/:folder', authenticateJWT, (req, res) => {
  if (req.user.username !== req.params.id && !isAdmin(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to delete this folder' });
  }

  const folderPath = path.join(BASE_DIR, req.params.id, req.params.folder);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  // Protect default folders from deletion
  if (["assets", "invoices", "misc", "resume"].includes(req.params.folder) && !isAdmin(req.user)) {
    return res.status(403).json({ error: 'This folder is protected and cannot be deleted' });
  }

  fs.rmdirSync(folderPath, { recursive: true });
  res.json({ message: `Folder ${req.params.folder} deleted.` });
});

// 🚀 Start server
app.listen(port, () => {
  console.log(`🚀 Secure CDN running on port ${port}`);
});

module.exports = { app, server };  // Export app and server
