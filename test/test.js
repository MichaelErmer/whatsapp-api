/* eslint-disable no-unused-vars, no-undef */
const should = require('should'),
  nconf         = require('nconf'),
  logging       = require('bunyan');

const WhatsappApi = require ('../lib/main.js');

describe('whatsapp-api', function () {
  before(() => {
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
        'level': 'error'
      },
    });

    logging.setup(nconf);
  });

  describe('stage1', () => {
    let whatsappApi;
    it('should initialize', () => {
      whatsappApi = new WhatsappApi(nconf, logging);
    });
    it('should setup', done => {
      whatsappApi.setup(done);
    });
    it('should respond to dummy() with Hello World', () => {
      let response = whatsappApi.dummy();
      response.should.equal('Hello World');
    });
  });
});
