import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';
import { WebSocketServer } from 'ws';
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

// Démarrage du serveur WebSocket
function startWebSocketServer() {
  try {
    wss = new WebSocketServer({ port: 8081 });
    Max.post(`Serveur WebSocket démarré sur ws://localhost:8081`);

    wss.on('connection', (ws) => {
      Max.post('Nouveau client WebSocket connecté');
      wsClients.push(ws);

      ws.on('error', (err) => {
        Max.post(`Erreur WebSocket: ${err.message}`);
      });

      ws.on('close', () => {
        wsClients = wsClients.filter(c => c !== ws);
        Max.post('Client WebSocket déconnecté');
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          Max.post(`Message reçu: ${JSON.stringify(msg)}`);
          if (msg.type === 'tick') {
            sendToMax('tick', msg.count, msg.bpm);
          }
        } catch (e) {
          Max.post(`Erreur de parsing: ${e.message}`);
        }
      });
    });

    wss.on('error', (err) => {
      Max.post(`Erreur serveur WebSocket: ${err.message}`);
    });

  } catch (err) {
    Max.post(`Erreur au démarrage du serveur: ${err.message}`);
  }

  return wss;
}

// Gestion des messages depuis Max
Max.addHandler("start", () => {
  isPlaying = true;
  tickCounter = 0;
  sendToMax('status', 'playing');
  Max.post("Lecture démarrée");
});

Max.addHandler("stop", () => {
  isPlaying = false;
  sendToMax('status', 'stopped');
  Max.post("Lecture arrêtée");
});

Max.addHandler("bpm", (bpm) => {
  currentBPM = parseFloat(bpm);
  sendToMax('bpm', currentBPM);
  Max.post(`BPM défini à: ${currentBPM}`);
});

Max.addHandler("tick", () => {
  if (isPlaying) {
    broadcastTick(tickCounter++, currentBPM);
  }
});

Max.addHandler("bang", () => {
  Max.post("Script WebSocket actif !");
});

// Démarrage automatique
Max.post("Initialisation du script WebSocket...");
const wss = startWebSocketServer();

//soundworks
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
  console.log(`Hello ${client.config.app.name}!`);
}

// The launcher allows to launch multiple clients in the same terminal window
// e.g. `EMULATE=10 npm run watch thing` to run 10 clients side-by-side

launcher.execute(bootstrap, {
  numClients: process.env.EMULATE ? parseInt(process.env.EMULATE) : 1,
  moduleURL: import.meta.url,
});
