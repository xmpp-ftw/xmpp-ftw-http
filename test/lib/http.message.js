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
        
        var stanza = helper.getStanza('message-confirmation')
        
        describe('Incoming confirmation request', function() {
            
            it('Accepts an incoming message confirmation request', function() {
                http.handles(stanza).should.be.true
            })
            
            it('Does not accept a non-confirm message', function() {
                var stanza = helper.getStanza('message-confirmation')
                stanza.removeChild('confirm', http.NS)
                http.handles(stanza).should.be.false
                
            })
            
            it('Sends expected information through', function(done) {
                socket.on('xmpp.http.confirm', function(data) {
                    data.from.should.eql({ domain: 'files.shakespeare.lit' })
                    data.id.should.equal('e0ffe42b28561960c6b12b944a092794b9683a38')
                    data.description
                        .should.include('Someone (maybe you) has requested')
                    data.type.should.equal('message')
                    data.request.id.should.equal('a7374jnjlalasdf82')
                    data.request.method.should.equal('GET')
                    data.request.url
                        .should.equal('https://files.shakespeare.lit:9345/missive.html')
                    done()
                })
                http.handle(stanza).should.be.true
            })
            
        })

    })

})