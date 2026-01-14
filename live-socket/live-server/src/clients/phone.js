import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import ClientPluginPlatformInit from '@soundworks/plugin-platform-init/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render } from 'lit';
import '@ircam/sc-components';


// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);

  const audioContext = new AudioContext();

  client.pluginManager.register('platform-init', ClientPluginPlatformInit, { audioContext });

  // Eventually register plugins
  // client.pluginManager.register('my-plugin', plugin);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, { initScreensContainer: $container });

  await client.start();

  console.log(audioContext.state === 'running');
  const global = await client.stateManager.attach('global');
  const phone = await client.stateManager.create('phone');

  function renderApp() {
    console.log(phone.get('tempoVote'))
    console.log('globalTempo', global.get('tempo'));
    render(html`
      <div class="simple-layout">
        <p>Hello ${client.config.app.name}!</p>
        <p>${global.get('tempo')}</p>
        <div style="padding-bottom: 4px">
          <sc-text>vote for a tempo</sc-text>
          <sc-slider
            number-box=true
            @input=${e => phone.set('tempoVote', e.detail.value)}
            value=${phone.get('tempoVote').default}
            min=${phone.getDescription('tempoVote').min}
            max=${phone.getDescription('tempoVote').max}
          ></sc-slider>
          <sw-credits .infos="${client.config.app}"></sw-credits>
        </div>
        <sc-text>vote for a key</sc-text>
        <div style="padding-bottom: 4px">
          <sc-keyboard
            input-mode=stateful
            mode=monophonic
            range= 13
            @input=${e => phone.set('keyVote', e.detail.value)}
          ></sc-keyboard>
        </div>
      </div>
    `, $container);
  }

  renderApp();
  phone.onUpdate(() => renderApp());
  global.onUpdate(() => renderApp());
}

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
});
