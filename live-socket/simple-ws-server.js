import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  console.log('socket connected')
  ws.on('error', console.error);

  ws.on('message', function message(data, isBinary) {
    console.log(JSON.parse(data));
    // wss.clients.forEach(function each(client) {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(data);
    //   }
    // });
  });

  let counter = 1;

  setInterval(() => {
    const data = {
      channel: 'counter',
      value: counter++,
    };
    ws.send(JSON.stringify(data));
  }, 1000)
});