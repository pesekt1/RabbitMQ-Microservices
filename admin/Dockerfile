# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Expose port 8002 for the application
EXPOSE 8002

# Define the command to run the application
CMD [ "npm", "start" ]