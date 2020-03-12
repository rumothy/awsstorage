const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const fs = require("fs");
const keys = require("./keys.js");
const PORT = process.env.PORT || 3001;
const app = express();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

AWS.config.update({
  accessKeyId: keys.iam_access_id,
  secretAccessKey: keys.iam_secret,
  region: keys.bucket_region
});

const s3 = new AWS.S3();

app.post("/post_file", upload.single("demo_file"), function(req, res) {
  uploadFile(req.file.path, req.file.filename, res);
});

app.get("/", (req, res) => {
  res.send("awsstorage running...");
});

app.get("/get_file/:file_name", (req, res) => {
  retrieveFile(req.params.file_name, res);
});

// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/requests-using-stream-objects.html
app.get("/play_file/:filename", (req, res) => {
  const getParams = {
    Bucket: keys.bucket_name,
    Key: req.params.filename
  };
  let s3Stream = s3.getObject(getParams).createReadStream();
  s3Stream.on("error", err => {
    console.error(err);
  });

  s3Stream
    .pipe(res)
    .on("error", err => {
      console.error("File Stream:", err);
    })
    .on("close", () => {
      console.log("Done.");
    });
});

function uploadFile(source, targetName, res) {
  console.log("preparing to upload...");
  fs.readFile(source, function(err, filedata) {
    if (!err) {
      const putParams = {
        Bucket: keys.bucket_name,
        Key: targetName,
        Body: filedata
      };
      s3.putObject(putParams, function(err, data) {
        if (err) {
          console.log("Could not upload the file", err);
          return res.send({ success: false });
        } else {
          fs.unlink(source, () => {});
          console.log("Successfully uploaded the file");
          return res.send({ success: true });
        }
      });
    } else {
      console.log({ err: err });
    }
  });
}

function retrieveFile(filename, res) {
  const getParams = {
    Bucket: keys.bucket_name,
    Key: filename
  };
  s3.getObject(getParams, function(err, data) {
    if (err) {
      return res.status(400).send({ success: false, err: err });
    } else {
      return res.send(data.Body);
    }
  });
}

app.listen(PORT, function() {
  console.log(`🌎  ==> API Server now listening on PORT ${PORT}!`);
});
