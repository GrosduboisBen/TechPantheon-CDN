const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, server } = require('./server');
const { users, register } = require('./auth');

const BASE_DIR = path.join(__dirname, 'cdn-assets');

beforeAll(async () => {
  if (!server.listening) {
    await new Promise(resolve => server.listen(3000, () => resolve()));
  }

  await register('testuser', 'testpassword');
  users['testuser'].allowedFolders.push('testuser');

  // Create the base folder
  const userDir = path.join(BASE_DIR, 'testuser', 'assets');
  fs.mkdirSync(userDir, { recursive: true });

  // Create a test file
  fs.writeFileSync(path.join(userDir, 'file.txt'), 'Hello World');
});

afterAll((done) => {
  if (server.listening) {
    server.close(() => done());
  } else {
    done();
  }
});

describe('Test CDN Express API', () => {
  let token;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/login')
      .send({ userId: 'testuser', password: 'testpassword' });

    token = loginResponse.body.token;
  });

  it('should create a subfolder inside an existing folder', async () => {
    const response = await request(app)
      .post('/create-subfolder/testuser/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subFolderName: 'newSubFolder' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Subfolder newSubFolder created inside assets.');

    const folderPath = path.join(BASE_DIR, 'testuser', 'assets', 'newSubFolder');
    expect(fs.existsSync(folderPath)).toBe(true);
  });

  it('should return 400 if subfolder already exists', async () => {
    const response = await request(app)
      .post('/create-subfolder/testuser/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subFolderName: 'newSubFolder' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Subfolder already exists.');
  });

  it('should add a file to an existing folder', async () => {
    const response = await request(app)
      .post('/add/testuser/assets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('New file content'), 'newfile.txt');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('File newfile.txt added to assets.');

    const filePath = path.join(BASE_DIR, 'testuser', 'assets', 'newfile.txt');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('should create a new folder inside an existing folder', async () => {
    const response = await request(app)
      .post('/add/testuser/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ folderName: 'newFolder' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Folder newFolder created inside assets.');

    const folderPath = path.join(BASE_DIR, 'testuser', 'assets', 'newFolder');
    expect(fs.existsSync(folderPath)).toBe(true);
  });

  it('should return 400 if folder already exists', async () => {
    const response = await request(app)
      .post('/add/testuser/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ folderName: 'newFolder' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Folder already exists.');
  });

  it('should return 403 if user is not authorized to add a file/folder', async () => {
    const response = await request(app)
      .post('/add/anotheruser/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ folderName: 'unauthorizedFolder' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Unauthorized to modify this folder');
  });

  it('should delete a subfolder', async () => {
    const response = await request(app)
      .delete('/delete-folder/testuser/assets/newFolder')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Folder newFolder deleted.');

    const folderPath = path.join(BASE_DIR, 'testuser', 'assets', 'newFolder');
    expect(fs.existsSync(folderPath)).toBe(false);
  });

  it('should delete a file inside a nested subfolder', async () => {
    const folderPath = path.join(BASE_DIR, 'testuser', 'assets', 'pictures', '2025');
    const filePath = path.join(folderPath, 'testfile.txt');

    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(filePath, 'This is a test file.');

    const response = await request(app)
      .delete('/delete-file/testuser/assets/pictures/2025/testfile.txt')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('File testfile.txt deleted.');
    expect(fs.existsSync(filePath)).toBe(false);
    expect(fs.existsSync(folderPath)).toBe(true);
  });
});
