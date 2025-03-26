const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const users = {}; // Stock temporaire des utilisateurs (remplace avec une DB)

function register(req, res) {
    const { username, password } = req.body;
    if (users[username]) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    users[username] = { password: hashedPassword, allowedFolders: [] };
    res.json({ message: 'User registered' });
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

module.exports = { register, login, authenticateJWT, users };
