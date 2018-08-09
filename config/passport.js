var LocalStrategy = require('passport-local').Strategy;

module.exports = function (passport, db, bcrypt) {

  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  passport.deserializeUser(function (user, done) {
    done(null, user);
  });

  passport.use(new LocalStrategy((username, password, done) => {
    if (db.get("members.members").find({name: username}).value()) {
      let user = db.get("members.members").find({name: username}).value();

      bcrypt.compare(password, user.password, function(err, res) {
        if (res) {
          done(null, user);
        } else {
          done(null, false);
        }
      });
    } else {
      done(null, false);
    }
  }));
};