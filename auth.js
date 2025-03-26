const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const users = {}; // Stock temporaire des utilisateurs (remplace avec une DB)

// La fonction register retourne maintenant une promesse
function register(userId, password) {
    return new Promise((resolve, reject) => {
        if (users[userId]) {
            reject(new Error('User already exists'));
        } else {
            const hashedPassword = bcrypt.hashSync(password, 10);
            users[userId] = { password: hashedPassword, allowedFolders: [] };
            resolve();
        }
    });
}

function login(req, res) {
    const { username, password } = req.body;
    const user = users[username];
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
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
    return user.username === 'admin'; // À adapter selon votre logique d'admin
}

module.exports = { register, login, authenticateJWT, users, isAdmin };
