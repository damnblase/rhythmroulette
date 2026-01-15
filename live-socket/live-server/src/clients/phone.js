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
  let intervalId;

  function synth(order) {

    if (order === 'start') {

      intervalId = setInterval(() => {

        const now = audioContext.currentTime;

        // main envelope
        const env = new GainNode(audioContext, { gain: 0 });
        env.connect(audioContext.destination);
        const grainTime = 1.5 + Math.random() * 4;
        env.gain
          .setValueAtTime(0, now)
          .linearRampToValueAtTime(0.8, now + 0.01)
          .exponentialRampToValueAtTime(0.001, now + grainTime);

        // main oscillator
        const osc = new OscillatorNode(audioContext);

        // oscTypes = ['sine', 'triangle'];
        // oscType = oscTypes[Math.floor(Math.random() * oscTypes.length)]
        // osc.type = oscType;

        const availableNotes = global.get('availableNotes')
        const randomIndex = Math.floor(Math.random() * availableNotes.length)
        const oscFreq = availableNotes[randomIndex];

        osc.frequency.value = oscFreq;
        osc.connect(env);
        osc.start(now);
        osc.stop(now + grainTime);

        // harmonics
        const harm1 = new OscillatorNode(audioContext);
        harm1.frequency.value = oscFreq * 3;

        const envHarm1 = new GainNode(audioContext, {gain: 0.4})
        envHarm1.connect(env);
        harm1.connect(envHarm1);
        harm1.start(now);
        harm1.stop(now + grainTime);

        const harm2 = new OscillatorNode(audioContext);
        harm2.frequency.value = oscFreq * 5;

        const envHarm2 = new GainNode(audioContext, {gain: 0.2})
        envHarm2.connect(env);
        harm2.connect(envHarm2);
        harm2.start(now);
        harm2.stop(now + grainTime);

      }, 2000 + Math.random() * 500);

    } else if (order === 'stop') {
      clearInterval(intervalId);
    }
  }

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
    const state = global.get('state')
    switch(state) {
      case 'init': {
        render(html`<sc-text>Concert is about to start</sc-text>`, $container);
      } break;
      case 'votes': {
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
      } break;
      case 'synth': {
        render(html`<sc-text>volume up !</sc-text>`, $container)
      } break;
      case 'end': {
        render(html`<sc-text>thank you, you can put your phone in your pocket and enjoy the rest of the show</sc-text>`, $container)
      };
    };
  };

  renderApp();
  phone.onUpdate(() => renderApp());
  global.onUpdate( async updates => {
    for (let[name, value] of Object.entries(updates)) {
      switch(name) {
        case 'state': {
          if (value === 'synth') {
            synth('start');
          } else {
            synth('stop');
          }
        } break;
      }
    }
  renderApp();
  }, true) ;
};

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
});

