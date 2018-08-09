module.exports = (app, db) => {
  app.get("/login", (req, res) => {
    let onlineUsers = 0

    db.get("members.members").value().map((member) => {
      if (member.isOnline) {
        onlineUsers++;
      }
    });

    res.render("login", {config: db.get("config").value(), online: onlineUsers, games: db.get("games").size().value(), members: db.get("members.members").size().value()});
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

      res.render("home", { user: req.user, games: games, players: db.get("members.members").map("name").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), onlineUsers: onlineUsers, serverMessages: db.get("serverMessages").value(), config: db.get("config").value() });
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
    if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
      db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
    }

    if (!req.user) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else if (!req.query.id) {
      res.render("messages", { user: req.user, messages: db.get("members.members").find({ name: req.user.name }).get("messages").value(), players: db.get("members.members").map("name").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), config: db.get("config").value() });
    } else {
      let message = db.get("members.members").find({ name: req.user.name }).get("messages").find({ id: Number(req.query.id) }).value();

      if (message) {
        if (db.get("members.members").find({ name: req.user.name }).get("notifications.messages").find({ id: Number(req.query.id) }).value()) {
          db.get("members.members").find({ name: req.user.name }).get("notifications.messages").remove({ id: Number(req.query.id) }).write();
        }

        res.render("viewMessage", { message: message.message, from: message.from, id: message.id, user: req.user, messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), config: db.get("config").value() })
      } else {
        res.redirect("/")
      }
    }
  });

  app.get("/profile/:id", (req, res) => {
    if (!req.user || !req.params.id) {
      res.redirect("/login");
    } else if (req.user.pending) {
      res.redirect("/accountPending");
    } else {
      if (!db.get("members.members").find({ name: req.user.name }).get("isOnline").value()) {
        db.get("members.members").find({ name: req.user.name }).assign({ isOnline: true, lastVisited: Date.now() }).write();
      }

      let profileUser = db.get("members.members").find({ name: req.params.id }).value();

      res.render("profile", { games: db.get("games").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), user: req.user, profile: profileUser, config: db.get("config").value() });
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

      res.render("editProfile", { games: db.get("games").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), user: req.user, profile: db.get("members.members").find({ name: req.user.name }).value(), config: db.get("config").value() });
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

      res.render("viewGames", { games: db.get("games").value(), messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), user: req.user, config: db.get("config").value() });
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

      res.render("game", { game: game, user: req.user, messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), config: db.get("config").value() });
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

        let pendingAccounts = [];
        let activeAccounts = [];
        let accounts = db.get("members.members").value();

        accounts.map((account) => {
          if (account.pending) {
            pendingAccounts.push(account);
          } else {
            activeAccounts.push(account);
          }
        });

        res.render("admin", { user: req.user, messageNotificationsLength: db.get("members.members").find({ name: req.user.name }).get("notifications.messages").size().value(), pendingAccounts: pendingAccounts, accounts: activeAccounts, serverMessages: db.get("serverMessages").value(), config: db.get("config").value() });
      } else {
        res.redirect("/");
      }
    }
  });

  app.get("/createAccount", (req, res) => {
    res.render("createAccount", {config: db.get("config").value()});
  });

  app.get("/accountPending", (req, res) => {
    res.send("<h2 class='m-3 text-center'>Your account is still pending approval. You will be able to use your account as soon as an administrator approves it</h2>");
  });
}