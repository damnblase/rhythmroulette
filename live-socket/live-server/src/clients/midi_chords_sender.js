import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';

import Max from 'max-api';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

process.chdir('../../'); // force Max to be in right directory

// Max.addHandler("midiNoteFreq", (value) => {
//   Max.post('received midi note', value)
//   Max.outlet('array clear');
//   // global.set('availableNotes', value)
// })

// async function bootstrap() {
  const config = loadConfig(process.env.ENV, import.meta.url);
  const client = new Client(config);

  // Eventually register plugins
  // client.pluginManager.register('my-plugin', plugin);

  // https://soundworks.dev/tools/helpers.html#nodelauncher
  launcher.register(client);

  await client.start();

  const global = await client.stateManager.attach('global');

  Max.addHandler("availableFrequencies", (...value) => {
    console.log(value);
    if(value.length > 5 ) {
      Max.post(JSON.stringify(value));
      Max.post('superior to 5')
      Max.post("message received");
      Max.outlet('array clear');
      global.set('availableNotes', value)
    }
  })
  // await import('./midi_chords_test.js');

  console.log(`Hello ${client.config.app.name}!`);
// }

// The launcher allows to launch multiple clients in the same terminal window
// e.g. `EMULATE=10 npm run watch thing` to run 10 clients side-by-side
// launcher.execute(bootstrap, {
//   numClients: process.env.EMULATE ? parseInt(process.env.EMULATE) : 1,
//   moduleURL: import.meta.url,
// });
