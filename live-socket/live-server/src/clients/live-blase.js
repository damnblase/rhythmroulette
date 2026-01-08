import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';
import WebSocket, { WebSocketServer } from 'ws';
import Max from 'max-api';

// Variables globales
let wss;
let wsClients = [];
let currentBPM = 120;
let isPlaying = false;
let tickCounter = 0;

// Fonction pour envoyer un message vers Max
function sendToMax(...args) {
  Max.outlet(...args);
}

// Fonction pour envoyer un tick à tous les clients WebSocket
function broadcastTick(tickIndex, bpm) {
  const msg = {
    type: 'tick',
    count: tickIndex,
    bpm: bpm,
    subdiv: 4,
    subIndex: tickIndex % 4,
    beat: Math.floor(tickIndex / 4),
    loopBeat: Math.floor(tickIndex / 4)
  };
  wsClients.forEach(client => {
    if (client.readyState === 1 /* OPEN */) {
      client.send(JSON.stringify(msg));
    }
  });
  sendToMax('tick', tickIndex, bpm);
}


// Gestion des messages depuis Max
Max.addHandler("start", () => {
  isPlaying = true;
  tickCounter = 0;
  sendToMax('status', 'playing');
});

Max.addHandler("stop", () => {
  isPlaying = false;
  sendToMax('status', 'stopped');
});

Max.addHandler("bpm", (bpm) => {
  currentBPM = bpm;
  sendToMax('bpm', currentBPM);
});

Max.addHandler("tick", () => {
  if (isPlaying) {
    broadcastTick(tickCounter++, currentBPM);
  }
});

Max.addHandler("bang", () => {
  Max.post("Script is alive!");
});

// Démarrage du serveur WebSocket et Soundworks
async function bootstrap() {
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

  const wss = new WebSocketServer({ port: 8081 });
  wss.on('connection', function connection(ws) {
    console.log('socket connected')
    ws.on('error', console.error);

    ws.on('message', function message(data, isBinary) {
      data = JSON.parse(data);
      global.set('data', data);
    });

    // let counter = 1;

    // setInterval(() => {
    //   const data = {
    //     channel: 'counter',
    //     value: counter++,
    //   };
    //   ws.send(JSON.stringify(data));
    // }, 1000)
  });



  console.log(`Hello ${client.config.app.name}!`);
}

// The launcher allows to launch multiple clients in the same terminal window
// e.g. `EMULATE=10 npm run watch thing` to run 10 clients side-by-side
launcher.execute(bootstrap, {
  numClients: process.env.EMULATE ? parseInt(process.env.EMULATE) : 1,
  moduleURL: import.meta.url,
});
