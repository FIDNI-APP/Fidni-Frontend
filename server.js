import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// Default to production mode if not specified
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log(`Environment: ${NODE_ENV}`);
console.log(`Port: ${PORT}`);

// Compression middleware
app.use(compression());

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

// Catch all routes and return the index.html file
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});