const dbService = require('../../services/db.service')
const logger = require('../../services/logger.service')
const utilService = require('../../services/util.service')
const socketService = require('../../services/socket.service')
const ObjectId = require('mongodb').ObjectId

async function query(filterBy = {}) {
  try {
    const criteria = _buildCriteria(filterBy)

    const collection = await dbService.getCollection('order')
    var orders = await collection.find(criteria).toArray()

    return orders
  } catch (err) {
    logger.error('cannot find orders', err)
    throw err
  }
}

async function getById(orderId) {
  try {
    const collection = await dbService.getCollection('order')
    const order = collection.findOne({ _id: ObjectId(orderId) })
    return order
  } catch (err) {
    logger.error(`while finding order ${orderId}`, err)
    throw err
  }
}

async function remove(orderId) {
  try {
    const collection = await dbService.getCollection('order')
    await collection.deleteOne({ _id: ObjectId(orderId) })
    return orderId
  } catch (err) {
    logger.error(`cannot remove order ${orderId}`, err)
    throw err
  }
}

async function add(order) {
  try {
    let collection = await dbService.getCollection('order')
    let addedOrder = await collection.insertOne(order)
    addedOrder = addedOrder.ops[0]
    addedOrder.createdAt = ObjectId(addedOrder._id).getTimestamp()

    return addedOrder
  } catch (err) {
    logger.error('cannot insert order', err)
    throw err
  }
}

async function update(order) {
  try {
    const orderToSave = {
      status: order.status,
    }
    const collection = await dbService.getCollection('order')
    await collection.updateOne(
      { _id: ObjectId(order._id) },
      { $set: orderToSave }
    )
    // socketService.emitToUser({
    //   type: 'order-status-changed',
    //   data: orderToSave,
    //   userId: order.buyer._id,
    // })

    return orderToSave
  } catch (err) {
    logger.error(`cannot update order ${orderId}`, err)
    throw err
  }
}

async function addOrderMsg(orderId, msg) {
  try {
    msg.id = utilService.makeId()
    const collection = await dbService.getCollection('order')
    await collection.updateOne(
      { _id: ObjectId(orderId) },
      { $push: { msgs: msg } }
    )
    return msg
  } catch (err) {
    logger.error(`cannot add order msg ${orderId}`, err)
    throw err
  }
}

async function removeOrderMsg(orderId, msgId) {
  try {
    const collection = await dbService.getCollection('order')
    await collection.updateOne(
      { _id: ObjectId(orderId) },
      { $pull: { msgs: { id: msgId } } }
    )
    return msgId
  } catch (err) {
    logger.error(`cannot add order msg ${orderId}`, err)
    throw err
  }
}

function _buildCriteria(
  filterBy = {
    title: '',
    orderId: '',
  }
) {
  const criteria = {}
  if (filterBy.title) {
    criteria.title = { $regex: filterBy.title, $options: 'i' }
  }
  if (filterBy.orderId) {
    criteria.orderId = { $regex: filterBy.orderId, $options: 'i' }
  }
  return criteria
}

module.exports = {
  remove,
  query,
  getById,
  add,
  update,
  addOrderMsg,
  removeOrderMsg,
}
