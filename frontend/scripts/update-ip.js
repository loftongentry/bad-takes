// Writes this PC's LAN address into frontend/.env so the app (on a phone, emulator or browser)
// can reach the backend. Runs automatically before `npm run dev`.
//
// Picks the address in this order:
//   1. DEV_HOST_IP, if set (e.g. `DEV_HOST_IP=192.168.1.50 npm run dev`)
//   2. The address the OS routes outbound traffic through, unless that's a virtual/VPN adapter
//   3. The best real-looking adapter: virtual ones (WSL/Hyper-V, Docker, VirtualBox, VMware,
//      VPNs) are skipped and home/office ranges (192.168.x, 10.x, 172.16-31.x) preferred
const dgram = require('dgram');
const fs = require('fs');
const os = require('os');
const path = require('path');

// --- CONFIGURATION ---
const ENV_VAR_NAME = 'EXPO_PUBLIC_GRAPHQL_URL';
const PORT = '3500';
const ENDPOINT = '/graphql';
const ENV_PATH = path.join(__dirname, '../.env');

const VIRTUAL_ADAPTER = /vethernet|wsl|hyper-v|docker|virtualbox|vbox|vmware|loopback|tailscale|zerotier|vpn|utun|tun\d|tap\d|br-|veth|virbr/i;

function lanCandidates(interfaces) {
  const candidates = [];
  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const iface of addresses || []) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        candidates.push({ name, address: iface.address, virtual: VIRTUAL_ADAPTER.test(name) });
      }
    }
  }
  return candidates;
}

// Lower is better
function rank(address) {
  if (address.startsWith('192.168.')) return 0;
  if (address.startsWith('10.')) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 2;
  return 3;
}

// Best real-looking adapter, or null
function pickByHeuristic(interfaces) {
  const real = lanCandidates(interfaces).filter((c) => !c.virtual);
  real.sort((a, b) => rank(a.address) - rank(b.address));
  return real[0]?.address ?? null;
}

// Asks the OS which local address it would use to reach the internet. Connecting a UDP socket
// only consults the routing table; no packet is sent.
function getRoutedIp() {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    const done = (address) => {
      try { socket.close(); } catch {}
      resolve(address);
    };
    socket.on('error', () => done(null));
    socket.connect(53, '8.8.8.8', () => done(socket.address().address));
  });
}

async function getLocalIp(interfaces = os.networkInterfaces()) {
  if (process.env.DEV_HOST_IP) {
    return process.env.DEV_HOST_IP;
  }

  const routed = await getRoutedIp();
  const routedAdapter = lanCandidates(interfaces).find((c) => c.address === routed);
  if (routedAdapter && !routedAdapter.virtual) {
    return routed;
  }

  return pickByHeuristic(interfaces) ?? '127.0.0.1';
}

function writeEnv(ip) {
  const newValue = `http://${ip}:${PORT}${ENDPOINT}`;
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
}

if (require.main === module) {
  getLocalIp()
    .then(writeEnv)
    .catch((error) => console.error('Error updating .env:', error));
}

module.exports = { getLocalIp, pickByHeuristic };
