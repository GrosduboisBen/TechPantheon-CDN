const request = require('supertest');
const app = require('./server');  // Assurez-vous que vous exportez `app` dans server.js

let server;

beforeAll((done) => {
  server = app.listen(3000, () => {
    console.log('Test server is running on port 3000');
    done();
  });
});

afterAll((done) => {
  server.close(() => {
    console.log('Test server closed');
    done();
  });
});

describe('Test routes', () => {
  // Test de l'enregistrement
  it('should register a user successfully', async () => {
    const response = await request(server)
      .post('/register')
      .send({ userId: 'testuser', password: 'testpassword' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User registered and folders created!');
  });

  // Test de la connexion
  it('should log in a user and return a token', async () => {
    await request(server)
      .post('/register')
      .send({ userId: 'testuser', password: 'testpassword' }); // Register first

    const response = await request(server)
      .post('/login')
      .send({ username: 'testuser', password: 'testpassword' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  // Test de la création de sous-dossier
  it('should create a subfolder for a user', async () => {
    const loginResponse = await request(server)
      .post('/login')
      .send({ username: 'testuser', password: 'testpassword' });

    const token = loginResponse.body.token;

    const response = await request(server)
      .post('/create-subfolder/testuser/testfolder')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Subfolder testfolder created in testuser.');
  });

  // Test de l'upload de fichier
  it('should upload a file for a user', async () => {
    const loginResponse = await request(server)
      .post('/login')
      .send({ username: 'testuser', password: 'testpassword' });

    const token = loginResponse.body.token;

    const response = await request(server)
      .post('/upload/testuser')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', 'path/to/your/file.txt');  // Remplacez 'path/to/your/file.txt' par un fichier valide

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('File file.txt uploaded in testuser.');
  });

  // Test de la liste des fichiers
  it('should list files in a user folder', async () => {
    const loginResponse = await request(server)
      .post('/login')
      .send({ username: 'testuser', password: 'testpassword' });

    const token = loginResponse.body.token;

    const response = await request(server)
      .get('/list/testuser')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.files).toBeDefined();
  });

  // Test du téléchargement de fichier
  it('should download a file for a user', async () => {
    const loginResponse = await request(server)
      .post('/login')
      .send({ username: 'testuser', password: 'testpassword' });

    const token = loginResponse.body.token;

    const response = await request(server)
      .get('/download/testuser/file.txt') // Assurez-vous que le fichier 'file.txt' existe
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/octet-stream');
  });

  // Test de la suppression d'un dossier
  it('should delete a user folder', async () => {
    const loginResponse = await request(server)
      .post('/login')
      .send({ username: 'testuser', password: 'testpassword' });

    const token = loginResponse.body.token;

    const response = await request(server)
      .delete('/delete-folder/testuser/assets') // Assurez-vous que ce dossier peut être supprimé
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Folder assets deleted.');
  });
});
