ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Make run script executable
RUN chmod a+x /app/run.sh

# Expose port
EXPOSE 3000

CMD [ "./run.sh" ]