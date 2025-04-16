const express = require('express');
const axios = require('axios');
const cors = require('cors');

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { register, login, authenticateJWT, users, isAdmin } = require('./auth');
const zlib = require('zlib');
const mime = require('mime-types');


const app = express();
const BASE_DIR = path.join(__dirname, 'cdn-assets');

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true // si tu utilises des cookies ou des headers d'auth
}));
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
      res.json({ message: "User registered and folders created!" });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
});

app.post('/login', login);

// 📁 **Create a subfolder**
app.post('/create-subfolder/:id/*', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const parentFolderPath = path.join(BASE_DIR, id, req.params[0]);  // Use the * parameter to get the parent folder path

  if (req.user.userId !== id) {
    return res.status(403).json({ error: 'Unauthorized to create a subfolder here' });
  }

  if (!fs.existsSync(parentFolderPath)) {
    fs.mkdirSync(parentFolderPath);
    return res.status(200).json({ message: `Subfolder ${req.body.subFolderName} created inside ${BASE_DIR}.` });
  }

  const subFolderPath = path.join(parentFolderPath, req.body.subFolderName);

  // Create the subfolder if necessary
  if (!fs.existsSync(subFolderPath)) {
    fs.mkdirSync(subFolderPath);
    return res.status(200).json({ message: `Subfolder ${req.body.subFolderName} created inside ${req.params[0]}.` });
  } else {
    return res.status(400).json({ error: 'Subfolder already exists.' });
  }
});

app.post('/add/:id/*', authenticateJWT, upload.single('file'), (req, res) => {
  const { id } = req.params;
  const relativePath = req.params[0] || ''; // Capture the path after /add/:id/ (or empty if not provided)
  const folderPath = path.join(BASE_DIR, id, relativePath); // Ensure everything starts in the user's folder

  
  if (req.user.userId !== id || !allowed.includes(id)) {
    return res.status(403).json({ error: 'Unauthorized to modify this folder' });
  }

  // Check if the target folder exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true }); // ✅ Create all missing subfolders
  }

  if (req.file) {
    // Case: A file is sent -> Add it to the folder
    const filePath = path.join(folderPath, `${req.file.originalname}.gz`);
    console.log(`📝 Compressing ${req.file.originalname} -> ${filePath}`);

    const fileContents = fs.createReadStream(req.file.path);
    const writeStream = fs.createWriteStream(filePath);
    const gzip = zlib.createGzip();

    fileContents.pipe(gzip).pipe(writeStream);

    writeStream.on('finish', () => {
        console.log(`✅ File compressed and saved: ${filePath}`);
        fs.unlinkSync(req.file.path); // Delete the temporary file
        res.json({
            message: `File ${req.file.originalname} uploaded and compressed.`,
            storedAs: path.basename(filePath)
        });
    });

    writeStream.on('error', (err) => {
        console.error('❌ Error during compression:', err);
        res.status(500).json({ error: 'Error compressing file' });
    });
  } else {
      return res.status(400).json({ error: 'File is needed' });
  }
});




// 📤 **Upload a file**
app.post('/upload/:id', authenticateJWT, upload.single('file'), (req, res) => {
  if (req.user.userId !== req.params.id) {
    return res.status(403).json({ error: 'Unauthorized to upload in this folder' });
  }
  res.json({ message: `File ${req.file.originalname} uploaded in ${req.params.id}.` });
});

// 📄 **List files**
app.get('/list/:id/*', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const folderPath = path.join(BASE_DIR, id, req.params[0]);  // Use the * parameter to get the full path
  const allowed = getAllowedFolders(req.user.userId);

  if (req.user.userId !== id || !allowed.includes(id)) {
    return res.status(403).json({ error: 'Unauthorized to list this folder' });
  }

  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const files = fs.readdirSync(folderPath);
  res.json({ files });
});

// ⬇️ **Download a file**
app.get('/download/:id/*', authenticateJWT, (req, res) => {
  const { id } = req.params;
  let filePath = path.join(BASE_DIR, id, req.params[0]);  // Use the * parameter to get the full path
  const allowed = getAllowedFolders(req.user.userId);

  if (req.user.userId !== id || !allowed.includes(id)) {
    return res.status(403).json({ error: 'Unauthorized to download this file' });
  }

  console.log(`🔍 Searching for the file: ${filePath}`);

    // Check if the compressed file exists
    if (!fs.existsSync(filePath)) {
        filePath += '.gz'; // Add the .gz extension if absent
        console.log(`🔄 Attempting with compressed file: ${filePath}`);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return res.status(404).json({ error: 'File not found', filePath: filePath });
    }
    const originalFileName = path.basename(filePath, '.gz');
    console.log(`📤 Decompressing and sending the file: ${filePath}`);
    const mimeType = mime.lookup(originalFileName) || 'application/octet-stream';

    // Decompress the file (GZIP)
    res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
    res.setHeader('Content-Type', mimeType);
    const compressedFile = fs.createReadStream(filePath);
    const unzip = zlib.createGunzip();

    compressedFile.pipe(unzip).pipe(res);

});

// 🚮 **Delete a folder** (only for admins or user's own folders)
app.delete('/delete-folder/:id/*', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const folderPath = path.join(BASE_DIR, id, req.params[0]);  // Use the * parameter to get the full path

  if (req.user.userId !== id && !isAdmin(req.user)) {
    return res.status(403).json({ error: 'Unauthorized to delete this folder' });
  }

  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  // Delete the folder, including its contents
  try {
    fs.rmdirSync(folderPath, { recursive: true });
    return res.status(200).json({ message: `Folder ${path.basename(folderPath)} deleted.` });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Route to delete a file in a specific folder
app.delete('/delete-file/:id/*', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const filePath = path.join(BASE_DIR, id, req.params[0]); // Use the * parameter to get the full path

  // Check if the user has access to the folder const allowed = getAllowedFolders(req.user.userId);

  if (req.user.userId !== id || !allowed.includes(id)) {
    return res.status(403).json({ error: 'Unauthorized to delete this file' });
  }

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Delete the file
  try {
    fs.unlinkSync(filePath);
    return res.status(200).json({ message: `File ${path.basename(filePath)} deleted.` });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete file' });
  }
});


// 🚀 Start server
const server = app.listen(3000, () => {
  console.log('🚀 Secure CDN running on port 3000');
});

// app.listen(port, () => {
//   console.log(`🚀 Secure CDN running on port ${port}`);
// });

module.exports = { app, server };
