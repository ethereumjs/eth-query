const extend = require('xtend')
const async = require('async')
const ethUtil = require('ethereumjs-util')

module.exports = EthQuery


function EthQuery(provider){
  const self = this
  self.currentProvider = provider
}

//
// higher level
//

EthQuery.prototype.getAccount = function(address, block, cb){
  const self = this
  async.parallel({
    balance: self.getBalance.bind(self, address, block),
    nonce: self.getTransactionCount.bind(self, address, block),
    code: self.getCode.bind(self, address, block),
  }, cb)
}

EthQuery.prototype.getBlockByHashWithUncles = function(blockHash, cb){
  const self = this
  self.getBlockByHash(blockHash, function(err, block){
    if (err) return cb(err)
    if (!block) return cb(null, null)
    var count = block.uncles.length
    async.times(count, function(index, cb){
      self.getUncleByBlockHashAndIndex(blockHash, ethUtil.intToHex(index), cb)
    }, function(err, uncles){
      if (err) return cb(err)
      block.uncles = uncles
      cb(null, block)
    })
  })
}

EthQuery.prototype.getBlockByNumberWithUncles = function(blockNumber, cb){
  const self = this
  self.getBlockByNumber(blockNumber, function(err, block){
    if (err) return cb(err)
    if (!block) return cb(null, null)
    var count = block.uncles.length
    async.times(count, function(index, cb){
      self.getUncleByBlockHashAndIndex(block.hash, ethUtil.intToHex(index), cb)
    }, function(err, uncles){
      if (err) return cb(err)
      block.uncles = uncles
      cb(null, block)
    })
  })
}


EthQuery.prototype.getLatestBlockNumber = function(cb){
  const self = this
  self.getLatestBlock(function(err, result){
    if (err) return cb(err)
    cb(null, result.number)
  })
}

EthQuery.prototype.getLatestBlock = function(cb){
  const self = this
  self.getBlockByNumber('latest', true, cb)
}


//
// base queries
//

// default block 
EthQuery.prototype.getBalance =                          generateFnWithDefaultBlockFor(2, 'eth_getBalance')
EthQuery.prototype.getCode =                             generateFnWithDefaultBlockFor(2, 'eth_getCode')
EthQuery.prototype.getTransactionCount =                 generateFnWithDefaultBlockFor(2, 'eth_getTransactionCount')
EthQuery.prototype.getStorageAt =                        generateFnWithDefaultBlockFor(3, 'eth_getStorageAt')
EthQuery.prototype.call =                                generateFnWithDefaultBlockFor(2, 'eth_call')
// standard
EthQuery.prototype.protocolVersion =                     generateFnFor('eth_protocolVersion')
EthQuery.prototype.syncing =                             generateFnFor('eth_syncing')
EthQuery.prototype.coinbase =                            generateFnFor('eth_coinbase')
EthQuery.prototype.mining =                              generateFnFor('eth_mining')
EthQuery.prototype.hashrate =                            generateFnFor('eth_hashrate')
EthQuery.prototype.gasPrice =                            generateFnFor('eth_gasPrice')
EthQuery.prototype.accounts =                            generateFnFor('eth_accounts')
EthQuery.prototype.blockNumber =                         generateFnFor('eth_blockNumber')
EthQuery.prototype.getBlockTransactionCountByHash =      generateFnFor('eth_getBlockTransactionCountByHash')
EthQuery.prototype.getBlockTransactionCountByNumber =    generateFnFor('eth_getBlockTransactionCountByNumber')
EthQuery.prototype.getUncleCountByBlockHash =            generateFnFor('eth_getUncleCountByBlockHash')
EthQuery.prototype.getUncleCountByBlockNumber =          generateFnFor('eth_getUncleCountByBlockNumber')
EthQuery.prototype.sign =                                generateFnFor('eth_sign')
EthQuery.prototype.sendTransaction =                     generateFnFor('eth_sendTransaction')
EthQuery.prototype.sendRawTransaction =                  generateFnFor('eth_sendRawTransaction')
EthQuery.prototype.estimateGas =                         generateFnFor('eth_estimateGas')
EthQuery.prototype.getBlockByHash =                      generateFnFor('eth_getBlockByHash')
EthQuery.prototype.getBlockByNumber =                    generateFnFor('eth_getBlockByNumber')
EthQuery.prototype.getTransactionByHash =                generateFnFor('eth_getTransactionByHash')
EthQuery.prototype.getTransactionByBlockHashAndIndex =   generateFnFor('eth_getTransactionByBlockHashAndIndex')
EthQuery.prototype.getTransactionByBlockNumberAndIndex = generateFnFor('eth_getTransactionByBlockNumberAndIndex')
EthQuery.prototype.getTransactionReceipt =               generateFnFor('eth_getTransactionReceipt')
EthQuery.prototype.getUncleByBlockHashAndIndex =         generateFnFor('eth_getUncleByBlockHashAndIndex')
EthQuery.prototype.getUncleByBlockNumberAndIndex =       generateFnFor('eth_getUncleByBlockNumberAndIndex')
EthQuery.prototype.getCompilers =                        generateFnFor('eth_getCompilers')
EthQuery.prototype.compileLLL =                          generateFnFor('eth_compileLLL')
EthQuery.prototype.compileSolidity =                     generateFnFor('eth_compileSolidity')
EthQuery.prototype.compileSerpent =                      generateFnFor('eth_compileSerpent')
EthQuery.prototype.newFilter =                           generateFnFor('eth_newFilter')
EthQuery.prototype.newBlockFilter =                      generateFnFor('eth_newBlockFilter')
EthQuery.prototype.newPendingTransactionFilter =         generateFnFor('eth_newPendingTransactionFilter')
EthQuery.prototype.uninstallFilter =                     generateFnFor('eth_uninstallFilter')
EthQuery.prototype.getFilterChanges =                    generateFnFor('eth_getFilterChanges')
EthQuery.prototype.getFilterLogs =                       generateFnFor('eth_getFilterLogs')
EthQuery.prototype.getLogs =                             generateFnFor('eth_getLogs')
EthQuery.prototype.getWork =                             generateFnFor('eth_getWork')
EthQuery.prototype.submitWork =                          generateFnFor('eth_submitWork')
EthQuery.prototype.submitHashrate =                      generateFnFor('eth_submitHashrate')

// network level

EthQuery.prototype.sendAsync = function(opts, cb){
  const self = this
  self.currentProvider.sendAsync(createPayload(opts), function(err, response){
    err = err || response.error
    if (err) return cb(err)
    // console.log(opts, response)
    cb(null, response.result)
  })
}

// util

function generateFnFor(methodName){
  return function(){
    const self = this
    var args = [].slice.call(arguments)
    var cb = args.pop()
    self.sendAsync({
      method: methodName,
      params: args,
    }, cb)
  }
}

function generateFnWithDefaultBlockFor(argCount, methodName){
  return function(){
    const self = this
    var args = [].slice.call(arguments)
    var cb = args.pop()
    // set optional default block param
    if (args.length < argCount) args.push('latest')
    self.sendAsync({
      method: methodName,
      params: args,
    }, cb)
  }
}

function createPayload(data){
  return extend({
    // defaults
    id: createRandomId(),
    jsonrpc: '2.0',
    params: [],
    // user-specified
  }, data)
}

function createRandomId(){
  const extraDigits = 3
  // 13 time digits
  var datePart = new Date().getTime()*Math.pow(10, extraDigits)
  // 3 random digits
  var extraPart = Math.floor(Math.random()*Math.pow(10, extraDigits))
  // 16 digits
  return datePart+extraPart
}