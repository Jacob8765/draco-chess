var express = require("express");
var socket = require("socket.io");
var passport = require("passport");
var session = require("express-session");
var bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public/'));
app.use(session({ secret: 'thisisasecretkey', saveUninitialized: false, resave: false })); // session secret

app.use(passport.initialize());
app.use(passport.session());

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

const port = process.env.PORT || 8000;

require('./config/passport')(passport, db, bcrypt);
require("./routes/routes")(app, db);
require("./routes/apiRoutes")(app, db, bcrypt, passport);
require('./config/dbDefaults')(db);

setInterval(() => {
  let games = db.get("games").value();
  let members = db.get("members.members").value();

  members.map((member) => {
    if (db.get("members.members").find({ name: member.name }).get("isOnline").value()) {
      if (member.lastVisited + 900000 < Date.now()) {
        db.get("members.members").find({ name: member.name }).assign({ isOnline: false }).write();
      }
    }
  });

  games.map((game) => {
    if (!game.isOver && !game.isChallenge) {
      db.get("games").find({ gameId: game.gameId }).set(game.currentTurn + "Time", game[game.currentTurn + "Time"] - 1000).write();

      if (game[game.currentTurn + "Time"] <= 0) {
        db.get("games").find({ gameId: game.gameId }).assign({ isOver: true, winner: (game.currentTurn == "w" ? game.b : game.w), dateFinished: Date.now() }).write();
      }
    }
  });
}, 1000)

var server = app.listen(port, () => {
  console.log("Listening on port 8000");
});

var io = socket(server);
io.on('connection', (socket) => {

  socket.on('move', function (data) {
    io.sockets.emit('move', data);
  });

  socket.on('chat', function (data) {
    io.sockets.emit('chat', data);
  });

  socket.on("message", (data) => {
    io.sockets.emit("message", data);
  });
});
