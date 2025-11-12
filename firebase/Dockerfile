ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js and npm
RUN apk add --no-cache \
    nodejs \
    npm \
    bash

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --production --no-audit --no-fund

# Copy application files
COPY . .

# Make run script executable
RUN chmod a+x /app/run.sh

# Expose port
EXPOSE 3000

CMD [ "./run.sh" ]