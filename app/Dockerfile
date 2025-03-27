# Utilisation d'une image officielle Node.js
FROM node:20

# Définir le répertoire de travail dans le conteneur
WORKDIR ./workspace

COPY package*.json ./
# Installer les dépendances au moment du build
RUN npm install && npm list express

COPY . .
# Exposer le port utilisé par l'application
EXPOSE 3000

# Démarrer l'application
CMD ["node", "server.js"]
