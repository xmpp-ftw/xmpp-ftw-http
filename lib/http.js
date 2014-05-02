'use strict';

var Base = require('xmpp-ftw').Base
  , ltx  = require('ltx')

var Http = function() {}

Http.prototype = new Base()

Http.prototype.NS = 'http://jabber.org/protocol/http-auth'

Http.prototype._events = {
    'xmpp.http.approve': 'approveRequest',
    'xmpp.http.deny': 'denyRequest'
}

Http.prototype.IQ = 'iq'
Http.prototype.MESSAGE = 'message'

Http.prototype.handles = function(stanza) {
    if ((stanza.is('message') || stanza.is('iq')) &&
        stanza.getChild('confirm', this.NS)) return true
    return false
}

Http.prototype.handle = function(stanza) {
    var data
    if (stanza.is('message')) {
        data = this.processMessage(stanza)
    } else if (stanza.is('iq')) {
        data = this.processIq(stanza)
    } else {
        return false
    }
    this.socket.send('xmpp.http.verify', data)
    return true
}

Http.prototype.processMessage = function(stanza) {
    var data = { type: 'message' }
    if (stanza.getChild('thread')) data.id = stanza.getChildText('thread')
    this._processIncoming(stanza, data)
    return data
}

Http.prototype.processIq = function(stanza) {
    var data = { type: 'iq', id: stanza.attrs.id }
    this._processIncoming(stanza, data)
    return data
}

Http.prototype._processIncoming = function(stanza, data) {
    data.from = this._getJid(stanza.attrs.from)
    if (stanza.getChild('body')) data.description = stanza.getChildText('body')
    var confirm = stanza.getChild('confirm', this.NS)
    data.request = {
        method: confirm.attrs.method,
        id: confirm.attrs.id,
        url: confirm.attrs.url
    }
}

Http.prototype.approveRequest = function(data, callback) {
    if (!this._checkResponseData(data, callback)) return false
    var type = data.type.toLowerCase()
    if (this.IQ === type) {
        this._sendIqResponse(data, true)
    } else {
        this._sendMessageResponse(data, true)
    }
    if (callback) callback(null, true)
    return true
}

Http.prototype.denyRequest = function(data, callback) {
    if (!this._checkResponseData(data, callback)) return false
    var type = data.type.toLowerCase()
    if (this.IQ === type) {
        this._sendIqResponse(data, false)
    } else {
        this._sendMessageResponse(data, false)
    }
    if (callback) callback(null, true)
    return true
}

Http.prototype._checkResponseData = function(data, callback) {
    if (callback && (typeof callback !== 'function'))
        return this._clientError('Callback should be a function', data, callback)
    if (!data.type)
        return this._clientError('Missing \'type\' parameter', data, callback)
    var type = data.type.toLowerCase()
    if (-1 === ['iq', 'message'].indexOf(type.toLowerCase()))
        return this._clientError('Invalid \'type\' parameter', data, callback)
    if ((this.IQ === type) && !data.id)
        return this._clientError('Missing \'id\' parameter', data, callback)
    if (!data.to)
        return this._clientError('Missing \'to\' parameter', data, callback)
    if (!this._testRequestParameter(data, type, callback)) return false
    return true
}

Http.prototype._testRequestParameter = function(data, type, callback) {
    if (!data.request && (this.MESSAGE !== type)) return true
    if (!data.request) {
        this._clientError('Missing \'request\' parameter', data, callback)
        return false
    }
    if (!data.request.url) {
        this._clientError('Missing request \'url\' parameter', data, callback)
        return false
    }
    if (!data.request.id) {
        this._clientError('Missing request \'id\' parameter', data, callback)
        return false
    }
    if (!data.request.method) {
        this._clientError('Missing request \'method\' parameter', data, callback)
        return false
    }
    return true
}

Http.prototype._sendIqResponse = function(data, approve) {
    var stanza = new ltx.Element(
        'iq',
        { to: data.to, id: data.id, type: approve ? 'result' : 'error' }
    )
    if (data.request) this._addConfirmElement(stanza, data.request)
    if (false === approve) this._addErrorElement(stanza)
    this.client.send(stanza)
    return true
}

Http.prototype._sendMessageResponse = function(data, approve) {
    var stanza = new ltx.Element(
        'message',
        { to: data.to, type: approve ? 'normal' : 'error' }
    )
    if (data.id) stanza.c('thread').t(data.id)
    this._addConfirmElement(stanza, data.request)
    if (false === approve) this._addErrorElement(stanza)
    this.client.send(stanza)
    return true
}

Http.prototype._addErrorElement = function(stanza) {
    stanza.c('error', { type: 'auth' })
        .c('not-authorized', { xmlns: this.NS_ERROR })
}

Http.prototype._addConfirmElement = function(stanza, data) {
    stanza.c(
        'confirm',
        {
            xmlns: this.NS,
            url: data.url,
            method: data.method,
            id: data.id
        }
    )
}

module.exports = Http