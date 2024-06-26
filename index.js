// Import packages
const express = require('express')
const bodyParser = require('body-parser')
const leaderboard = require('./routes/leaderboard.js')
const player = require('./routes/players.js')
const home = require('./routes/home.js')
const potatoes = require('./routes/potatoes.js')

// Middlewares
const app = express()
app.set('view engine', 'pug')

app.use(express.json())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Routes
app.use('/', leaderboard)
app.use('/', potatoes)
app.use('/', player)
app.use('/', home)

// Connection
const port = process.env.PORT || 9001
app.listen(port, () => console.log(`Listening to port ${port}`))
