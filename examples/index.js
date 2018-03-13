const Main          = require('../lib/main.js'),
  nconf         = require('nconf'),
  Logging       = require('bunyan');

nconf
  .argv()
  .env();

if (nconf.get('config')) {
  // Overwrite config from file
  nconf.file({ file: nconf.get('config') });
}

nconf.defaults({
  log: {
    'name': 'whatsapp-api',
    'level': 'debug'
  },
  puppeteer: {
    headless: true,
    userDataDir: './profile/',
  }
});

const logging = new Logging(nconf.get('log'));

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const main = new Main(nconf, logging);
  try {
    await main.setup();
    logging.info('All ready');
  } catch (e) {
    logging.error(e);
    // retry or exit
    return process.exit(0);
  }
  try {
    await main.activateContact(nconf.get('p1'));
    await main.textMessage('Test Message');
  } catch (e) {
    logging.error(e);
  }
  try {
    await main.activateContact(nconf.get('p2'));
    await main.textMessage('Message');
  } catch (e) {
    logging.error(e);
  }
  await timeout(500);
  await main.destroy();
})();

