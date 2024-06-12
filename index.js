require("dotenv").config();
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

function createToken(user) {
  const token = jwt.sign(
    {
      email: user.email,
    },
    "secret",
    { expiresIn: "7d" }
  );
  return token;
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  const verify = jwt.verify(token, "secret");
  if (!verify?.email) {
    return res.send("You are not authorized");
  }
  req.user = verify.email;
  next();
}

const uri = process.env.DATABASE_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const taskManagement = client.db("task-management");
    const userCollection = taskManagement.collection("users");
    const tasksCollection = taskManagement.collection("tasks");

    // task
    app.post("/tasks", async (req, res) => {
      const tasksData = req.body;
      const result = await tasksCollection.insertOne(tasksData);
      res.send(result);
    });

    app.get("/tasks", async (req, res) => {
      const filter = req.query;
      let query = {};

      if (filter.search) {
        query = {
          $or: [
            {
              title: {
                $regex: filter.search,
                $options: "i",
              },
            },
            {
              brand: {
                $regex: filter.search,
                $options: "i",
              },
            },
            {
              price: {
                $regex: filter.search,
                $options: "i",
              },
            },
          ],
        };
      }

      try {
        const tasksData = tasksCollection.find(query);
        const result = await tasksData.toArray();
        res.status(200).json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while fetching tasks." });
      }
    });

    app.get("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const tasksData = await tasksCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(tasksData);
    });

    app.patch("/tasks/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await tasksCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.send(result);
    });

    app.delete("/tasks/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // user
    app.post("/users", async (req, res) => {
      const user = req.body;

      const token = createToken(user);
      const isUserExist = await userCollection.findOne({ email: user?.email });
      if (isUserExist?._id) {
        return res.send({
          statu: "success",
          message: "Login success",
          token,
        });
      }
      await userCollection.insertOne(user);
      return res.send({ token });
    });

    app.get("/users/get/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await userCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });

    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const userData = req.body;
      const result = await userCollection.updateOne({ email }, { $set: userData }, { upsert: true });
      res.send(result);
    });

    console.log("Database is connected");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Route is working");
});

app.listen(port, (req, res) => {
  console.log("App is listening on port :", port);
});
