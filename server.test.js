const request = require('supertest');
const { app, server } = require('./server'); // Assurez-vous que app est exporté ici

// Démarrer le serveur avant les tests
beforeAll(async () => {
  if (!server.listening) {
    await new Promise(resolve => {
      server.listen(3000, () => {
        resolve();
      });
    });
  }
});

// Fermer le serveur après les tests
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
    it('should log in a user and return a token', async () => {
        // Enregistrer d'abord l'utilisateur
        const registerResponse = await request(app) // 👈 Remplace `server` par `app`
            .post('/register')
            .send({ userId: 'testuser', password: 'testpassword' });
        
        // Vérifier que l'inscription a réussi
        expect(registerResponse.status).toBe(200);
    
        // Se connecter avec cet utilisateur
        const loginResponse = await request(app) // 👈 Utilise `app`
            .post('/login')
            .send({ username: 'testuser', password: 'testpassword' });
        
        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.token).toBeDefined();
    });

    it('should create a subfolder for a user', async () => {
        const loginResponse = await request(app)  // Utilisez 'app'
        .post('/login')
        .send({ username: 'testuser', password: 'testpassword' });

        const token = loginResponse.body.token;

        const response = await request(app)  // Utilisez 'app'
        .post('/create-subfolder/testuser/testfolder')
        .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Subfolder testfolder created in testuser.');
    });

    it('should upload a file for a user', async () => {
        const loginResponse = await request(app)  // Utilisez 'app'
        .post('/login')
        .send({ username: 'testuser', password: 'testpassword' });

        const token = loginResponse.body.token;

        const response = await request(app)  // Utilisez 'app'
        .post('/upload/testuser')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', './file.txt');  // Remplacez 'path/to/your/file.txt' par un fichier valide

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('File file.txt uploaded in testuser.');
    });

    it('should list files in a user folder', async () => {
        const loginResponse = await request(app)  // Utilisez 'app'
        .post('/login')
        .send({ username: 'testuser', password: 'testpassword' });

        const token = loginResponse.body.token;

        const response = await request(app)  // Utilisez 'app'
        .get('/list/testuser')
        .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.files).toBeDefined();
    });

    it('should download a file for a user', async () => {
        const loginResponse = await request(app)  // Utilisez 'app'
        .post('/login')
        .send({ username: 'testuser', password: 'testpassword' });

        const token = loginResponse.body.token;

        const response = await request(app)  // Utilisez 'app'
        .get('/download/testuser/file.txt') // Assurez-vous que le fichier 'file.txt' existe
        .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/(application\/octet-stream|text\/plain)/);
    });

    it('should delete a user folder', async () => {
        const loginResponse = await request(app)  // Utilisez 'app'
        .post('/login')
        .send({ username: 'testuser', password: 'testpassword' });

        const token = loginResponse.body.token;

        const response = await request(app)  // Utilisez 'app'
        .delete('/delete-folder/testuser/testfolder') // Assurez-vous que ce dossier peut être supprimé
        .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Folder testfolder deleted.');
    });
});