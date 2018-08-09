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
app.use(passport.session()); // persistent login sessions

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

const port = process.env.PORT || 8000;

require('./config/passport')(passport, db, bcrypt);
require("./routes/routes")(app, db);
require("./routes/apiRoutes")(app, db, bcrypt, passport);

db.defaults({
  members: {
    members: [
      {
        name: "player1",
        email: "player1@example.com",
        firstName: "John",
        lastName: "Doe",
        dateJoined: new Date(Date.now()).toLocaleDateString("en-US"),
        password: "$2a$10$rleM.UPbml66e/Okd.xZFOzvnXGV29otv9W9AexN3/vrd99vlyQze",
        messages: [],
        notifications: { messages: [] },
        isAdmin: false,
        lastVisited: 0,
        isOnline: false,
        profile: {
          picture: "/profile/default.jpg",
          aboutMe: "",
          realName: "",
          location: "",
        },
        pending: false,
        id: Math.floor(10000000000000000000 + Math.random() * 9000000000000000000)
      },
      {
        name: "player2",
        email: "player2@example.com",
        firstName: "BK",
        lastName: "Phoney",
        dateJoined: new Date(Date.now()).toLocaleDateString("en-US"),
        password: "$2a$10$rleM.UPbml66e/Okd.xZFOzvnXGV29otv9W9AexN3/vrd99vlyQze",
        messages: [],
        notifications: { messages: [] },
        isAdmin: false,
        lastVisited: 0,
        isOnline: false,
        profile: {
          picture: "/profile/default.jpg",
          aboutMe: "",
          realName: "",
          location: "",
        },
        pending: false,
        id: Math.floor(10000000000000000000 + Math.random() * 9000000000000000000)
      },
      {
        name: "admin",
        email: "player2@example.com",
        firstName: "Buddy",
        lastName: "Smith",
        dateJoined: new Date(Date.now()).toLocaleDateString("en-US"),
        password: "$2a$10$rleM.UPbml66e/Okd.xZFOzvnXGV29otv9W9AexN3/vrd99vlyQze",
        messages: [],
        notifications: { messages: [] },
        isAdmin: true,
        lastVisited: 0,
        isOnline: false,
        profile: {
          picture: "/profile/default.jpg",
          aboutMe: "",
          realName: "",
          location: "",
        },
        pending: false,
        id: Math.floor(10000000000000000000 + Math.random() * 9000000000000000000)
      }
    ],
  },
  games: [],
  serverMessages: { date: null, message: "" },

  config: {
    siteName: "DracoChess",
    profilePicMaxSize: 5,
    requireApproval: true
  }
}).write();

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
