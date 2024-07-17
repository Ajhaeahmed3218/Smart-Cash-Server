const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.itn5riw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middleware--------------->
const logger = async (req, res, next) => {
  console.log('called:', req.host, req.originalUrl);
  next()
}

const verifyToken = async (req, res, next) => {

  const token = req.cookies?.token;
  console.log('value of token in middleware', token);

  if (!token) {
    return res.status(401).send({ message: 'forbidden ba unAuthorized' })
  }
  
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: 'forbidden ba unAuthorized v' })
    }

    console.log('value in the token', decoded);
    req.user = decoded ;
    next()

  })
}



async function run() {
  try {
    await client.connect();
    const db = client.db("smartCashDb");

    const userCollection = db.collection("users");
    // const userRequestCollection = db.collection("users");
    const userRequestCollection = client.db("smartCashDb").collection("userRequest")



    // ----------Auth Ralated--------Api---start
    app.post('/jwt', logger, (req, res) => {
      const user = req.body;
      // console.log("user for token ", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // ----------Auth Ralated--------Api---End

    // LOGIN VERIFY-------------->>>>>>>>>> start 

    app.get("/login/:email", async (req, res) => {
      const email = req.params.email;
      const query = { phone: email };
      console.log("Query:", query); // For debugging purposes
    
      try {
        const existingUser = await userCollection.findOne(query);
    
        if (existingUser) {
          // console.log(existingUser?.email);
          return res.status(200).json({ message: 'User found', user: existingUser }); // Adjusted to return entire user object
        } else {
          return res.status(404).json({ message: 'User not found' });
        }
      } catch (err) {
        console.error('Error finding user data:', err);
        return res.status(500).json({ message: 'Server error' });
      }
    });
    

    

    // LOGIN VERIFY-------------->>>>>>>>>> end  



    // req to admin for register-------------->>>>>>>>>> Start  

    app.post("/request", verifyToken, async (req, res) => {
      const request = req.body
      // console.log(request);
      // console.log('tok tok token', req.cookies.token);
      const result = await userRequestCollection.insertOne(request);
      res.send(result);
    })

    // load All data For Home Page
    app.get('/request', logger, verifyToken, async (req, res) => {
      const result = await userRequestCollection.find().toArray()
      // console.log('tok tok token', req.cookies.token);
      res.send(result)
      console.log('user in the from velid token', req.user);
    })
    // req to admin for register-------------->>>>>>>>>> End  


    // confirm register-------------->>>>>>>>>> Start  
    app.post('/register', verifyToken, logger, async (req, res) => {
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
