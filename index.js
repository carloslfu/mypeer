/* Mypeer

API:

- createOffer
- 

*/

// --- proof

function p (fn) {
  return function () {
    let args = Array.prototype.slice.call(arguments)
    return new Promise((resolve, reject) => {
      args.push((err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
      return fn.apply(null, args)
    })
  }
}

var config = {
  iceServers: [
    { url: 'stun:23.21.150.121' },
  ],
}

var sdpConstraints = {
  optional: [],
  mandatory: {
    // OfferToReceiveAudio: true,
    // OfferToReceiveVideo: true
  }
}

var peer1 = create(config, sdpConstraints)
addDataChannel(peer1)
peer.dataChannel.onopen = () => console.log('data channel connect')
peer.dataChannel.onmessage = ev => console.log('Peer1 Got message', ev.data)

var peer2 = create(config, sdpConstraints)
addDataChannel(peer2)
peer.dataChannel.onopen = () => console.log('data channel connect')
peer.dataChannel.onmessage = ev => console.log('Peer2 Got message', ev.data)

p(createOffer)(peer1, 'messages')
  .then(offer => p(connect)(peer2, offer))
  .then(answer => {
    setRemote(peer1, answer)
    sendMessage(peer1, 'Hello Peer2')
    sendMessage(peer2, 'Hello Peer1')
  })

// --- Library

// Creation and config
function create (configDef, sdpConstraintsDef) {
  var con = { 'optional': [{'DtlsSrtpKeyAgreement': true}] }
  var config = configDef ? configDef : {
    iceServers: [
      { url: 'stun:23.21.150.121' },
    ],
  }
  var sdpConstraints = sdpConstraintsDef ? sdpConstraintsDef : {
    optional: [],
    mandatory: {},
  }

  var peer = new RTCPeerConnection(config, con)

  peer.con = con
  peer.config = config
  peer.sdpConstraints = sdpConstraints

  // listeners


  peer.onconnection = () => {

  }

  peer.onsignalingstatechange = state => {
    console.info('signaling state change:', state)
  }

  peer.oniceconnectionstatechange = state => {
    console.info('ice connection state change:', state)
  }

  peer.onicegatheringstatechange = state => {
    console.info('ice gathering state change:', state)
  }

  peer.ondatachannel = function (e) {
    peer.datachannel = e.channel || e // Chrome sends event, FF sends raw channel, TODO: investigate it
    console.log('Received datachannel', arguments)
    peer.datachannel.onopen = function (e) {
      console.log('data channel connect')
    }
    peer.datachannel.onmessage = function (e) {
      console.log('Got message', e.data)
    }
  }

  return peer
}

// --- API

function createOffer (peer, channelName, cb) {
  peer.onicecandidate = ev => {
    if (ev.candidate == null) {
      cb(null, JSON.stringify(peer.localDescription))
    }
  }
  // create offer
  peer.createOffer(
    desc => peer.setLocalDescription(desc, function () {}, function () {}),
    () => cb({ message: 'Couldn\'t create offer' }),
    peer.sdpConstraints
  )
}

function addDataChannel (peer, cb) {
  peer.dataChannel = peer.createDataChannel(channelName, { reliable: true })
}

// connect a peer to another via offer
function connect (peer, offer, cb) {
  var offerDesc = new RTCSessionDescription(JSON.parse(offer))
  console.log('Received remote offer', offerDesc)
  peer.setRemoteDescription(offerDesc)
  peer.onicecandidate = ev => {
    if (ev.candidate == null) {
      cb(null, JSON.stringify(peer.localDescription))
    }
  }
  peer.createAnswer(
    answerDesc => peer.setLocalDescription(answerDesc),
    () => cb({ message: 'Couldn\'t create offer'}),
    peer.sdpConstraints
  )
}

// Answer received

function setRemote (peer, answer) {
  var answerDesc = new RTCSessionDescription(JSON.parse(answer))
  peer.setRemoteDescription(answerDesc)  
}

function sendMessage (peer, message) {
  peer.datachannel.send(message)
}
