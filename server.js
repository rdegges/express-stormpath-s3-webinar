"use strict";

const express = require("express");
const multer = require("multer");
const stormpath = require("express-stormpath");
const stormpathS3 = require("express-stormpath-s3");

let app = express();

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "/tmp/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
let upload = multer({ storage: storage });

app.set("view engine", "pug");

app.use(stormpath.init(app, {
  client: {
    apiKey: {
      id: process.env.STORMPATH_CLIENT_APIKEY_ID,
      secret: process.env.STORMPATH_CLIENT_APIKEY_SECRET
    }
  },
  application: {
    href: process.env.STORMPATH_APPLICATION_HREF
  },
  expand: {
    customData: true
  }
}));
app.use(stormpath.getUser);
app.use(stormpathS3({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsBucket: "express-stormpath-s3"
}));

app.get("/", stormpath.loginRequired, (req, res) => {
  res.render("files", { files: req.user.customData.s3 });
});

app.post("/", stormpath.loginRequired, upload.single("file"), (req, res, next) => {
  let fileName = req.file.originalname;
  let path = req.file.path;

  req.user.uploadFile(path, "public-read", (err) => {
    if (err) {
      return next(err);
    }

    res.render("files", { files: req.user.customData.s3 });
  });
});

app.post("/delete", stormpath.loginRequired, (req, res, next) => {
  if (!req.query.filename) {
    return res.redirect("/");
  }

  req.user.deleteFile(req.query.filename, (err) => {
    if (err) {
      return next(err);
    }

    res.redirect("/");
  });
});

app.listen(3000);
