module.exports = function (db) {

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
          messages: {
            messages: [],
            savedMessages: []
          },
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
          deactivated: false,
          id: 1,
          club: {
            status: null,
            name: null,
          }
        },
        {
          name: "admin",
          email: "player2@example.com",
          firstName: "Frank",
          lastName: "Smith",
          dateJoined: new Date(Date.now()).toLocaleDateString("en-US"),
          password: "$2a$10$rleM.UPbml66e/Okd.xZFOzvnXGV29otv9W9AexN3/vrd99vlyQze",
          messages: {
            messages: [],
            savedMessages: []
          },
          notifications: { messages: [] },
          isAdmin: true,
          lastVisited: 0,
          isOnline: false,
          deactivated: false,
          profile: {
            picture: "/profile/default.jpg",
            aboutMe: "",
            realName: "",
            location: "",
          },
          pending: false,
          id: 2,
          club: {
            status: null,
            name: null,
          }
        }
      ],
    },
    games: [],
    clubs: [],

    serverMessages: { date: null, message: "" },

    config: {
      siteName: "DracoChess",
      profilePicMaxSize: 5,
      requireApproval: true,
      gameTimes: [
        {
          text: "Short (30 minutes)",
          milliseconds: 1800000
        },
        {
          text: "Normal (2 hours)",
          milliseconds: 7200000
        },
        {
          text: "Long (3 days)",
          milliseconds: 259200000
        }
      ]
    }
  }).write();
};