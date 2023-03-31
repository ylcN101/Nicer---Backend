const orderService = require('./order.service.js')
const socketService = require('../../services/socket.service.js')

const logger = require('../../services/logger.service')

async function getOrders(req, res) {
  try {
    logger.debug('Getting Orders')
    const filterBy = {
      title: req.query.title || '',
      orderId: req.query.orderId || '',
    }
    const orders = await orderService.query(filterBy)
    res.json(orders)
  } catch (err) {
    logger.error('Failed to get orders', err)
    res.status(500).send({ err: 'Failed to get orders' })
  }
}

async function getOrderById(req, res) {
  try {
    const orderId = req.params.id
    const order = await orderService.getById(orderId)
    res.json(order)
  } catch (err) {
    logger.error('Failed to get order', err)
    res.status(500).send({ err: 'Failed to get order' })
  }
}

async function addOrder(req, res) {
  try {
    const order = req.body
    console.log('order', order)
    const addedOrder = await orderService.add(order)
    res.json(addedOrder)
  } catch (err) {
    logger.error('Failed to add order', err)
    res.status(500).send({ err: 'Failed to add order' })
  }
}

async function updateOrder(req, res) {
  try {
    const order = req.body
    const updatedOrder = await orderService.update(order)
    res.json(updatedOrder)
    socketService.broadcastUserUpdate({
      productName: order.title,
      type: 'add',
      userId: order.owner._id,
    })
  } catch (err) {
    logger.error('Failed to update order', err)
    res.status(500).send({ err: 'Failed to update order' })
  }
}

async function removeOrder(req, res) {
  try {
    const orderId = req.params.id
    await orderService.remove(orderId)
    res.end()
  } catch (err) {
    logger.error('Failed to remove order', err)
    res.status(500).send({ err: 'Failed to remove order' })
  }
}

module.exports = {
  getOrders,
  getOrderById,
  addOrder,
  updateOrder,
  removeOrder,
}
