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

    describe('IQ', function() {
        
        var stanza = helper.getStanza('iq-confirmation')
        
        describe('Incoming confirmation request', function() {
            
            it('Accepts an incoming IQ confirmation request', function() {
                http.handles(stanza).should.be.true
            })
            
            it('Does not accept a non-confirm IQ', function() {
                var stanza = helper.getStanza('iq-confirmation')
                stanza.removeChild('confirm', http.NS)
                http.handles(stanza).should.be.false
                
            })
            
            it('Sends expected information through', function(done) {
                socket.on('xmpp.http.confirm', function(data) {
                    data.from.should.eql({ domain: 'files.shakespeare.lit' })
                    data.id.should.equal('ha000')

                    data.type.should.equal('iq')
                    data.request.id.should.equal('a7374jnjlalasdf82')
                    data.request.method.should.equal('GET')
                    data.request.url
                        .should.equal('https://files.shakespeare.lit:9345/missive.html')
                    done()
                })
                http.handle(stanza).should.be.true
            })
            
        })
        
        describe('Approval', function() {
            
            it('Errors if callback provided but not a function', function(done) {
                var request = {}
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Callback should be a function')
                    done()
                })
                socket.send('xmpp.http.approve', request, true)
            })
            
            it('Errors if missing \'type\'', function(done) {
                var request = {}
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing \'type\' parameter')
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })
            
            it('Errors on invalid \'type\'', function(done) {
                var request = { type: 'presence' }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Invalid \'type\' parameter')
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })
            
            it('Errors if \'id\' is missing', function(done) {
                var request = { type: 'iq' }
                var callback = function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing \'id\' parameter')
                    done()
                }
                socket.send('xmpp.http.approve', request, callback)
            })
            
        })
        
        describe('Deny', function() {
            
        })

    })

})