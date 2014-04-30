'use strict';

/* jshint -W030 */

var Http = require('../../index')
  , helper = require('../helper')

describe('HTTP Auth', function() {

    var http, socket, xmpp, manager

    before(function() {
        socket = new helper.SocketEventer()
        xmpp = new helper.XmppEventer()
        manager = {
            socket: socket,
            client: xmpp,
            trackId: function(id, callback) {
                if (typeof id !== 'object')
                    throw new Error('Stanza ID spoofing protection not in place')
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
            },
            fullJid: {
                local: 'user',
                domain: 'example.com',
                resource: 'laptop'
            },
            _getLogger: function() {
                return {
                    log: function() {},
                    error: function() {},
                    warn: function() {},
                    info: function() {}
                }
            }
        }
        http = new Http()
        http.init(manager)
    })

    beforeEach(function() {
        socket.removeAllListeners()
        xmpp.removeAllListeners()
        http.init(manager)
    })

    describe('Message', function() {
        
        describe('Incoming confirmation request', function() {
            
            it('Accepts an incoming message confirmation request', function() {
                var stanza = helper.getStanza('message-confirmation')
                http.handles(stanza).should.be.true
            })
            
            it('Does not accept a non-confirm message', function() {
                var stanza = helper.getStanza('message-confirmation')
                stanza.removeChild('confirm', http.NS)
                http.handles(stanza).should.be.false
                
            })
        })

    })

})