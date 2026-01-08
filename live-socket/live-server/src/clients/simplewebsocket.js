import { WebSocketServer } from 'ws';
import Max from 'max-api';

Max.post("Démarrage du serveur WebSocket...");

const wss = new WebSocketServer({ port: 8081 });
wss.on('connection', (ws) => {
  Max.post('Nouveau client connecté !');
  ws.on('message', (data) => {
    Max.post(`Message reçu : ${data}`);
  });
});

Max.post(`Serveur WebSocket démarré sur ws://localhost:8081`);
