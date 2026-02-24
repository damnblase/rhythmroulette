import '@soundworks/helpers/polyfills.js';
import '@soundworks/helpers/catch-unhandled-errors.js';
import { Server } from '@soundworks/core/server.js';
import ServerPluginPlatformInit from '@soundworks/plugin-platform-init/server.js';
import { loadConfig, configureHttpRouter } from '@soundworks/helpers/server.js';

import { WebSocketServer } from 'ws';
import Max from 'max-api';
import EventEmitter from 'node:events';

import globalDescription from './state-descriptions/global.js';
import phoneDescription from './state-descriptions/phone.js';

import { computeTempoMean } from './lib/ComputeTempoMean.js';
import { computeKeyMean } from './lib/ComputeKeyMean.js';
import { computeStyleMean } from './lib/ComputeStyleMean.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

//process.chdir('../../'); // force Max to be in right directory
process.chdir('../'); // force Max to be in right directory

console.log(process.cwd());

const eventEmitter = new EventEmitter(); // needed for communication node.script
// eventEmitter.on('name', name => performer.set('name', name));
// eventEmitter.on('name', name => console.log(name));

// init websocket sur 8081 - default messages and variables - Max handler
// Variables globales
let wss;
let wsClients = [];
let currentBPM = 120; // ??
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
  // eventEmitter.emit('tick', tickIndex, bpm);
}
//
function broadcastStyle(style) {
  const msg = {
    type: 'newStyle',
    style: style
  };

  wsClients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(msg));
    }
  });
}
//
function broadcastRandomize() {
  const msg = {
    type: 'randomize',
  };
  wsClients.forEach(client => {
    if (client.readyState === 1 /* OPEN */) {
      client.send(JSON.stringify(msg));
    }
  });
  sendToMax('randomize');
  // eventEmitter.emit('randomize');
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

          // 🔹 Si c'est un message "patterns" venant du client
          const patternKeys = ['kickpattern','snarepattern','hiHatPattern','tompattern','clappattern'];
          const isPatternMsg = patternKeys.some(k => k in msg);

          if (isPatternMsg) {
            // Envoi vers Max
            sendToMax('new_drum_pattern', msg);
            Max.post("Patterns reçus et envoyés à Max:", JSON.stringify(msg));
            return; // pas besoin de continuer
          }

          // 🔹 Gestion des ticks uniquement
          if (msg.type === 'tick') {
            sendToMax('tick', msg.count, msg.bpm);
            return;
          }
          if (msg.type === 'bpm') {
            sendToMax('bpm',msg.bpm);
            sendToMax('liveAPI', 'tempo', msg.bpm);
            return;
          }
           if (msg.type === 'swing') {
            sendToMax('swing',msg.swing);
            return;
          }
            if (msg.type === 'playstop') {
            sendToMax('liveAPI', "playstop",msg.status);
            Max.post("received playstop");
            return;
          }
          // Autres messages non traités pour l'instant
          Max.post("Message reçu (non géré) :", JSON.stringify(msg));

        } catch (e) {
          Max.post(`Erreur de parsing WebSocket: ${e.message}`);
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
Max.addHandler("newStyle", (style) => {
  broadcastStyle(style);
  Max.post("newStyle "+ style)
});
Max.addHandler("start", () => {
  isPlaying = true;
  tickCounter = 0;
  sendToMax('status', 'playing');
  eventEmitter.emit('status', 'playing');
  Max.post("Lecture démarrée");
});

Max.addHandler("stop", () => {
  isPlaying = false;
  sendToMax('status', 'stopped');
  eventEmitter.emit('status', 'stopped');
  Max.post("Lecture arrêtée");
});

Max.addHandler("bpm", (bpm) => {
  currentBPM = parseFloat(bpm);
  // sendToMax('bpm', currentBPM);
  // eventEmitter.emit('bpm', currentBPM);
  Max.post(`BPM défini à: ${currentBPM}`);
  // to update global state on ableton change tempo
  // Max.post(global.getValues());
});

Max.addHandler("tick", () => {
  if (isPlaying) {
    broadcastTick(tickCounter++, currentBPM);
  }
});

Max.addHandler('key', (note, mode = 'minor') => { // on le fait là mais on aurait pu le mettre dans une broadcastKey
  // Normalisation simple
  const tonic = String(note).trim();
  mode = mode.toLowerCase() === 'major' ? 'major' : 'minor';

  // Message minimal à envoyer
  const msg = {
    type: 'key',
    tonic, // lettre de la note
    mode   // 'major' ou 'minor'
  };
  // Envoi aux clients WebSocket
  wsClients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify(msg));
  });

  // Envoi vers Max et event interne
  sendToMax('key', tonic, mode);
  eventEmitter.emit('key', msg);

  Max.post(`Key définie: ${tonic} ${mode}`);
});


Max.addHandler("bang", () => {
  Max.post("Script WebSocket actif !");
});

Max.addHandler('randomize', () => {
  broadcastRandomize();

});
// Démarrage automatique
Max.post("Initialisation du script WebSocket...");
wss = startWebSocketServer();

// data computing

// ------------------------------------------------------
// ------------------------------------------------------
// soundworks stuff
// ------------------------------------------------------
// ------------------------------------------------------

// configure
const config = loadConfig(process.env.ENV, import.meta.url);

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

const server = new Server(config);
configureHttpRouter(server);

server.pluginManager.register('platform-init', ServerPluginPlatformInit);

// global state descriptions in './state-descriptions/global.js'
server.stateManager.defineClass('global', globalDescription);
server.stateManager.defineClass('phone', phoneDescription)

// @todo : who is performer ?
server.stateManager.defineClass('performer', {
  name: {
    type: 'string',
    default: 'perfomer1',
  },
});

await server.start();

// create and get descriptions
const global = await server.stateManager.create('global');
const phones = await server.stateManager.getCollection('phone');

Max.addHandler("state", (state) => {
  global.set('state', state);
})

// execute functions on if updates in global state
global.onUpdate((updates) => {
  // Max.post('updates')
  for (let [name, value] of Object.entries(updates)) {
    Max.post(updates);
    switch(name) {
      case 'state': {
        sendToMax('newState', value);
      } break;
      case 'tempo': {
        sendToMax('liveAPI', 'tempo', value);
        // eventEmitter.emit('bpm', value);
        // currentBPM = value;
      } break;
      case 'key': {
        sendToMax('newKey', value);
      } break;

      case 'style': {
        sendToMax('newStyle', value);
      } break;
    }
  }
})

// compute stuff every 50 ms (e.g. average tempo vote)
setInterval(() => {

  // update tempo
  const newTempo = computeTempoMean(phones.get('tempoVote'));
  if (newTempo !== 0) {
    // Max.post(`new tempo`, newTempo);
    global.set('tempo', newTempo);
  }

  // update key
  const newKey = computeKeyMean(phones.get('keyVote'));
  global.set('key', newKey);

  //update style
  const newStyle = computeStyleMean(phones.get('styleVote'));
  global.set('style', newStyle)



}, 50);

