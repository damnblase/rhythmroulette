import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';
import WebSocket, { WebSocketServer } from 'ws';



// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

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

  const wss = new WebSocketServer({ port: 8080 });
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
