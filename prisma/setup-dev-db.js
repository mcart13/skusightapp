/**
 * This script sets up the development database
 * Run with: node prisma/setup-dev-db.js
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make sure we're using the development environment
process.env.NODE_ENV = 'development';

// Check if migrations directory exists, create if not
const migrationsDir = path.join(__dirname, 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
  console.log('Created migrations directory');
}

// Function to run a command and log output
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command}`);
    
    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
    
    // Stream the output for better visibility
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
}

async function main() {
  try {
    console.log('Setting up development database...');
    
    // Generate Prisma client
    await runCommand('npx prisma generate');
    
    // Reset the development database (drop and recreate)
    await runCommand('npx prisma migrate reset --force');
    
    // Create initial migration
    await runCommand('npx prisma migrate dev --name init');
    
    console.log('Development database setup complete!');
  } catch (error) {
    console.error('Failed to set up development database:', error);
    process.exit(1);
  }
}

main(); 