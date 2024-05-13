const { BatchWriteItemCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb')
const { getClient } = require('./../src/database.js')
const { getPotatoesFromDb } = require('./../src/potatoesdb.js')
const express = require('express')
require('dotenv').config()

const router = express.Router()
const dbclient = getClient()

router.get('/potatoes', async function (req, res) {
  const potatoes = await getPotatoesFromDb(dbclient)
  res.render('index', { objednavky: potatoes })
})

async function ClearTable () {
  let itemCount = -1
  const describeTableParams = {
    TableName: 'Potatoes'
  }

  // Execute DescribeTable operation to get table metadata including item count
  await dbclient.send(new DescribeTableCommand(describeTableParams))
    .then(data => {
      itemCount = data.Table.ItemCount + 1
    })

  const deleteRequests = []
  for (let i = 0; i < itemCount; i++) {
    deleteRequests.push({
      DeleteRequest: {
        Key: { Id: { N: i.toString() } }
      }
    })
  }

  // BatchWriteItem supports requests up to 25 items per call
  const batches = [] // Array to hold batches of delete requests
  while (deleteRequests.length > 0) {
    batches.push(deleteRequests.splice(0, 25)) // Split delete requests into batches of 25 or less
  }

  // Execute batch delete requests
  batches.forEach(async (batch) => {
    const batchParams = {
      RequestItems: {
        Potatoes: batch
      }
    }
    await dbclient.send(new BatchWriteItemCommand(batchParams))
  })
}

router.post('/potatoes/update', async (req, res) => {
  await ClearTable()

  const itemArray = []
  for (let i = 0; i < req.body.Datum.length; i++) {
    itemArray.push({
      PutRequest: {
        Item: {
          Id: {
            N: i.toString()
          },
          Datum: {
            S: req.body.Datum[i]
          },
          Mnozstvi: {
            S: req.body.Mnozstvi[i]
          },
          Nazev: {
            S: req.body.Nazev[i]
          },
          Objednavka: {
            S: req.body.Objednavka[i]
          }
        }
      }
    })
  }

  const batches = []
  while (itemArray.length > 0) {
    batches.push(itemArray.splice(0, 25))
  }

  // Execute batch delete requests
  batches.forEach(async (batch) => {
    const batchParams = {
      RequestItems: {
        Potatoes: batch
      }
    }
    await dbclient.send(new BatchWriteItemCommand(batchParams))
  })

  res.send('POST request to update potatoes done.')
})

module.exports = router
