'use strict';

var Base = require('xmpp-ftw').Base

var Http = function() {}

Http.prototype = new Base()

Http.prototype.NS = 'http://jabber.org/protocol/http-auth'

Http.prototype._events = {
}

var init = Http.prototype.init

Http.prototype.init = function(manager) {
    init.call(this, manager)
}

Http.prototype.handles = function(stanza) {
    if ((stanza.is('message') || stanza.is('iq')) &&
        stanza.getChild('confirm', this.NS)) return true
    return false
}

Http.prototype.handle = function(stanza) {
    if (stanza.is('message')) {
        return this._processMessage(stanza)
    } else if (stanza.is('iq')) {
        return this._processIq(stanza)
    }
    return false
}

Http.prototype._processMessage = function(stanza) {
    var data = { type: 'message', from: stanza.attrs.from, request: {} }
    if (stanza.getChild('thread')) data.id = stanza.getChildText('thread')
    if (stanza.getChild('body')) data.description = stanza.getChildText('body')
    var confirm = stanza.getChild('confirm', this.NS)
    data.request = {
        method: confirm.attrs.method,
        id: confirm.attrs.id,
        url: confirm.attrs.url
    }
    this.socket.send('xmpp.http.confirm', data)
    return true
}

Http.prototype._processIq = function() {}

module.exports = Http