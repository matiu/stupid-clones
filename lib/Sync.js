require('classtool');


function spec() {
//  var sockets         = require('../app/controllers/socket.js');
  var TransactionDb   = require('./TransactionDb').class();
  var bitutil = require('bitcore/util/util');
  var Address = require('bitcore/Address').class();
  var Script = require('bitcore/Script').class();
  var config = require('../config/config');
  var networks = require('bitcore/networks');
  var async           = require('async');


  function Sync() {
  }

  Sync.prototype.init = function(opts, cb) {
    var self = this;
    self.opts = opts;
    this.txDb    = new TransactionDb(opts);
    this.network = config.network === 'testnet' ? networks.testnet: networks.livenet;
    return cb();
  };

  Sync.prototype.close = function(cb) {
    var self = this;
    self.txDb.close(function() {
    });
  };


  Sync.prototype.destroy = function(next) {
    var self = this;
    async.series([
      function(b) { self.txDb.drop(b); },
    ], next);
  };


  Sync.prototype._handleBroadcast = function(hash, updatedTxs, updatedAddrs) {
    var self = this;
/*
    if (self.opts.shouldBroadcast) {
      if (hash) {
        sockets.broadcastBlock(hash);
      }

      if (updatedTxs) {
        updatedTxs.forEach(function(tx) {
          sockets.broadcastTx(tx);
        });
      }

      if (updatedAddrs ) {
        updatedAddrs.forEach(function(addr, txs){
          txs.forEach(function(addr, t){
            sockets.broadcastAddressTx(addr, t);
          });
        });
      }
    }
*/  };

  Sync.prototype.storeTxs = function(txs, blockhash, cb) {
    var self = this;

    self.txDb.createFromArray(txs, blockhash, function(err, updatedAddrs) {
      if (err) return cb(err);

      self._handleBroadcast(null, txs, updatedAddrs);
      return cb(err);
    });
  };

  // TODO. replace with 
  // Script.prototype.getAddrStrs if that one get merged in bitcore
  Sync.prototype.getAddrStr = function(s) {
    var self = this;

    var addrStrs = [];
    var type = s.classify();
    var addr;

    switch(type) {
      case Script.TX_PUBKEY:
        var chunk = s.captureOne();
        addr = new Address(self.network.addressPubkey, bitutil.sha256ripe160(chunk));
        addrStrs = [ addr.toString() ];
        break;
      case  Script.TX_PUBKEYHASH:
        addr = new Address(self.network.addressPubkey, s.captureOne());
        addrStrs = [ addr.toString() ];
        break;
      case Script.TX_SCRIPTHASH:
        addr = new Address(self.network.addressScript, s.captureOne());
        addrStrs = [ addr.toString() ];
        break;
      case Script.TX_MULTISIG:
        var chunks = s.capture();
        chunks.forEach(function(chunk) {
          var a = new Address(self.network.addressPubkey,  bitutil.sha256ripe160(chunk));
          addrStrs.push(a.toString());
        });
        break;
      case Script.TX_UNKNOWN:
        break;
    }

    return addrStrs;
  };

  return Sync;
}
module.defineClass(spec);

