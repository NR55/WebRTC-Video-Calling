const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");
const User = require("./src/loginSchema.js");

const connect = mongoose.connect("mongodb://localhost:27017");

async function connectionEstb() {
  connect
    .then(() => {
      console.log("Users Database connected successfully.");
      return;
    })
    .catch(() => {
      console.log("Users Database cannot be connected successfully.");
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
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect("/login");
};

app.get("/register", (req, res) => {
  res.render("register.ejs", { error: "" });
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render("register.ejs", {
        error: "Username or email already exists",
      });
    }
    const newUser = new User({ username, email, password });
    const saltRounds = 10;
    newUser.password = await bcrypt.hash(newUser.password, saltRounds);
    await newUser.save();
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
  else res.render("login.ejs", { error: "" });
});

app.post("/login", async (req, res) => {
  let { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        req.session.isAuthenticated = true;
        res.redirect("/");
      } else {
        res.render("login.ejs", { error: "Invalid username or password" });
      }
    } else {
      res.render("login.ejs", { error: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Error occurred during login:", error);
    res.render("login.ejs", {
      error: "An error occurred, please try again later",
    });
  }
});

app.get("/create", isAuthenticated, (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/lobby", isAuthenticated, (req, res) => {
  res.render("lobby.ejs");
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/login");
  });
});

app.get("/:room", isAuthenticated, (req, res) => {
  res.render("room.ejs", { roomId: req.params.room });
});

app.get("/", isAuthenticated, (req, res) => {
  res.render("lobby.ejs");
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-connected", userId);
  });
  socket.on("disconnect", (roomId, userId) => {
    socket.broadcast.to(roomId).emit("user-disconnected", userId);
  });
});

async function main() {
  await connectionEstb();
  const port = 3000;
  server.listen(3000);
  console.log(`Server is listening on port ${port}`);
}

main();
