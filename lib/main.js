const puppeteer = require('puppeteer'),
  opn           = require('opn');


function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = class WhatsappApi {
  constructor(nconf, logging) {
    this.nconf = nconf;
    this.logging = logging;
  }

  async setup() {
    let self = this;
    let promise = new Promise(async function (resolve, reject) {
      self.browser = await puppeteer.launch(self.nconf.get('puppeteer'));
      self.page = await self.browser.newPage();
      self.page.once('load', async () => {
        self.logging.debug('Page loaded, scanning for QR code or chat window...');
        let qr = false;
        try {
          qr = await self.page.waitForFunction(() => {
            // eslint-disable-next-line no-undef
            let chat = document.querySelector('div[title="Neuer Chat"]');
            // eslint-disable-next-line no-undef
            let code = document.querySelector('img[alt="Scan me!"]');
            if (chat) {
              return true;
            }
            if (code) {
              let area = {};
              // eslint-disable-next-line no-undef
              area.x = code.x;
              area.y = code.y;
              area.width = code.width;
              area.height = code.height;
              return area;
            }
            return false;
          }, { polling: 500, timeout: 45000 });
          qr = await qr.jsonValue();
          self.logging.debug('waitForFunction passed...', qr);
        } catch (e) {
          self.logging.debug('Setup timedout...');
          return reject(new Error('Setup timedout'));
        }

        // if qr code is present
        if (typeof qr === 'object') {
          await self.page.screenshot({
            path: 'qr.png',
            fullPage: false,
            clip: qr
          });
          self.logging.info('Please scan the QR Code within 15 seconds...');
          opn('qr.png');
        }
        try {
          self.logging.debug('Waiting 15 seconds for chat to open...');
          await self.page.waitForSelector('div[title="Neuer Chat"]', { timeout: 15000 });
        } catch (e) {
          self.logging.debug('Setup timedout');
          return reject(e);
        }
        self.logging.debug('Setup successfull!');
        return resolve();
      });
      // eslint-disable-next-line no-console
      self.page.on('console', console.log);
      await self.page.goto('https://web.whatsapp.com');
    });
    return promise;
  }

  async activateContact (findName) {
    let self = this;
    let contact = await self.page.$('span[title="'+findName+'"]');
    if (!contact) {
      throw new Error(findName + ' not found!');
    }
    await contact.click();
    timeout(200);
    return;
  }

  async textMessage (message) {
    let self = this;
    self.logging.debug('Sending Message');
    await self.page.type('div[contenteditable=true]', message);
    let send = await self.page.$('span[data-icon="send"]');
    await send.click();
    // Give it some time to send the message
    timeout(200);
    return;
  }

  async destroy () {
    let self = this;
    self.logging.debug('Destroying Instance');
    if (self.page) {
      await self.page.close();
    }
    if (self.browser) {
      await self.browser.close();
    }
    return;
  }

  dummy() {
    return 'Hello World';
  }
};
