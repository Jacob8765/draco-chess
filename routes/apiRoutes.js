module.exports = (app, db, bcrypt, passport) => {
  var formidable = require('formidable');
  var fs = require("fs");

  app.post('/api/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/');
  });

  app.post("/api/gameMove", (req, res) => {
    if (req.user) {
      if (db.get("games").find({ gameId: Number(req.body.gameId) }).get("w").value() == req.user.name || db.get("games").find({ gameId: Number(req.body.gameId) }).get("b").value() == req.user.name) {
        // validate move?
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
        let id = Math.floor(100000000000000 + Math.random() * 90000000000000);
        let isUnique = true;
        let games = db.get("games").value();

        games.map((game) => {
          if (game.gameId == id) {
            isUnique = false;
          }
        });

        if (isUnique) {
          db.get("games").push({
            gameId: id,
            dateCreated: "7/10/18",
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
            dateEnds: Date.now() + req.body.time,
            drawRequested: false,
            drawRequestedBy: null
          }).write();

          res.json({ status: 200, id: id.toString() });
        } else {
          res.sendStatus(409);
        }
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/acceptChallenge", (req, res) => {
    if (req.user) {
      if (db.get("games").find({ gameId: Number(req.body.id) }).get("w").value() == req.user.name || db.get("games").find({ gameId: Number(req.body.id) }).get("b").value() == req.user.name) {
        if (db.get("games").find({ gameId: Number(req.body.id) }).get("challenger").value() !== req.user.name) {
          db.get("games").find({ gameId: Number(req.body.id) }).assign({ isChallenge: false }).write();
          res.sendStatus(200);
        } else {
          res.sendStatus(401);
        }
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/declineChallenge", (req, res) => {
    if (req.user) {
      if (db.get("games").find({ gameId: Number(req.body.id) }).get("w").value() == req.user.name || db.get("games").find({ gameId: Number(req.body.id) }).get("b").value() == req.user.name) {
        db.get("games").remove({ gameId: Number(req.body.id) }).write();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/gameChat", (req, res) => {
    if (req.user) {
      if (db.get("games").find({ gameId: Number(req.body.id) }).get("w").value() == req.user.name || db.get("games").find({ gameId: Number(req.body.id) }).get("b").value() == req.user.name) {
        db.get('games').find({ gameId: req.body.id }).get("messages").push({ user: req.user.name, message: req.body.message }).write();
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
      let id = Math.floor(100000000000000 + Math.random() * 90000000000000);

      db.get("members.members").find({ name: req.body.to }).get("notifications.messages").push({ id: id }).write();
      db.get("members.members").find({ name: req.body.to }).get("messages").push({ from: req.user.name, date: "7/22/18", message: req.body.message, id: id }).write();

      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/deleteMessage", (req, res) => {
    if (req.user) {
      if (db.get("members.members").find({ name: req.user.name }).get("messages").find({ id: Number(req.body.id) }).value()) {
        db.get("members.members").find({ name: req.user.name }).get("messages").remove({ id: Number(req.body.id) }).write();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/updateProfile", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else {
      if (req.user.isAdmin) {
        db.get("members.members").find({name: req.body.name, id: Number(req.body.id)}).get("profile").assign({realName: req.body.realName, location: req.body.location, aboutMe: req.body.aboutMe}).write();
        db.get("members.members").find({name: req.body.name, id: Number(req.body.id)}).assign({name: req.body.username}).write();
        res.redirect("/admin");
      } else {
        try {
          var form = new formidable.IncomingForm();
          var oldpath;
          var newpath;
          var currentProfile = db.get("members.members").find({ name: req.user.name }).get("profile.picture").value();
          var extention = currentProfile.substring(currentProfile.length - 4);

          form.parse(req, function (err, fields, files) {
            db.get("members.members").find({ name: req.user.name }).get("profile").assign({ aboutMe: fields.aboutMe, realName: fields.realName, location: fields.location }).write();

            if (files.profilePic.name) {
              if (fs.statSync(files.profilePic.path).size / 1000000 < db.get("config.profilePicMaxSize").value()) {

                if (currentProfile == "/profile/" + req.user.name + extention) {
                  fs.unlink(__dirname.replace("routes", "public/profile/") + req.user.name + extention, (err) => {
                    if (err) console.log(err);
                  });
                }

                let profilePath = "/profile/" + req.user.name + files.profilePic.name.substring(files.profilePic.name.length - 4);
                db.get("members.members").find({ name: req.user.name }).get("profile").assign({ picture: profilePath }).write();

                newpath = __dirname.replace("routes", "public/profile/") + req.user.name + files.profilePic.name.substring(files.profilePic.name.length - 4);
                oldpath = files.profilePic.path;

                fs.copyFile(oldpath, newpath, (err) => {
                  if (err) console.log(err);
                });
              }

              fs.unlink(files.profilePic.path, (err) => {
                if (err) console.log(err);
              });
            }
          });

          res.redirect("/profile/" + req.user.name);
        } catch (err) {
          console.log(err);
          res.redirect("/profile/" + req.user.name);
        }
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
              db.get("games").find({ gameId: Number(req.body.id) }).assign({ isOver: true, winner: db.get("games").find({ gameId: Number(req.body.id) }).get("w").value() == req.user.name ? db.get("games").find({ gameId: Number(req.body.id) }).get("b").value() : db.get("games").find({ gameId: Number(req.body.id) }).get("w").value() }).write();
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
    let hash = bcrypt.hashSync(req.body.password, 10);
    let id = Math.floor(10000000000000000000 + Math.random() * 9000000000000000000);

    if (!db.get("members.members").find({id: id}).value() && !db.get("members.members").find({name: req.body.username})) {
      db.get("members.members").push(
        {
          name: req.body.username,
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          dateJoined: new Date(Date.now()).toLocaleDateString("en-US"),
          password: hash,
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
          pending: db.get("config.requireApproval").value(),
          id: id
        }
      ).write();
    } else {
      res.sendStatus(409);
    }

    res.redirect("/login");
  });

  app.post("/api/acceptMember", (req, res) => {
    if (req.user) {
      if (req.user.isAdmin) {
        db.get("members.members").find({ name: req.body.name, id: Number(req.body.id) }).assign({ pending: false }).write();
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });

  app.post("/api/deleteMember", (req, res) => {
    if (req.user) {
      if (req.user.isAdmin) {
        db.get("members.members").remove({ name: req.body.name, id: Number(req.body.id) }).write();
        res.sendStatus(200);
      } else {
        db.get("members.members").remove({ name: req.user.name }).write();
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
        db.get("config").assign({ siteName: req.body.siteName, profilePicMaxSize: req.body.upload, requireApproval: (req.body.requireApproval ? true : false) }).write();
        res.redirect("/admin");
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(401);
    }
  });
}