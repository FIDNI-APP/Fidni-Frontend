import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get environment from command line arguments
const args = process.argv.slice(2);
const env = args[0] || 'development';

console.log(`Setting up environment: ${env}`);

// Path to environment file
const envPath = join(__dirname, env === 'production' ? '.env' : '.env.development');
const envTargetPath = join(__dirname, '.env.local');

// Check if source file exists
if (!fs.existsSync(envPath)) {
  console.error(`Environment file not found: ${envPath}`);
  process.exit(1);
}

// Copy the file
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  fs.writeFileSync(envTargetPath, envContent);
  console.log(`Environment set to ${env} successfully!`);
} catch (error) {
  console.error('Error setting environment:', error);
  process.exit(1);
}