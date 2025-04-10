# TechPantheon CDN Server

This project is a custom CDN server built with Node.js and Express. It provides functionalities for user authentication, file uploads, folder management, and file compression.

## Prerequisites

Ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (version 20 or higher)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TechPantheon-CDN/cdn-server
```

### 2. Install Dependencies
Navigate to the `app` directory and install the required dependencies:
```bash
cd app
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the `app` directory and add the following variables:
```
JWT_SECRET=your_secret_key
```

### 4. Run the Application

#### Option 1: Run Locally
Start the server locally:
```bash
node app/server.js
```
The server will run on `http://localhost:3000`.

#### Option 2: Run with Docker
Build and run the application using Docker:
```bash
docker-compose up --build
```
The server will be accessible on `http://localhost:3000`.

### 5. Run Tests
To run the test suite, execute:
```bash
npm test
```

## API Endpoints

### Authentication
- `POST /register`: Register a new user.
- `POST /login`: Log in and receive a JWT token.

### File and Folder Management
- `POST /create-subfolder/:id/*`: Create a subfolder.
- `POST /add/:id/*`: Add a file or folder.
- `GET /list/:id/*`: List files in a folder.
- `GET /download/:id/*`: Download a file.
- `DELETE /delete-folder/:id/*`: Delete a folder.
- `DELETE /delete-file/:id/*`: Delete a file.

## Notes
- Ensure the `cdn-assets` directory is writable by the application.
- Use the `.env` file to configure sensitive data like the JWT secret.
