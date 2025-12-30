const fs = require('fs');
const os = require('os');
const path = require('path');

// --- CONFIGURATION ---
const ENV_VAR_NAME = 'EXPO_PUBLIC_GRAPHQL_URL';
const PORT = '3500';
const ENDPOINT = '/graphql';
const ENV_PATH = path.join(__dirname, '../.env'); 

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if ('IPv4' === iface.family && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const ip = getLocalIp();
const newValue = `http://${ip}:${PORT}${ENDPOINT}`;

try {
  let envContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  
  // Regex looks for the variable and captures the whole line
  const regex = new RegExp(`^${ENV_VAR_NAME}=.*`, 'm');

  if (regex.test(envContent)) {
    // Replace existing line
    envContent = envContent.replace(regex, `${ENV_VAR_NAME}=${newValue}`);
  } else {
    // Append new line if it doesn't exist
    const prefix = envContent.length > 0 && !envContent.endsWith('\n') ? '\n' : '';
    envContent += `${prefix}${ENV_VAR_NAME}=${newValue}`;
  }

  fs.writeFileSync(ENV_PATH, envContent);
  console.log(`Updated .env: ${ENV_VAR_NAME}=${newValue}`);
} catch (error) {
  console.error('Error updating .env:', error);
}