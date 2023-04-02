const dbService = require("../../services/db.service");
const logger = require("../../services/logger.service");
const utilService = require("../../services/util.service");
const ObjectId = require("mongodb").ObjectId;

async function query(filterBy) {
  try {
    const criteria = _buildCriteria(filterBy);
    console.log(criteria);
    const collection = await dbService.getCollection("gig");
    var gigs = await collection.find(criteria).toArray();
    console.log(gigs);
    return gigs;
  } catch (err) {
    logger.error("cannot find gigs", err);
    throw err;
  }
}

async function getById(gigId) {
  try {
    const collection = await dbService.getCollection("gig");
    const gig = collection.findOne({ _id: ObjectId(gigId) });
    return gig;
  } catch (err) {
    logger.error(`while finding gig ${gigId}`, err);
    throw err;
  }
}

async function remove(gigId) {
  try {
    const collection = await dbService.getCollection("gig");
    await collection.deleteOne({ _id: ObjectId(gigId) });
    return gigId;
  } catch (err) {
    logger.error(`cannot remove gig ${gigId}`, err);
    throw err;
  }
}

async function add(gig) {
  try {
    const collection = await dbService.getCollection("gig");
    await collection.insertOne(gig);
    return gig;
  } catch (err) {
    logger.error("cannot insert gig", err);
    throw err;
  }
}

async function update(gig) {
  try {
    const gigToSave = {
      title: gig.title,
      price: gig.price,
    };
    const collection = await dbService.getCollection("gig");
    await collection.updateOne({ _id: ObjectId(gig._id) }, { $set: gigToSave });
    return gig;
  } catch (err) {
    logger.error(`cannot update gig ${gigId}`, err);
    throw err;
  }
}

async function addGigMsg(gigId, msg) {
  try {
    msg.id = utilService.makeId();
    const collection = await dbService.getCollection("gig");
    await collection.updateOne(
      { _id: ObjectId(gigId) },
      { $push: { msgs: msg } }
    );
    return msg;
  } catch (err) {
    logger.error(`cannot add gig msg ${gigId}`, err);
    throw err;
  }
}

async function removeGigMsg(gigId, msgId) {
  try {
    const collection = await dbService.getCollection("gig");
    await collection.updateOne(
      { _id: ObjectId(gigId) },
      { $pull: { msgs: { id: msgId } } }
    );
    return msgId;
  } catch (err) {
    logger.error(`cannot add gig msg ${gigId}`, err);
    throw err;
  }
}

function _buildCriteria(
  filterBy = {
    title: "",
    minPrice: 0,
    maxPrice: 100000,
    daysToDeliver: 0,
    categoryId: "",
    owner: null,
  }
) {
  const { title, minPrice, maxPrice, daysToDeliver, categoryId, owner } =
    filterBy;
  const criteria = {};
  if (title) {
    criteria.title = { $regex: new RegExp(title, "i") };
  }
  if (minPrice) {
    criteria.price = { $gte: +minPrice };
  }
  if (maxPrice) {
    criteria.price = { $lte: +maxPrice };
  }
  if (daysToDeliver) {
    criteria.daysToDeliver = { $lte: +daysToDeliver };
    if (daysToDeliver === "any") {
      delete criteria.daysToDeliver;
    }
  }
  if (categoryId) {
    criteria.categories = { $elemMatch: { $eq: categoryId } };
  }

  if (minPrice && maxPrice) {
    criteria.price = { $gte: +minPrice, $lte: +maxPrice };
  }

  return criteria;
}

module.exports = {
  remove,
  query,
  getById,
  add,
  update,
  addGigMsg,
  removeGigMsg,
};
