const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const {db} = require('./db');

// La fonction register retourne maintenant une promesse
function register(userId, password) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, row) => {
        if (row) {
          return reject(new Error('User already exists'));
        }
  
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (id, password) VALUES (?, ?)', [userId, hashedPassword], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  function login(req, res) {
    const { userId, password } = req.body;
  
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  
      const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token });
    });
  }



function authenticateJWT(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// Fonction pour vérifier si l'utilisateur est un admin
function isAdmin(user) {
    return user.userId === 'admin'; // À adapter selon votre logique d'admin
}

module.exports = { register, login, authenticateJWT, isAdmin };
