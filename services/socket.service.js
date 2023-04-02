const logger = require('./logger.service')

var gIo = null

const msgs = []

function setupSocketAPI(http) {
  gIo = require('socket.io')(http, {
    cors: {
      origin: '*',
    },
  })
  gIo.on('connection', (socket) => {
    logger.info(`New connected socket [id: ${socket.id}]`)

    socket.on('set-user-socket', (userId) => {
      socket.userId = userId
      logger.info(`Socket ${socket.id} is now connected to user ${userId}`)
    })

    socket.on('chat-set-topic', (topic) => {
      if (socket.myTopic === topic) return
      if (socket.myTopic) {
        socket.leave(socket.myTopic)
        logger.info(
          `Socket is leaving topic ${socket.myTopic} [id: ${socket.id}]`
        )
      }
      socket.myTopic = topic
      socket.emit(
        'chat-history',
        msgs.filter((msg) => msg.myTopic === socket.myTopic)
      )
      socket.join(topic)
      return
    })

    socket.on('join-chat', (nickname) => {
      socket.nickname = nickname
      socket.isNew = true

      logger.info(`${socket.nickname} joined a chat - [id: ${socket.id}]`)

      return
    })

    socket.on('user-watch', async (user) => {
      logger.info(
        `user-watch from socket [id: ${socket.id}], on user ${user.username}`
      )
      socket.join('watching:' + user.username)

      const toSocket = await _getUserSocket(user._id)
      if (toSocket)
        toSocket.emit(
          'user-is-watching',
          `Hey ${user.username}! A user is watching your gig right now.`
        )
      return
    })

    socket.on('gig-ordered', async (gig) => {
      logger.info(
        `gig-ordered from socket [id: ${socket.id}], on gig ${gig._id}`
      )
      socket.join('watching:' + gig.owner.username)
      socket.emit(
        'order-approved',
        `Hey ${socket.username}! \nYour order is being processed. stay tuned.`
      )

      const toSocket = await _getUserSocket(gig.owner._id)
      if (toSocket)
        toSocket.emit(
          'user-ordered-gig',
          `Hey ${gig.owner.username}! \nA user has just ordered one of your gigs right now.`
        )
      return
    })

    socket.on('order-change-status', async (buyer) => {
      logger.info(
        `order-change-status from socket [id: ${socket.id}], on user ${buyer.username}`
      )
      socket.join('watching:' + buyer.username)

      const toSocket = await _getUserSocket(buyer._id)
      if (toSocket)
        toSocket.emit(
          'order-status-changed',
          `Hey ${buyer.username}! \nYour order status has been changed.`
        )

      return
    })

    socket.on('unset-user-socket', () => {
      logger.info(`Removing socket.userId for socket [id: ${socket.id}]`)
      delete socket.userId
      return
    })

    socket.userId = socket.on('disconnect', (socket) => {
      logger.info(`Socket disconnected [id: ${socket.id}]`)
    })
  })
}

function emitTo({ type, data, label }) {
  if (label) gIo.to('watching:' + label.toString()).emit(type, data)
  else gIo.emit(type, data)
}

async function emitToUser({ type, data, userId }) {
  // userId = userId.toString()
  console.log('userId', userId)
  const socket = await _getUserSocket(userId)

  if (socket) {
    logger.info(
      `Emiting event: ${type} to user: ${userId} socket [id: ${socket.id}]`
    )
    socket.emit(type, data)
  } else {
    logger.info(`No active socket for user: ${userId}`)
    // _printSockets()
  }
}

// If possible, send to all sockets BUT not the current socket
// Optionally, broadcast to a room / to all
async function broadcast({ type, data, room = null, userId }) {
  userId = userId.toString()

  logger.info(`Broadcasting event: ${type}`)
  const excludedSocket = await _getUserSocket(userId)
  if (room && excludedSocket) {
    logger.info(`Broadcast to room ${room} excluding user: ${userId}`)
    excludedSocket.broadcast.to(room).emit(type, data)
  } else if (excludedSocket) {
    logger.info(`Broadcast to all excluding user: ${userId}`)
    excludedSocket.broadcast.emit(type, data)
  } else if (room) {
    logger.info(`Emit to room: ${room}`)
    gIo.to(room).emit(type, data)
  } else {
    logger.info(`Emit to all`)
    gIo.emit(type, data)
  }
}
async function broadcastUserUpdate({ productName, type, userId }) {
  return broadcast({
    type: 'admin-update',
    data: _getUserMsg(productName, type),
    userId: userId,
  })
}

function _getUserMsg(type) {
  let suffix = 'go check it out!'
  if (type === 'remove') suffix = 'it is no longer available.'
  return `Yuval has accepted your order!`
}

async function _getUserSocket(userId) {
  const sockets = await _getAllSockets()
  const socket = sockets.find((s) => s.userId === userId)
  return socket
}
async function _getAllSockets() {
  // return all Socket instances
  const sockets = await gIo.fetchSockets()
  return sockets
}

async function _printSockets() {
  const sockets = await _getAllSockets()
  console.log(`Sockets: (count: ${sockets.length}):`)
  sockets.forEach(_printSocket)
}
function _printSocket(socket) {
  console.log(`Socket - socketId: ${socket.id} userId: ${socket.userId}`)
}

module.exports = {
  // set up the sockets service and define the API
  setupSocketAPI,
  // emit to everyone / everyone in a specific room (label)
  emitTo,
  // emit to a specific user (if currently active in system)
  emitToUser,
  // Send to all sockets BUT not the current socket - if found
  // (otherwise broadcast to a room / to all)
  broadcast,
  broadcastUserUpdate,
}
