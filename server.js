const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const User = require("./src/loginSchema.js");
const Rooms = require("./src/roomsSchema.js");

const connect = mongoose.connect("mongodb://localhost:27017");

async function connectionEstb() {
  connect
    .then(() => {
      console.log("Database connected successfully.");
      return;
    })
    .catch(() => {
      console.log("Database cannot be connected successfully.");
      return;
    });
}

app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.static("src"));

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  res.redirect("/login");
};

app.get("/register", (req, res) => {
  res.render("register.ejs", { error: "" });
});

app.post("/register", async (req, res) => {
  const { username, email, password, premiumOutput, upiID } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render("register.ejs", {
        error: "Username or email already exists",
      });
    }
    const premium = (premiumOutput == "true") ? true : false;
    const newUser = new User({ username, email, password, premium });
    const saltRounds = 10;
    newUser.password = await bcrypt.hash(newUser.password, saltRounds);
    await newUser.save();
    req.session.username = newUser.user;
    req.session.isAuthenticated = true;
    res.redirect("/");
  } catch (error) {
    console.error("Error occurred during registration:", error);
    res.render("register.ejs", {
      error: "An error occurred, please try again later",
    });
  }
});

app.get("/login", (req, res) => {
  if (req.session.isAuthenticated) res.redirect("/");
  else res.render("login.ejs", { error: "", username: "" });
});

app.post("/login", async (req, res) => {
  let { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        req.session.isAuthenticated = true;
        req.session.username = username;
        res.redirect("/");
      } else {
        res.render("login.ejs", { error: "Invalid username or password", username: username });
      }
    } else {
      res.render("login.ejs", { error: "Invalid username or password", username: "" });
    }
  } catch (error) {
    console.error("Error occurred during login:", error);
    res.render("login.ejs", {
      error: "An error occurred, please try again later", username: ""
    });
  }
});

app.get("/roomLogin", isAuthenticated, (req, res) => {
  res.render("roomLogin.ejs", {error: ""});
});

app.post("/roomLogin", async (req, res) => {
  let { roomID, password } = req.body;
  try {
    const room = await Rooms.findOne({ roomName: roomID });
    if (room) {
      if (password==room.roomKey || !room.roomLocked) {
        res.redirect(`/${roomID}`); 
      } else {
        res.render("roomLogin.ejs", { error: "Invalid room key." });
      }
    } else {
      res.render("roomLogin.ejs", { error: "Invalid room ID." });
    }
  } catch (error) {
    console.error("Error occurred during login:", error);
    res.render("roomLogin.ejs", {
      error: "An error occurred, please try again later",
    });
  }
});

app.get("/lobby", isAuthenticated, (req, res) => {
  res.render("lobby.ejs", {username: req.session.username});
});

app.get("/profile", isAuthenticated, async (req, res) => {
  const user = await User.findOne({ username: req.session.username });
  const rooms = await Rooms.find({ creator_Username: req.session.username });
  res.render("profile.ejs", { username: req.session.username , email : user.email, message : "", rooms});
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/login");
  });
});

app.get("/create", isAuthenticated, async (req, res) => {
  const rooms = await Rooms.find({ creator_Username: req.session.username });
  const user = await User.findOne({ username: req.session.username });
  if (user.premium) {
    if (rooms.length >= 3)
      return res.render("profile.ejs", { username: req.session.username, email: user.email, message: "Room Limit reached.", rooms });
  }
  else if (rooms.length >= 2)
    return res.render("profile.ejs", { username: req.session.username, email: user.email, message: "Room Limit reached.", rooms });
  res.render("create.ejs", { error: "" });
});

app.post("/create", async (req, res) => {
  const { roomName, adminPassword, description, roomLockedOutput, roomKey } = req.body;
  try {
    const rooms = await Rooms.find({ creator_Username: req.session.username });
    const user = await User.findOne({ username: req.session.username });
    if(user.premium){
      if (rooms.length >= 3)
        return res.render("profile.ejs", { username: req.session.username, email: user.email, message: "Room Limit reached.", rooms });
    }
    else if (rooms.length >= 2)
      return res.render("profile.ejs", { username: req.session.username, email: user.email, message: "Room Limit reached.", rooms });
    const existingRoom = await Rooms.findOne({roomName});
    if (existingRoom) {
      return res.render("create.ejs", {
        error: "Room already exists",
      });
    }
    const roomLocked=(roomLockedOutput=="true")?true:false;
    const username=req.session.username;
    const currDate=new Date();
    const newRoom = new Rooms({ roomName, creation: currDate, creator_Username : username, adminPassword, description, roomLocked, roomKey });
    const saltRounds = 10;
    newRoom.adminPassword = await bcrypt.hash(adminPassword, saltRounds);
    await newRoom.save();
    req.session.isAuthenticated = true;
    res.redirect(`/${roomName}`);
  } catch (error) {
    console.error("Error occurred during registration:", error);
    res.render("create.ejs", {
      error: "An error occurred, please try again later",
    });
  }
});

app.get("/:room", isAuthenticated, async (req, res) => {
  res.render("room.ejs", { roomId: req.params.room , username: req.session.username});
});

app.post("/delete/:room", isAuthenticated, async (req, res) => {
  Rooms.deleteOne({roomName: req.params.room})
  const user = await User.findOne({ username: req.session.username });
  const deletionResult = await Rooms.deleteOne({ roomName: req.params.room });
  const rooms = await Rooms.find({ creator_Username: req.session.username });
  if (deletionResult.deletedCount === 1) {
    res.render("profile.ejs", { username: req.session.username, email: user.email, message: `${req.params.room} successfully deleted.`, rooms });
  } else {
    // res.render("profile.ejs", { username: req.session.username, email: user.email, message: `Room ${req.params.room} not found.`, rooms });
    res.redirect("/profile");
  }
});

app.get("/", isAuthenticated, (req, res) => {
  res.render("lobby.ejs", { username: req.session.username });
});

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId, username) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit('user-connected', { userId, username });

    socket.on('send-chat-message', message => {
      io.to(roomId).emit('chat-message', message);
    });

    socket.on('disconnect', () => {
      io.to(roomId).emit('user-disconnected', {userId, username});
    });
  });
});


async function main() {
  await connectionEstb();
  const port = 3000;
  server.listen(3000);
  console.log(`Server is listening on port ${port} : http://localhost:${port}`);
}

main();
