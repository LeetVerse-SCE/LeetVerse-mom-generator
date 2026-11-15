const fs = require('fs');
const path = require('path');

// 1. Locate .env or .env.local
const envFiles = [
  path.join(__dirname, '.env.local'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', 'Leetverse-Official-Website', 'backend', '.env')
];

let envContent = '';
let loadedPath = '';

for (const f of envFiles) {
  if (fs.existsSync(f)) {
    envContent = fs.readFileSync(f, 'utf8');
    loadedPath = f;
    break;
  }
}

const env = {};
if (envContent) {
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });
  console.log(`[Config Generator] Loaded environment variables from: ${loadedPath}`);
} else {
  console.warn('[Config Generator] No .env file found. Using environment defaults.');
}

// 2. Build configuration object from environment
const config = {
  API_BASE: env.MOM_API_BASE || process.env.MOM_API_BASE || 'http://localhost:5000/mom',
  FIREBASE_CONFIG: {
    apiKey: env.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
    authDomain: env.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || `${env.FIREBASE_PROJECT_ID || 'leetverse-website'}.firebaseapp.com`,
    projectId: env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'leetverse-website',
    storageBucket: env.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || `${env.FIREBASE_PROJECT_ID || 'leetverse-website'}.appspot.com`,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || ''
  }
};

const output = `// ==============================================================================
// AUTO-GENERATED CLIENT CONFIGURATION (DO NOT EDIT MANUALLY)
// Generated from .env by generate-config.js at ${new Date().toISOString()}
// ==============================================================================

window.MOM_CONFIG = ${JSON.stringify(config, null, 2)};
`;

const configPath = path.join(__dirname, 'config.js');
fs.writeFileSync(configPath, output, 'utf8');
console.log(`[Config Generator] Successfully wrote config.js from .env! (Zero browser network calls)`);

