module.exports = (app, db) => {
  app.get("/login", (req, res) => {
    let onlineUsers = 0

    db.get("members.members").value().map((member) => {
      if (member.isOnline) {
        onlineUsers++;
      }
    });

    res.render("login", { config: db.get("config").value(), online: onlineUsers, games: db.get("games").filter({ isChallenge: false }).size().value(), members: db.get("members.members").size().value() });
  });

  app.get("/", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else {
      if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
        db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
      }

      let onlineUsers = []
      let members = db.get("members.members").value();

      members.map((member) => {
        if (member.isOnline) {
          onlineUsers.push(member.name);
        }
      });

      let games = [];
      let gamesDb = db.get("games").value();

      for (var i = 0; i < gamesDb.length; i++) {
        if (gamesDb[i].w == req.user.name) {
          games.push(gamesDb[i]);
        } else if (gamesDb[i].b == req.user.name) {
          games.push(gamesDb[i]);
        }
      }

      res.render("home", { user: db.get("members.members").find({ id: req.user.id }).value(), games: games, players: db.get("members.members").map("name").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), onlineUsers: onlineUsers, serverMessages: db.get("serverMessages").value(), config: db.get("config").value() });
    }
  });

  app.get("/logout", (req, res) => {
    if (req.user && db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
      db.get("members.members").find({ name: req.user.name }).assign({ isOnline: false }).write();
    }

    req.logout();
    res.redirect("/login");
  });

  app.get("/messages", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else {
      if (req.user.pending) {
        res.redirect("/accountPending");
      } else if (!req.query.id) {
        if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
          db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
        }

        res.render("messages", { user: db.get("members.members").find({ id: req.user.id }).value(), messages: db.get("members.members").find({ id: req.user.id }).get("messages.messages").value(), savedMessages: db.get("members.members").find({ id: req.user.id }).get("messages.savedMessages").value(), players: db.get("members.members").map("name").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), config: db.get("config").value() });
      } else {
        if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
          db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
        }

        let message = db.get("members.members").find({ name: req.user.name }).get("messages.messages").find({ id: Number(req.query.id) }).value();

        if (message) {
          if (db.get("members.members").find({ name: req.user.name }).get("notifications.messages").find({ id: Number(req.query.id) }).value()) {
            db.get("members.members").find({ name: req.user.name }).get("notifications.messages").remove({ id: Number(req.query.id) }).write();
          }

          res.render("viewMessage", { message: message.message, from: message.from, id: message.id, user: db.get("members.members").find({ id: req.user.id }).value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), config: db.get("config").value() })
        } else {
          res.redirect("/")
        }
      }
    }
  });

  app.get("/profile/:name", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else {
      if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
        db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
      }

      let profileUser = db.get("members.members").find({ name: req.params.name }).value();

      if (profileUser) {
        res.render("profile", { games: db.get("games").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), user: db.get("members.members").find({ id: req.user.id }).value(), profile: profileUser, config: db.get("config").value() });
      } else {
        res.redirect("/");
      }
    }
  });

  app.get("/editProfile", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else {
      if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
        db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
      }

      res.render("editProfile", { games: db.get("games").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), user: db.get("members.members").find({ name: req.user.name }).value(), profile: db.get("members.members").find({ name: req.user.name }).value(), config: db.get("config").value(), clubs: db.get("clubs").value() });
    }
  });

  app.get("/games", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else {
      if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
        db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
      }

      res.render("viewGames", { games: db.get("games").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), user: db.get("members.members").find({ id: req.user.id }).value(), config: db.get("config").value() });
    }
  });

  app.get("/game", (req, res) => {
    let game = db.get("games").find({ gameId: Number(req.query.id) }).value();

    if (!req.query.id || !req.user || !game) {
      res.redirect("/");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else if (game.w == req.user.name || game.b == req.user.name) {
      if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
        db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
      }

      res.render("game", { game: game, user: db.get("members.members").find({ id: req.user.id }).value(), white: db.get("members.members").find({ name: game.w }).value(), black: db.get("members.members").find({ name: game.b }).value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), config: db.get("config").value() });
    } else {
      res.redirect("/");
    }
  });

  app.get("/admin", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else {
      if (req.user.isAdmin) {
        if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
          db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
        }

        res.render("admin", { user: db.get("members.members").find({ id: req.user.id }).value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), pendingAccounts: db.get("members.members").filter({pending: true}).value(), accounts: db.get("members.members").filter({pending: false, deactivated: false}).value(), serverMessages: db.get("serverMessages").value(), config: db.get("config").value() });
      } else {
        res.redirect("/");
      }
    }
  });

  app.get("/createAccount", (req, res) => {
    res.render("createAccount", { config: db.get("config").value() });
  });

  app.get("/accountPending", (req, res) => {
    if (req.user) {
      if (req.user.pending) {
        res.send("<h2 class='m-3 text-center'>Your account is still pending approval. You will be able to use your account as soon as an administrator approves it</h2>");
      } else {
        res.redirect("/");
      }
    } else {
      res.redirect("/login");
    }
  });

  app.get("/clubs", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else {
      if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
        db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
      }

      res.render("chessClubs", { clubs: db.get("clubs").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), user: db.get("members.members").find({ id: req.user.id }).value(), config: db.get("config").value() });
    }
  });

  app.get("/clubs/:clubLink", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else {
      if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
        db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
      }

      db.get("clubs").find({ link: req.params.clubLink }).assign({ hits: db.get("clubs").find({ link: req.params.clubLink }).get("hits").value() + 1 }).write();
      let club = db.get("clubs").find({ link: req.params.clubLink }).value();

      if (club) {
        res.render("viewClub", { club: db.get("clubs").find({ link: req.params.clubLink }).value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), user: db.get("members.members").find({ id: req.user.id }).value(), config: db.get("config").value() });
      } else {
        res.redirect("/");
      }
    }
  });

  app.get("/manageClub", (req, res) => {
    if (!req.user) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else {
      if (db.get("members.members").find({ id: req.user.id }).get("club.status").value() == "owner" || db.get("members.members").find({ id: req.user.id }).get("club.status").value() == "member") {
        if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
          db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
        }

        let club;

        if (db.get("members.members").find({ id: req.user.id }).get("club.status").value() == "owner") {
          club = db.get("clubs").find({ owner: req.user.id }).value();
        } else {
          club = db.get("clubs").find({ name: db.get("members.members").find({ id: req.user.id }).get("club.name").value() }).value();
        }

        res.render("manageClub", { club: club, messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), user: db.get("members.members").find({ id: req.user.id }).value(), config: db.get("config").value() });
      } else {
        res.redirect("/")
      }
    }
  });
}