const path = require("path");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const Tesseract = require("tesseract.js");

const app = express();

const PORT = 8000;

const server = require("http").createServer(app);
app.use(cors({ origin: "http://localhost:3000" }));
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Connected with socket id ", socket.id);
});

app.use(express.urlencoded({ extended: false }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("image"), (req, res) => {
  Tesseract.recognize(req.file.path, "eng", {
    logger: (m) => {
      console.log(m);
      if (m.status === "recognizing text") {
        io.emit("progress", m.progress);
      }
    },
  })
    .then(({ data: { text } }) => {
      const parsedCandidates = parseOCRResult(text);
      console.log("About to send result");
      res.json(parsedCandidates);
    })
    .catch((error) => {
      console.error("Error processing image with Tesseract:", error);
      res
        .status(500)
        .json({ error: "An error occurred while processing the image" });
    });
});

const parseOCRResult = (text) => {
  const lines = text.split("\n");
  const candidates = [];

  let person1 = {};
  let person2 = {};
  let person3 = {};

  lines.forEach((line, lineNumber) => {
    if (line.includes("Name :") || line.includes("Nama :")) {
      const nameArray = line.split(/Name\s*:\s* |Nama\s*:\s*/);
      person1.name = nameArray[1];
      person2.name = nameArray[2];
      person3.name = nameArray[3];
    } else if (
      line.includes("Fathers Name:") ||
      line.includes("Husbands Name:")
    ) {
      const fatherHusbandNameArray = line.split(
        /Fathers Name\s*:\s*|Husbands Name\s*:\s*/
      );
      person1.fname = fatherHusbandNameArray[1];
      person2.fname = fatherHusbandNameArray[2];
      person3.fname = fatherHusbandNameArray[3];
    } else if (line.includes("Age :") || line.includes("Age")) {
      // Define the regular expression pattern
      const pattern = /Age\s*:\s*(\d+)\s*Gender\s*:\s*([^\s]*)/g;
      let results =
        line.split(/Age[^\d]+/) ||
        line.split(/Age[^\d]:/) ||
        line.split(/Aga[^\d]+/) ||
        line.split(/Aga[^\d]:/);
      // clean the results
      results = results
        .map((item) => item.replace(" Gender :", "").trim())
        .filter((i) => i.length);

      for (let i = 0; i < results.length; i++) {
        const ageArray = results[i].split(" ");
        if (i === 0) {
          person1.age = ageArray[0];
          person1.gender = ageArray[1];
        }
        if (i === 1) {
          person2.age = ageArray[0];
          person2.gender = ageArray[1];
        }
        if (i === 2) {
          person3.age = ageArray[0];
          person3.gender = ageArray[1];
        }
      }
    } else if (line.includes("House Number :")) {
      const addressArray = line.split(/House Number\s*:\s*|House Number\s*/);
      console.log("Area === ", addressArray);

      for (let i = 1; i < addressArray.length; i++) {
        const results = addressArray[i].split("Photo");
        if (i === 1) {
          person1.address = results[0];
        }
        if (i === 2) {
          person2.address = results[0];
        }
        if (i === 3) {
          person3.address = results[0];
        }
      }
    } else if (line.includes("Available Available Available")) {
      candidates.push({ ...person1 });
      candidates.push({ ...person2 });
      candidates.push({ ...person3 });

      Object.keys(person1).forEach((key) => {
        delete person1[key];
      });
      Object.keys(person2).forEach((key) => {
        delete person2[key];
      });
      Object.keys(person3).forEach((key) => {
        delete person3[key];
      });
    }
  });

  return candidates;
};

server.listen(PORT, () => console.log("Server started at port 8000"));
