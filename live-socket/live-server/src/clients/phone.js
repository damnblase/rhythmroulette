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
  console.log(audioContext.state === 'running');

  // Eventually register plugins
  // client.pluginManager.register('my-plugin', plugin);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, { initScreensContainer: $container });

  await client.start();

  const global = await client.stateManager.attach('global');
  const phone = await client.stateManager.create('phone');

  // audio synth
  setInterval(() => {
    console.log('trigger')

    const now = audioContext.currentTime;

    const env = new GainNode(audioContext, { gain: 0 });
    env.connect(audioContext.destination);

    const grainTime = Math.random() * 5;


    env.gain
      .setValueAtTime(0, now)
      .linearRampToValueAtTime(1, now + 0.01)
      .exponentialRampToValueAtTime(0.001, now + grainTime);

      const osc = new OscillatorNode(audioContext);

      oscTypes = ['sine', 'rectangle', 'triangle', 'sawtooth'];
      osc.type = oscTypes[Math.random() * oscTypes.length];

      const availableNotes = global.get('availableNotes')
      const randomIndex = Math.floor(Math.random() * availableNotes.length)

      console.log(availableNotes[randomIndex]);

      osc.frequency.value = availableNotes[randomIndex];
      osc.connect(env);
      osc.start(now);
      osc.stop(now + 2);

  }, 2000 + Math.random() * 500);





  // @todo: dynamically load filenames from folder (not hardcoded)
  const availableStyles = [
    'boom bap',
    'drill3',
    'footwork2',
    'g funk',
    'house 3',
    'jerk',
    'postpunk 3',
    'postpunksixteenth2',
    'rap6',
    'reggae',
    'twostep',
    'wheezypure',
  ];

  // render
  function renderApp() {

    render(html`
      <div class="simple-layout">
        <p>Hello ${client.config.app.name}!</p>
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
        <div style="padding-bottom: 4px">
          <sc-text>vote for a key</sc-text>
          <sc-keyboard
            input-mode=stateful
            mode=monophonic
            range= 13
            @input=${e => phone.set('keyVote', e.detail.value)}
          ></sc-keyboard>
        </div>
        <div style="padding-bottom: 4px">
          <sc-text>vote for a style</sc-text>
          <sc-tab
            style="width: auto;"
            orientation=vertical
            .options=${availableStyles}
            @change=${e => phone.set('styleVote', e.detail.value)}
          ></sc-tab>
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
