const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, server } = require('./server'); // Assurez-vous que app est bien exporté
const { users, register } = require('./auth');

const BASE_DIR = path.join(__dirname, 'cdn-assets');

beforeAll(async () => {
  // Démarrer le serveur si ce n'est pas déjà fait
  if (!server.listening) {
    await new Promise(resolve => {
      server.listen(3000, () => resolve());
    });
  }

  // Créer un utilisateur de test
  await register('testuser', 'testpassword');
  users['testuser'].allowedFolders.push('testuser'); // Ajoute les permissions

  // Créer le dossier de base pour les tests
  const userDir = path.join(BASE_DIR, 'testuser', 'assets');
  fs.mkdirSync(userDir, { recursive: true });

  // Créer un fichier de test
  fs.writeFileSync(path.join(userDir, 'file.txt'), 'Hello World');
});

afterAll((done) => {
  if (server.listening) {
    server.close(() => {
      done();
    });
  } else {
    done();
  }
});

describe('Test routes', () => {
    let token;

    beforeAll(async () => {
        // Récupérer un token d'authentification
        const loginResponse = await request(app)
            .post('/login')
            .send({ username: 'testuser', password: 'testpassword' });

        token = loginResponse.body.token;
    });

    it('should create a subfolder for a user', async () => {
      const response = await request(app)
          .post('/create-subfolder/testuser/assets') // Maintenant, utiliser le chemin relatif
          .set('Authorization', `Bearer ${token}`)
          .send({ subFolderName: 'testfolder' });
  
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Subfolder testfolder created inside assets.');
    });

    it('should upload a file for a user', async () => {
        const response = await request(app)
            .post('/upload/testuser')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from('Hello World'), 'file.txt');

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('File file.txt uploaded in testuser.');
    });

    it('should list files in a user folder', async () => {
      const response = await request(app)
          .get('/list/testuser/assets') // Chemin relatif pour la liste des fichiers
          .set('Authorization', `Bearer ${token}`);
  
      expect(response.status).toBe(200);
      expect(response.body.files).toBeDefined();
    });

    it('should download a file for a user', async () => {
      const response = await request(app)
          .get('/download/testuser/assets/file.txt')  // Chemin dynamique vers le fichier
          .set('Authorization', `Bearer ${token}`);
  
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/(application\/octet-stream|text\/plain)/);
    });

    it('should delete a user folder', async () => {
      const response = await request(app)
          .delete('/delete-folder/testuser/assets/testfolder') // Chemin relatif pour supprimer le dossier
          .set('Authorization', `Bearer ${token}`);
  
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Folder testfolder deleted.');
    });

    // ✅ **TESTS DE LA NOUVELLE ROUTE `/add/:id/:folder`**
    it('should add a subfolder inside an existing folder', async () => {
      const response = await request(app)
          .post('/create-subfolder/testuser/assets')  // Chemin relatif
          .set('Authorization', `Bearer ${token}`)
          .send({ subFolderName: 'newSubFolder' });
  
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Subfolder newSubFolder created inside assets.');
  
      // Vérification que le dossier existe
      const folderPath = path.join(BASE_DIR, 'testuser', 'assets', 'newSubFolder');
      expect(fs.existsSync(folderPath)).toBe(true);
  
    });

    it('should return 400 if subfolder already exists', async () => {
      const response = await request(app)
          .post('/create-subfolder/testuser/assets')  // Chemin relatif
          .set('Authorization', `Bearer ${token}`)
          .send({ subFolderName: 'newSubFolder' });
  
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Subfolder already exists.');
      
      // // Optionnel : suppression du sous-dossier après test
      await request(app)
        .delete('/delete-folder/testuser/assets/newSubFolder')
        .set('Authorization', `Bearer ${token}`);
    });

    it('should return 404 if target folder does not exist', async () => {
      const response = await request(app)
          .post('/add/testuser/nonExistingFolder') // Chemin vers un dossier inexistant
          .set('Authorization', `Bearer ${token}`)
          .send({ folderName: 'shouldNotWork' });
  
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Target folder does not exist.');
    });

    it('should add a file to an existing folder', async () => {
      const response = await request(app)
          .post('/add/testuser/assets') // Route modifiée pour ajouter un fichier
          .set('Authorization', `Bearer ${token}`)
          .attach('file', Buffer.from('New file content'), 'newfile.txt');
  
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('File newfile.txt added to assets.');
  
      // Vérification que le fichier a bien été créé
      const filePath = path.join(BASE_DIR, 'testuser', 'assets', 'newfile.txt');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should delete a file in a nested subfolder for a user', async () => {
      const folderPath = path.join(__dirname, 'cdn-assets', 'testuser', 'assets', 'pictures', '2025');
      const filePath = path.join(folderPath, 'testfile.txt');
      
      // Créer les dossiers nécessaires
      fs.mkdirSync(folderPath, { recursive: true });
      
      // Ajouter un fichier temporaire
      fs.writeFileSync(filePath, 'This is a test file.');
  
      // Suppression du fichier via la route modifiée
      const response = await request(app)
          .delete('/delete-file/testuser/assets/pictures/2025/testfile.txt')  // Spécification de l'arborescence
          .set('Authorization', `Bearer ${token}`);
  
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('File testfile.txt deleted.');
  
      // Vérification que le fichier a bien été supprimé
      expect(fs.existsSync(filePath)).toBe(false);
  
      // Vérifier que le dossier 'pictures' et son contenu existent toujours
      expect(fs.existsSync(folderPath)).toBe(true);
    });

    it('should return 403 if user is not authorized', async () => {
      const response = await request(app)
          .post('/add/anotheruser/assets')  // Utilisation d'un autre utilisateur
          .set('Authorization', `Bearer ${token}`)
          .send({ folderName: 'unauthorizedFolder' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized to modify this folder');
    });
});
