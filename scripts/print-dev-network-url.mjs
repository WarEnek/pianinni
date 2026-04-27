import { networkInterfaces } from 'node:os';

const port = process.env.VITE_DEV_PORT || process.env.PORT || '5173';
const ips = [];

for (const list of Object.values(networkInterfaces())) {
  if (!list) continue;
  for (const net of list) {
    if (net.family !== 'IPv4' || net.internal) continue;
    ips.push(net.address);
  }
}

if (ips.length) {
  console.log('');
  console.log('If Simple Browser / Windows shows ERR_CONNECTION_REFUSED for localhost, use:');
  for (const ip of ips) {
    console.log(`  http://${ip}:${port}/`);
  }
  console.log('');
}
