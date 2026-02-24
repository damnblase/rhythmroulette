import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
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

  // Eventually register plugins
  // client.pluginManager.register('my-plugin', plugin);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, { initScreensContainer: $container });

  await client.start();

  const keys = {
    'C': 60,
    'C#': 61,
    'D': 62,
    'D#': 63,
    'E': 64,
    'F': 65,
    'F#': 66,
    'G': 67,
    'G#': 68,
    'A': 69,
    'A#': 70,
    'B': 71,
  };

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

  const global = await client.stateManager.attach('global');

  function renderApp() {
    const state = global.get('state')
    const SSID = 'ISMM';
    const password = '12345678'
    const playerURL = 'http://romainblase.local:8000'
    switch(state) {
      case 'init': {
        render(html`
          <div style="padding-bottom: 4px; display: flex; flex-direction: row">
          <div style="padding-bottom: 4px; padding-left:15px; flex: 0.5">
            <h2>1 : Connect to WiFi</h2>
            <div style="padding-bottom: 4px;">
              <sc-text style="width: 400px; height: 60px; font-size: 22px;">SSID: ${SSID}</sc-text>
            </div>
            <div style="padding-bottom: 4px;">
              <sc-text style="width: 400px; height: 60px; font-size: 22px;">Password: ${password}</sc-text>
            </div>
            <div style="padding-bottom: 4px;">
              <sc-qrcode
                style="height: 400px; width: 400px"
                value="WIFI:S:${SSID};T:WPA;P:${password};H:false;"
                ></sc-qrcode>
              </div>
            </div>
            <div style="padding-bottom: 4px; padding-left:15px; flex: 0.5">
              <h2>2 : Go to this website</h2>
              <div style="padding-bottom: 4px;">
                <div style="padding-bottom: 4px">
                  <sc-text> </sc-text>
                </div>
                <div style="padding-bottom: 4px">
                  <sc-text style="width: 400px; height: 60px; font-size: 22px;">${playerURL}</sc-text>
                </div>
              </div>
              <sc-qrcode
              style="height: 400px; width: 400px"
              value=${playerURL}
            ></sc-qrcode>
          </div>
        </div>
        `, $container);
      } break;
      case 'votes': {
        render(html`
        <div class="simple-layout">
          <p>Hello ${client.config.app.name}!</p>
          <div style="padding-bottom: 4px">
            <sc-text>Current BPM</sc-text>
            <sc-slider
              value=${global.get('tempo')}
              min=0
              max=400
              number-box=true
            ></sc-slider>
          </div>
          <div style="padding-bottom: 4px">
            <sc-text>Current key</sc-text>
            <sc-keyboard
              range=13
              mode=monophonic
            ></sc-keyboard>
          </div>
          <sw-credits .infos="${client.config.app}"></sw-credits>
        </div>
        <div style="padding-bottom: 4px">
          <sc-text>Current style</sc-text>
          <sc-tab
            style="width: auto;"
            orientation=vertical
            .options=${availableStyles}
            value=${global.get('style')}
          ></sc-tab>
        </div>
        <sw-credits .infos="${client.config.app}"></sw-credits>
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
    // render(html`
    //   <div class="simple-layout">
    //     <p>Hello ${client.config.app.name}!</p>
    //     <div style="padding-bottom: 4px">
    //       <sc-text>Current BPM</sc-text>
    //       <sc-slider
    //         value=${global.get('tempo')}
    //         min=0
    //         max=400
    //         number-box=true
    //       ></sc-slider>
    //     </div>
    //     <div style="padding-bottom: 4px">
    //       <sc-text>Current key</sc-text>
    //       <sc-keyboard
    //       range=13
    //       mode=monophonic
    //       ></sc-keyboard>
    //     </div>
    //     <sw-credits .infos="${client.config.app}"></sw-credits>
    //   </div>
    //     <div style="padding-bottom: 4px">
    //       <sc-text>Current style</sc-text>
    //       <sc-tab
    //         style="width: auto;"
    //         orientation=vertical
    //         .options=${availableStyles}
    //         value=${global.get('style')}
    //       ></sc-tab>
    //     </div>
    //     <sw-credits .infos="${client.config.app}"></sw-credits>
    //   </div>
    // `, $container);
  }

  renderApp();

  global.onUpdate(updates => {
    console.log(updates);
    if ('key' in updates) {
      const midiNote = keys[updates.key] - 12;
      const $klav = document.querySelector('sc-keyboard');
      console.log($klav, midiNote);
      $klav._handleKeyPress(midiNote, 127);
    }
    renderApp();
  }, true);
}

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
});
