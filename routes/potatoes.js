const { BatchWriteItemCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb')
const { getClient } = require('./../src/database.js')
const { getPotatoesFromDb } = require('./../src/potatoesdb.js')
const express = require('express')
require('dotenv').config()

const router = express.Router()
const dbclient = getClient()

router.get('/potatoes', async function (req, res) {
  const [lastUpdate, potatoes] = await getPotatoesFromDb(dbclient)
  const sum = getPotatoesSum(potatoes)
  res.render('index', { objednavky: potatoes, sum, lastUpdate })
})

function getPotatoesSum (potatoes) {
  let result = 0
  for (const order of potatoes) {
    const numericPart = order.Mnozstvi.S.replace(/[^ 0-9]/g, '')
    if (numericPart && parseInt(numericPart)) {
      result += parseInt(numericPart)
    }
  }

  return result
}

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

  const batches = []
  while (deleteRequests.length > 0) {
    batches.push(deleteRequests.splice(0, 24))
  }

  for (const batch of batches) {
    const batchParams = {
      RequestItems: {
        Potatoes: batch
      }
    }
    console.log('BatchWriteItemCommand-DELETE==================')
    await dbclient.send(new BatchWriteItemCommand(batchParams))
    console.log('==============================================')
  }
}

router.post('/potatoes/update', async (req, res) => {
  await ClearTable()

  const itemArray = []
  itemArray.push({
    PutRequest: {
      Item: {
        Id: {
          N: '0'
        },
        LastUpdate: {
          S: req.body.LastUpdate
        }
      }
    }
  })

  if ('Datum' in req.body) {
    for (let i = 0; i < req.body.Datum.length; i++) {
      itemArray.push({
        PutRequest: {
          Item: {
            Id: {
              N: (i + 1).toString()
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
  }

  const batches = []
  while (itemArray.length > 0) {
    batches.push(itemArray.splice(0, 24))
  }

  for (const batch of batches) {
    const batchParams = {
      RequestItems: {
        Potatoes: batch
      }
    }
    console.log('BatchWriteItemCommand-PUT=====================')
    const response = await dbclient.send(new BatchWriteItemCommand(batchParams))
    console.log(JSON.stringify(response))
    console.log('==============================================')
  }

  res.send('POST request to update potatoes done.')
})

module.exports = router