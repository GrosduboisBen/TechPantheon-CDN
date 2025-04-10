# Using an official Node.js image
FROM node:20

# Set the working directory in the container
WORKDIR ./workspace

COPY package*.json ./
# Install dependencies during the build
RUN npm install && npm list express

COPY . .
# Expose the port used by the application
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
