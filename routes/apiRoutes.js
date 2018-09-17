module.exports = (app, db, bcrypt, passport) => {
  var formidable = require('formidable');
  var fs = require("fs");

  app.post('/api/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/');
  });

  app.post("/api/gameMove", (req, res) => {
    if (req.user) {
      let game = db.get("games").find({ gameId: Number(req.body.gameId) }).value()

      if (game[game.currentTurn] == req.user.name) {
        db.get('games').find({ gameId: Number(req.body.gameId) }).assign({ fen: req.body.fen, currentTurn: req.body.currentTurn }).write();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/gameChallenge", (req, res) => {
    if (req.user) {
      if (req.body.opponent !== req.user.name) {
        let dateCreated = Date.now();

        db.get("games").push({
          gameId: null,
          dateCreated: dateCreated,
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          w: req.user.name,
          b: req.body.opponent,
          currentTurn: "w",
          winner: null,
          messages: [],
          wTime: req.body.time,
          bTime: req.body.time,
          isOver: false,
          isChallenge: true,
          challenger: req.user.name,
          dateFinished: null,
          dateEnds: dateCreated + req.body.time,
          drawRequested: false,
          drawRequestedBy: null
        }).write();

        res.json({ status: 200, dateCreated: dateCreated })
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/acceptChallenge", (req, res) => {
    if (req.user) {
      db.get("games").find({ dateCreated: Number(req.body.dateCreated), isChallenge: true }).assign({ gameId: db.get("games").filter({ isChallenge: false }).size().value() + 1, dateCreated: Date.now(), isChallenge: false }).write();
      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/declineChallenge", (req, res) => {
    if (req.user) {
      db.get("games").remove({ dateCreated: Number(req.body.dateCreated) }).write();
      res.sendStatus(200)
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/gameChat", (req, res) => {
    if (req.user) {
      if (db.get("games").find({ gameId: Number(req.body.id) }).get("w").value() == req.user.name || db.get("games").find({ gameId: Number(req.body.id) }).get("b").value() == req.user.name) {
        db.get('games').find({ gameId: req.body.id }).get("messages").push({ user: req.user.name, message: req.body.message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }).write();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/sendMessage", (req, res) => {
    if (req.user) {
      let id = db.get("members.members").find({ name: req.body.to }).get("messages.messages").size().value() + 1;

      db.get("members.members").find({ name: req.body.to }).get("notifications.messages").push({ id: id }).write();
      db.get("members.members").find({ name: req.body.to }).get("messages.messages").push({ from: req.user.name, date: Date.now(), message: req.body.message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), id: id, deleted: false }).write();

      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/deleteMessage", (req, res) => {
    if (req.user) {
      if (db.get("members.members").find({ name: req.user.name }).get("messages.messages").find({ id: Number(req.body.id) }).value()) {
        db.get("members.members").find({ name: req.user.name }).get("messages.messages").find({ id: Number(req.body.id) }).assign({ deleted: true }).write();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/saveMessage", (req, res) => {
    if (req.user) {
      let message = db.get("members.members").find({ id: req.user.id }).get("messages.messages").find({ id: Number(req.body.id) }).value();

      message.id = db.get("members.members").find({ id: req.user.id }).get("messages.savedMessages").size().value() + 1;
      db.get("members.members").find({ id: req.user.id }).get("messages.savedMessages").push(message).write();
      db.get("members.members").find({ id: req.user.id }).get("messages.messages").find({ id: Number(req.body.id) }).assign({ deleted: true }).write();
      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/deleteSavedMessage", (req, res) => {
    if (req.user) {
      db.get("members.members").find({ id: req.user.id }).get("messages.savedMessages").find({ id: Number(req.body.id) }).assign({ deleted: true }).write();

      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/updateProfile", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else {
      if (req.user.isAdmin) {
        db.get("members.members").find({ name: req.body.name, id: Number(req.body.id) }).get("profile").assign({ realName: req.body.realName, location: req.body.location, aboutMe: req.body.aboutMe }).write();
        res.redirect("/admin");
      } else {
        var form = new formidable.IncomingForm();
        var oldpath;
        var newpath;
        var currentProfile = db.get("members.members").find({ id: req.user.id }).get("profile.picture").value();
        var extention;

        form.parse(req, function (err, fields, files) {
          db.get("members.members").find({ name: req.user.name }).get("profile").assign({ aboutMe: fields.aboutMe, realName: fields.realName, location: fields.location }).write();
          extention = files.profilePic.name.substring(files.profilePic.name.length - 4);

          if (files.profilePic.name) {
            if (fs.statSync(files.profilePic.path).size / 1000000 < db.get("config.profilePicMaxSize").value()) {
              if (extention && ".jpg" || extention == ".png" || extention == ".gif") {
                newpath = __dirname.replace("routes", "public/profile/") + req.user.name + extention;
                oldpath = files.profilePic.path;

                if (fs.existsSync(__dirname.replace("routes", "public") + newpath)) {
                  console.log("File exists");
                  fs.unlink(__dirname.replace("routes", "public") + newpath, (err) => {
                    if (err) console.log(err);
                  });
                }

                db.get("members.members").find({ id: req.user.id }).get("profile").assign({ picture: "/profile/" + req.user.name + extention }).write();

                fs.copyFile(oldpath, newpath, (err) => {
                  if (err) console.log(err);
                });
              }

              fs.unlink(oldpath, (err) => {
                if (err) console.log(err);
              });
            }
          }
        });

        res.redirect("/profile/" + req.user.name);
      }
    }
  });

  app.post("/api/gameEvent", (req, res) => {
    if (req.user) {
      if (!db.get("games").find({ gameId: Number(req.body.id) }).get("isOver").value()) {
        if (db.get("games").find({ gameId: Number(req.body.id) }).get("w").value() == req.user.name || db.get("games").find({ gameId: Number(req.body.id) }).get("b").value() == req.user.name) {
          switch (req.body.event) {
            case "checkmate":
              db.get("games").find({ gameId: Number(req.body.id) }).assign({ isOver: true, winner: db.get("games").find({ gameId: Number(req.body.id) }).get("currentTurn").value() == "w" ? db.get("games").find({ gameId: Number(req.body.id) }).get("b").value() : db.get("games").find({ gameId: Number(req.body.id) }).get("w").value(), dateFinished: Date.now() }).write();
              break;
            case "requestDraw":
              db.get("games").find({ gameId: Number(req.body.id) }).assign({ drawRequested: true, drawRequestedBy: req.user.name }).write();
              break;
            case "acceptDraw":
              if (db.get("games").find({ gameId: Number(req.body.id) }).get("drawRequestedBy").value() !== req.user.name) {
                db.get("games").find({ gameId: Number(req.body.id) }).assign({ isOver: true, winner: "draw", dateFinished: Date.now() }).write();
              }
              break;
            case "revokeDraw":
              db.get("games").find({ gameId: Number(req.body.id) }).assign({ drawRequested: false, drawRequestedBy: null }).write();
              break;
            case "resign":
              db.get("games").find({ gameId: Number(req.body.id) }).assign({ isOver: true, dateFinished: Date.now(), winner: db.get("games").find({ gameId: Number(req.body.id) }).get("w").value() == req.user.name ? db.get("games").find({ gameId: Number(req.body.id) }).get("b").value() : db.get("games").find({ gameId: Number(req.body.id) }).get("w").value() }).write();
              break;
          }
        }
      }

      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  });

  app.post("/api/createAccount", (req, res) => {
    if (db.get("members.members").find({ name: req.body.username }).value()) {
      res.json({ error: "That username has already been taken." });
    } else if (/[^A-Za-z0-9]+/g.test(req.body.username)) {
      res.json({ error: "A username can only contain letters and numbers." });
    } else if (!/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.email)) {
      res.json({ error: "Make sure you entered a valid email address." });
    } else if (/[^A-Za-z]+/g.test(req.body.firstName)) {
      res.json({ error: "Make sure you entered a valid first name." });
    } else if (/[^A-Za-z]+/g.test(req.body.lastName)) {
      res.json({ error: "Make sure you entered a valid last name." });
    } else if (req.body.password !== req.body.confirmPassword) {
      res.json({ error: "Make sure your passwords match." });
    } else {

      let hash = bcrypt.hashSync(req.body.password, 10);

      db.get("members.members").push(
        {
          name: req.body.username,
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          dateJoined: Date.now(),
          password: hash,
          messages: [],
          notifications: { messages: [] },
          isAdmin: false,
          lastVisited: 0,
          isOnline: false,
          deactivated: false,
          profile: {
            picture: "/profile/default.jpg",
            aboutMe: "",
            realName: "",
            location: "",
          },
          pending: db.get("config.requireApproval").value(),
          id: db.get("config.requireApproval").value() ? db.get("members.members").size().value() + 1 : null,
          club: {
            status: null,
            name: null
          }
        }
      ).write();

      res.sendStatus(200);
    }
  });

  app.post("/api/acceptMember", (req, res) => {
    if (req.user) {
      if (req.user.isAdmin) {
        db.get("members.members").find({ name: req.body.name }).assign({ pending: false, id: db.get("members.members").size().value() + 1 }).write();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/deactivateMember", (req, res) => {
    if (req.user) {
      if (req.user.isAdmin) {
        if (db.get("members.members").find({ id: Number(req.body.id) }).get("club.status").value() == "owner") {
          db.get("clubs").remove({ owner: Number(req.body.id) }).write();
          db.get("members.members").value().map((member) => {
            if (member.club.name == db.get("members.members").find({ id: Number(req.body.id) }).get("club.name").value()) {
              db.get("members.members").find({ id: member.id }).get("club").assign({ status: null, name: null }).write();
            }
          })
        }

        db.get("members.members").find({ name: req.body.name }).assign({ deactivated: true, club: { status: null, name: null } }).write();
        res.sendStatus(200);
      } else {
        if (db.get("members.members").find({ id: req.user.id }).get("club.status").value() == "owner") {
          db.get("clubs").remove({ owner: req.user.id }).write();
          db.get("members.members").value().map((member) => {
            if (member.club.name == db.get("members.members").find({ id: req.user.id }).get("club.name").value()) {
              db.get("members.members").find({ id: member.id }).get("club").assign({ status: null, name: null }).write();
            }
          })
        }

        db.get("members.members").find({ id: req.user.id }).assign({ deactivated: true, club: { status: null, name: null } }).write();
        res.sendStatus(200);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/changePassword", (req, res) => {
    if (req.user) {
      let hash = bcrypt.hashSync(req.body.password, 10);

      if (req.user.isAdmin) {
        db.get("members.members").find({ name: req.body.name, id: Number(req.body.id) }).assign({ password: hash }).write();
        res.sendStatus(200);
      } else {
        bcrypt.compare(req.body.existingPassword, req.user.password, function (err, response) {
          if (response) {
            db.get("members.members").find({ name: req.user.name }).assign({ password: hash }).write();
            res.sendStatus(200);
          } else {
            res.sendStatus(401);
          }
        });
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/serverMessage", (req, res) => {
    if (req.user) {
      if (req.user.isAdmin) {
        db.get("serverMessages").assign({ date: new Date(Date.now()).toLocaleDateString("en-US"), message: req.body.message }).write();
        res.redirect("/admin");
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/updateConfig", (req, res) => {
    if (req.user) {
      if (req.user.isAdmin) {
        if (!req.body.chessClubs) {
          if (db.get("config.chessClubs").value()) {
            db.get("members.members").value().map(member => db.get("members.members").find({ id: member.id }).get("club").assign({ name: null, status: null }).write());
            db.assign({ clubs: [] }).write();
          }
        }

        db.get("config").assign({ siteName: req.body.siteName, profilePicMaxSize: req.body.upload, requireApproval: (req.body.requireApproval ? true : false), chessClubs: (req.body.chessClubs ? true : false) }).write();
        db.get("config").assign({ gameTimes: [] }).write();

        for (let i = 0; i < 3; i++) {
          db.get("config.gameTimes").push({ text: req.body["text" + i], milliseconds: req.body["milliseconds" + i] }).write();
        }

        res.redirect("/admin");
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/createClub", (req, res) => {
    if (req.user) {
      if (/[^A-Za-z\s0-9]+/g.test(req.body.name)) {
        res.json({ error: "A club name can only contain letters and numbers." });
      } else if (req.body.name.length <= 0) {
        res.json({ error: "A club name can not be left blank." });
      } else {
        if (db.get("config.chessClubs").value()) {
          db.get("clubs").push({
            name: req.body.name,
            owner: req.user.id,
            dateCreated: Date.now(),
            text: "",
            hits: 0,
            members: []
          }).write();

          db.get("members.members").find({ name: req.user.name }).get("club").assign({ status: "owner", name: req.body.name }).write();
          res.sendStatus(200);
        } else {
          res.sendStatus(401);
        }
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/joinClub", (req, res) => {
    if (req.user) {
      if (db.get("clubs").find({ name: req.body.clubName }).value()) {
        if (!db.get("members.members").find({ id: req.user.id }).get("club.status").value()) {
          db.get("clubs").find({ name: req.body.clubName }).get("members").push({ name: req.user.name, pending: true }).write();
          db.get("members.members").find({ id: req.user.id }).get("club").assign({ status: "pending", name: req.body.clubName, link: db.get("clubs").find({ name: req.body.clubName }).get("link").value() }).write();
        }
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/updateClubText", (req, res) => {
    if (req.user) {
      if (db.get("members.members").find({ id: req.user.id }).get("club.status").value() == "owner") {
        db.get("clubs").find({ owner: req.user.id }).assign({ text: req.body.clubText }).write();
        res.redirect("/manageClub");
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/acceptClubMember", (req, res) => {
    if (req.user) {
      if (db.get("members.members").find({ id: req.user.id }).get("club.status").value() == "owner") {
        db.get("clubs").find({ owner: req.user.id }).get("members").find({ name: req.body.name }).assign({ pending: false }).write();
        db.get("members.members").find({ name: req.body.name }).get("club").assign({ status: "member" }).write();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/leaveClub", (req, res) => {
    if (req.user) {
      if (db.get("members.members").find({ id: req.user.id }).get("club.status").value() == "member") {
        db.get("clubs").find({ name: db.get("members.members").find({ id: req.user.id }).get("club.name").value() }).get("members").remove({ name: req.user.name }).write();
        db.get("members.members").find({ id: req.user.id }).get("club").assign({ status: null, name: null, link: "" }).write();
        res.sendStatus(200);
      } else if (db.get("members.members").find({ id: req.user.id }).get("club.status").value() == "owner") {
        db.get("clubs").remove({ owner: req.user.id }).write();
        db.get("members.members").value().map((member) => {
          if (member.club.name == db.get("members.members").find({ id: req.user.id }).get("club.name").value() && member.id !== req.user.id) {
            db.get("members.members").find({ id: member.id }).get("club").assign({ status: null, name: null, link: "" }).write();
          }
        })
        db.get("members.members").find({ id: req.user.id }).get("club").assign({ status: null, name: null, link: "" }).write();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });
}