# Use Node.js Alpine image directly
FROM node:18-alpine

# Install bash and other required packages
RUN apk add --no-cache bash curl ca-certificates

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