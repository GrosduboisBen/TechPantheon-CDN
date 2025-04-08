const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'users-data', 'users.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à SQLite :', err);
  } else {
    console.log('✅ Base SQLite connectée');
  }
});

// Crée la table si elle n'existe pas
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL
  )
`);
/** 
 * @description Get all allowed folders for a given users id
 * @returns {string[]} List of allowed folders ids
 * @param {string} userId - The user id
 */
function getAllowedFolders(userId) {
    return [userId]; // Default logic: user can access their own folder
  }

module.exports = {db,getAllowedFolders};
