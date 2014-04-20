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

Http.prototype.handles = function() {
    return false
}

Http.prototype.handle = function() {
    return false
}

module.exports = Http