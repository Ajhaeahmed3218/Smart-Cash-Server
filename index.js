const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.itn5riw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const db = client.db("smartCashDb");
    
    const userCollection = db.collection("users");
    // const userRequestCollection = db.collection("users");
    const userRequestCollection = client.db("smartCashDb").collection("userRequest")

 // req to admin for register-------------->>>>>>>>>> Start  

app.post("/request", async (req, res) => {
  const request = req.body
  // console.log(request);
  const result = await userRequestCollection.insertOne(request);
  res.send(result);
})

 // load All data For Home Page
 app.get('/request', async (req, res) => {
  const result = await userRequestCollection.find().toArray()
  res.send(result)
})
// req to admin for register-------------->>>>>>>>>> End  


// confirm register-------------->>>>>>>>>> Start  
    app.post('/register', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      user.password = hashedPassword;

      const result = await userCollection.insertOne(user);
      const newresult = await userRequestCollection.deleteOne(query)
      res.status(201).json({ message: 'User registered successfully', insertedId: result.insertedId });
    });


  
// confirm register-------------->>>>>>>>>>  End

    app.get('/', (req, res) => {
      res.send('Hello World!');
    });

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged MongoDB successfully!");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
}

run().catch(console.error);
