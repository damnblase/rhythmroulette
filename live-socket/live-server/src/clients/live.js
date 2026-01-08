import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';
import Max from 'max-api';
import EventEmitter from 'node:events';


// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

// This will be printed directly to the Max console
// Max.post(`Loaded the ${path.basename(__filename)} script`);
process.chdir('../../'); // force Max to be in right directory
console.log(process.cwd());

const eventEmitter = new EventEmitter();
// eventEmitter.on('name', name => performer.set('name', name));
// eventEmitter.on('name', name => console.log(name));

// Use the 'addHandler' function to register a function for a particular message
Max.addHandler('bang', () => {
  Max.post('Who you think you bangin');
});

// Use the 'outlet' function to send messages out of node.script's outlet
Max.addHandler('echo', (msg) => {
  Max.outlet(msg);
});

Max.addHandler('name', (msg) => {
  console.log(eventEmitter, msg);
  eventEmitter.emit('name', msg);
  // Max.outlet(msg);
});

const config = loadConfig(process.env.ENV, import.meta.url);
const client = new Client(config);

// Eventually register plugins
// client.pluginManager.register('my-plugin', plugin);

// https://soundworks.dev/tools/helpers.html#nodelauncher
launcher.register(client);

await client.start();

const global = await client.stateManager.attach('global');
global.onUpdate((updates) => {
  console.log(updates);
});

const performer = await client.stateManager.create('performer');
eventEmitter.on('name', name => {
  console.log('set performer name to:', name);
  performer.set('name', name);
});

const performers = await client.stateManager.getCollection('performer');
performers.onUpdate((state, updates) => {
  console.log(updates)
});
