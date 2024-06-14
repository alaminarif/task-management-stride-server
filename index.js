const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
var nodemailer = require("nodemailer");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://gamerl:LmwYybhisaurSQmq@cluster0.u6i9ya9.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const transporter = nodemailer.createTransport({
  service: "SendinBlue",
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SMTP_PASSWORD
  },
});
function sendMailToMember(newMember) {
  const { adminEmail, name, id, password, memberEmail } = newMember;
  transporter
    .sendMail({
      from: adminEmail,
      to: memberEmail,
      subject: `Your member id is ${id} and password is ${password}.`,
      text: `Your member id is ${id} and password is ${password}.`,
      html: `
      <div>
         <h1> Hello ${name}, </h1>
         <p>Congratulation!</p>
         <p>You are selected as a member of our team.</p>
         <p> Your member Id is ${id} and Password is ${password}.</p>
  
         <p>Hathazari, Chittagong.</p>
         <p>Bangladesh</p>
      </div>
    `,
    })
    .then((res) => console.log("Successfully sent", res))
    .catch((err) => console.log("Failed ", err));
}

const run = async () => {
  try {
    await client.connect();
    console.log("db connected");
    const adminsCollection = client.db("gameOfRL").collection("admins");
    const membersCollection = client.db("gameOfRL").collection("members");
    const tasksCollection = client.db("gameOfRL").collection("tasks");
    const forwardedTasksCollection = client.db("gameOfRL").collection("forwardedTasks");
    const teamsCollection = client.db("gameOfRL").collection("teams");
    const adminNotifications = client.db("gameOfRLNotifications").collection("adminNotifications");
    const adminNotificationsArchive = client.db("gameOfRLNotifications").collection("adminNotificationsArchive");
    const memberNotifications = client.db("gameOfRLNotifications").collection("memberNotifications");
    const memberNotificationsArchive = client.db("gameOfRLNotifications").collection("memberNotificationsArchive");

    // all notifications related to admins
    app.post("/notification-admin", async (req, res) => {
      const notification = req.body;
      const result = await adminNotifications.insertOne(notification);
      res.send(result);
    });
    app.post("/notification-archive-admin", async (req, res) => {
      const notification = req.body;
      const result = await adminNotificationsArchive.insertOne(notification);
      res.send(result);
    });

    app.get("/notification-admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { adminEmail: email };

      const cursor = adminNotifications.find(filter);
      const notification = await cursor.toArray();
      res.send(notification);
    });

    app.delete("/notification-clear/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { adminEmail: email };
      const result = await adminNotifications.deleteMany(filter);
      res.send(result);
    });
    // all notification codes related admins ended here
    // --------------------------------------------------
    // all notification related to the members started here
    app.post("/notification-member", async (req, res) => {
      const notification = req.body;
      const result = await memberNotifications.insertOne(notification);
      res.send(result);
    });
    app.post("/notification-archive-member", async (req, res) => {
      const notification = req.body;
      const result = await memberNotificationsArchive.insertOne(notification);
      res.send(result);
    });

    app.get("/notification-member/:id", async (req, res) => {
      const receivedId = req.params.id;

      const filter = { memberId: receivedId };

      const cursor = memberNotifications.find(filter);
      const notification = await cursor.toArray();
      res.send(notification);
    });
    app.delete("/notification-clear-member/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { memberId: id };
      const result = await memberNotifications.deleteMany(filter);
      res.send(result);
    });

    // all notification related to the members ended here

    app.get("/all-notification/:finder", async (req, res) => {
      const finder = req.params.finder;

      if (finder.includes("@")) {
        const filter = { adminEmail: finder };
        const cursor = adminNotificationsArchive.find(filter);
        const result = await cursor.toArray();
        res.send(result);
      } else {
        const filter = { memberId: finder };
        const cursor = memberNotificationsArchive.find(filter);
        const result = await cursor.toArray();
        res.send(result);
      }
    });

    app.get("/member-login/:id", async (req, res) => {
      const memberId = req.params.id;
      const query = { id: memberId };
      const member = await membersCollection.findOne(query);

      if (member) {
        return res.send(member);
      }

      return res.send({ message: "user not found" });
    });
    // add new member
    app.post("/add-new-member", async (req, res) => {
      const newMember = req.body;

      const memberId = newMember.id;
      const email = newMember.memberEmail;
      const filter = { id: memberId };
      const query = { memberEmail: email };
      const member = await membersCollection.findOne(filter);
      if (member) {
        return res.send({ message: "Id already used" });
      }
      const emailOwner = await membersCollection.findOne(query);
      if (emailOwner) {
        return res.send({ message: "Email is already used" });
      }
      const result = await membersCollection.insertOne(newMember);
      sendMailToMember(newMember);
      res.send(result);
    });
    // creating new team in db
    app.post("/create-team", async (req, res) => {
      const newTeam = req.body;
      const teamName = newTeam.teamName;
      const filter = { teamName: teamName };
      const team = await teamsCollection.findOne(filter);
      if (team) {
        return res.send({ message: "The team name is already taken! please try a new name!" });
      }
      const result = await teamsCollection.insertOne(newTeam);
      res.send(result);
    });

    app.get("/random-id-check/:id", async (req, res) => {
      const memberId = req.params.id;

      const filter = { id: memberId };

      const searchedId = await membersCollection.findOne(filter);
      if (searchedId) {
        return res.send({ message: "exist" });
      }
      res.send({ memberId });
    });

    app.post("/new-admin", async (req, res) => {
      const newAdmin = req.body;
      const result = await adminsCollection.insertOne(newAdmin);
      res.send(result);
    });

    app.put("/manage-attendance/present/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const data = {
        $set: {
          presentStatus: true,
        },
      };
      const result = await tasksCollection.updateOne(filter, data, options);
      res.send(result);
    });
    // add review
    app.put("/add-review", async (req, res) => {
      const memberId = req.query.memberId;
      const adminEmail = req.query.adminEmail;
      const body = req.body;

      const filter = {
        id: memberId,
        adminEmail: adminEmail,
      };
      const member = await membersCollection.findOne(filter);
      if (member === null) {
        return res.send({ message: "The ID does not match any of your teammates" });
      }
      const options = { upsert: true };
      const data = {
        $set: {
          rating: body.rating,
          comment: body.description,
        },
      };

      const result = await membersCollection.updateOne(filter, data, options);
      res.send(result);
    });
    // get all task
    app.get("/task/:teamName", async (req, res) => {
      const teamName = req.params.teamName;

      const query = {
        teamName: teamName,
      };
      const cursor = tasksCollection.find(query);
      const tasks = await cursor.toArray();
      res.send(tasks);
    });
    // get task of a member
    app.get("/taskMember", async (req, res) => {
      const id = req.query.id;

      const query = { memberId: id };
      const cursor = tasksCollection.find(query);
      const tasks = await cursor.toArray();
      res.send(tasks);
    });
    // get all teamsCollection
    app.get("/teams/:email", async (req, res) => {
      const email = req.params.email;
      const query = { owner: email };
      const cursor = teamsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // get all member

    app.get("/members", async (req, res) => {
      const email = req.query.email;
      const teamName = req.query.teamName;

      const query = {
        adminEmail: email,
        teamName: teamName,
      };
      const cursor = membersCollection.find(query);
      const members = await cursor.toArray();

      res.send(members);
    });
    // getting todays task based on new date
    app.get("/today-tasks", async (req, res) => {
      const taskDate = req.query.todaysDate;
      const teamName = req.query.teamName;

      const query = {
        taskDate: taskDate,
        teamName: teamName,
      };
      const cursor = tasksCollection.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });

    // delete a member (shuvo).......
    app.delete("/member/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await membersCollection.deleteOne(query);
      res.send(result);
    });

    //remove uncompleted task after forwarding
    app.delete("/forward-task/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await tasksCollection.deleteOne(filter);
      res.send(result);
    });

    app.post("/assign-task", async (req, res) => {
      const task = req.body;
      const result = await tasksCollection.insertOne(task);
      res.send(result);
    });

    app.put("/task-member/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const data = {
        $set: {
          taskCompletion: true,
        },
      };
      const result = await tasksCollection.updateOne(query, data, options);
      res.send(result);
    });
    // Update profile admin
    app.put("/update-admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const body = req.body;
      console.log(body);
      const data = {
        $set: {
          displayName: body.name,
          phone: body.number,
        },
      };
      const option = { upsert: true };
      const result = await adminsCollection.updateOne(query, data, option);
      res.send(result);
    });
    app.get("/admin-profile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await adminsCollection.findOne(query);
      res.send(result);
    });

    app.post("/forward-task-api", async (req, res) => {
      const data = req.body;
      const result = await forwardedTasksCollection.insertOne(data);
      res.send(result);
    });

    app.delete("/delete-team/:teamName", async (req, res) => {
      const teamName = req.params.teamName;
      const filter = { teamName: teamName };
      const deleteTeam = await teamsCollection.deleteOne(filter);
      const deleteMembers = await membersCollection.deleteMany(filter);
      // const deleteTasks = await tasksCollection.deleteMany(filter)
      res.send({ deleteTeam, deleteMembers });
    });

    // task forword post by al amin arif
    app.post("/forwardedTasksCollection", async (req, res) => {
      const taskForward = req.body;
      const result = await forwardedTasksCollection.insertOne(taskForward);
      res.send(result);
    });

    // task forword load by al amin arif
    app.get("/forwarded-task/:teamName", async (req, res) => {
      const name = req.params.teamName;
      const query = { teamName: name };
      const cursor = forwardedTasksCollection.find(query);
      const result = await (await cursor.toArray()).reverse();
      res.send(result);
    });
  } finally {
  }
};
run().catch(console.dir);
// testing localhost 5000
app.get("/", (req, res) => {
  res.send("hello world");
});
app.listen(port, () => {
  console.log("listening to port", port);
});
