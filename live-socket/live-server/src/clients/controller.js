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

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, {
    initScreensContainer: $container,
    reloadOnVisibilityChange: false,
  });

  await client.start();

  const global = await client.stateManager.attach('global');
  const performers = await client.stateManager.getCollection('performer');
  performers.onChange(renderApp);


  function renderApp() {
    render(html`
      <div class="controller-layout">
        <header>
          <h1>${client.config.app.name} | ${client.role}</h1>
          <sw-audit .client="${client}"></sw-audit>
        </header>
        <section>
          <p>Hello ${client.config.app.name}!</p>
          <div style="padding-bottom: 4px">
            <sc-tab
              .options=${global.getDescription('state').list}
              value=${global.get('state')}
              @change=${e => global.set('state', e.detail.value)}
            ></sc-tab>
          </div>
          <pre><code>
${JSON.stringify(performers.getValues(), null, 2)}
          </code></pre>
        </section>
      </div>
    `, $container);
  }

  renderApp();
  global.onUpdate(() => renderApp());
}

launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
  width: '50%',
});
