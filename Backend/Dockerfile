# Use Node.js image
FROM node

# Set working directory inside the container
WORKDIR /home/app

# Copy package.json and package-lock.json from the Backend directory
COPY Backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the Backend folder
COPY Backend ./

# Run the app
CMD ["node", "index.js"]
