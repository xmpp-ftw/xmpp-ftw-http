'use strict';

/* jshint -W030 */

var Http = require('../../index')
  , helper = require('../helper')
  , should = require('should')

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
        
        describe('Approval', function() {

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
            
            it('Errors if missing \'to\'', function(done) {
                var request = { type: 'message', id: '1' }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing \'to\' parameter')
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })
            
            it('Errors if \'to\' is empty', function(done) {
                var request = { type: 'message', id: '1', to: '' }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing \'to\' parameter')
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })
            
            it('Errors if no \'request\' element', function(done) {
                var request = { type: 'message', id: '1', to: 'you' }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing \'request\' parameter')
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })
            
            it('Errors if \'request\' but not \'url\'', function(done) {
                var request = { type: 'message', id: '1', to: 'you', request: {} }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing request \'url\' parameter')
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })

            it('Errors if \'request\' but not \'id\'', function(done) {
                var request = {
                    type: 'message',
                    id: '1',
                    to: 'you',
                    request: { url: 'http' }
                }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing request \'id\' parameter')
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })

            it('Errors if \'request\' but not \'method\'', function(done) {
                var request = {
                    type: 'message',
                    id: '1',
                    to: 'you',
                    request: { url: 'http', id: 2 }
                }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing request \'method\' parameter')
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })
            
            it('Sends expected response', function(done) {
                var request = {
                    type: 'message',
                    id: '1',
                    to: 'you',
                    request: { id: '5', url: 'http', method: 'GET' }
                }
                xmpp.on('stanza', function(stanza) {
                    stanza.is('message').should.be.true
                    stanza.attrs.to.should.equal(request.to)
                    stanza.getChildText('thread').should.equal(request.id)
                    stanza.attrs.type.should.equal('normal')
                    var confirm = stanza.getChild('confirm', http.NS)
                    confirm.should.exist
                    confirm.attrs.url.should.equal(request.request.url)
                    confirm.attrs.method.should.equal(request.request.method)
                    confirm.attrs.id.should.equal(request.request.id)
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })
            
            it('Sends expected response without <thread/>', function(done) {
                var request = {
                    type: 'message',

                    to: 'you',
                    request: { id: '5', url: 'http', method: 'GET' }
                }
                xmpp.on('stanza', function(stanza) {
                    should.not.exist(stanza.getChild('thread'))
                    done()
                })
                socket.send('xmpp.http.approve', request)
            })
            
        })
        
        describe('Deny', function() {
            
            it('Errors if missing \'type\'', function(done) {
                var request = {}
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing \'type\' parameter')
                    done()
                })
                socket.send('xmpp.http.deny', request)
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
                socket.send('xmpp.http.deny', request)
            })
            
            it('Errors if missing \'to\'', function(done) {
                var request = { type: 'message', id: '1' }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing \'to\' parameter')
                    done()
                })
                socket.send('xmpp.http.deny', request)
            })
            
            it('Errors if \'to\' is empty', function(done) {
                var request = { type: 'message', id: '1', to: '' }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing \'to\' parameter')
                    done()
                })
                socket.send('xmpp.http.deny', request)
            })
            
            it('Errors if no \'request\' parameter', function(done) {
                var request = { type: 'message', id: '1', to: 'you' }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing \'request\' parameter')
                    done()
                })
                socket.send('xmpp.http.deny', request)
            })
            
            it('Errors if \'request\' but not \'url\'', function(done) {
                var request = { type: 'message', id: '1', to: 'you', request: {} }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing request \'url\' parameter')
                    done()
                })
                socket.send('xmpp.http.deny', request)
            })

            it('Errors if \'request\' but not \'id\'', function(done) {
                var request = {
                    type: 'message',
                    id: '1',
                    to: 'you',
                    request: { url: 'http' }
                }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing request \'id\' parameter')
                    done()
                })
                socket.send('xmpp.http.deny', request)
            })

            it('Errors if \'request\' but not \'method\'', function(done) {
                var request = {
                    type: 'message',
                    id: '1',
                    to: 'you',
                    request: { url: 'http', id: 2 }
                }
                socket.on('xmpp.error.client', function(error) {
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.request.should.eql(request)
                    error.description.should.equal('Missing request \'method\' parameter')
                    done()
                })
                socket.send('xmpp.http.deny', request)
            })
            
            it('Sends expected response', function(done) {
                var request = {
                    type: 'message',
                    id: '1',
                    to: 'you',
                    request: { id: '5', url: 'http', method: 'GET' }
                }
                xmpp.on('stanza', function(stanza) {
                    stanza.is('message').should.be.true
                    stanza.attrs.to.should.equal(request.to)
                    stanza.getChildText('thread').should.equal(request.id)
                    stanza.attrs.type.should.equal('error')
                    var confirm = stanza.getChild('confirm', http.NS)
                    confirm.should.exist
                    confirm.attrs.url.should.equal(request.request.url)
                    confirm.attrs.method.should.equal(request.request.method)
                    confirm.attrs.id.should.equal(request.request.id)
                    var error = stanza.getChild('error')
                    error.should.exist
                    error.attrs.type.should.equal('auth')
                    error.getChild('not-authorized', http.NS_ERROR).should.exist
                    done()
                })
                socket.send('xmpp.http.deny', request)
            })
            
                        
            it('Sends expected response without <thread/>', function(done) {
                var request = {
                    type: 'message',
                    to: 'you',
                    request: { id: '5', url: 'http', method: 'GET' }
                }
                xmpp.on('stanza', function(stanza) {
                    should.not.exist(stanza.getChild('thread'))
                    done()
                })
                socket.send('xmpp.http.deny', request)
            })
            
        })

    })

})