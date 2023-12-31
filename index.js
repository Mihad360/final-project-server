const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


// const uri = "mongodb+srv://foods966:p2TwQZoLRG7JGqYe@cluster1.uxt0zs4.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.uxt0zs4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db('foodDB').collection('menu')
    const reviewCollection = client.db('foodDB').collection('reviews')
    const cartsCollection = client.db('foodDB').collection('carts')
    const usersCollection = client.db('foodDB').collection('users')

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '10h' })
      res.send({ token })
    })

    const verifyToken = (req, res, next) => {
      console.log(req.headers)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized domain' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized domain' })
        }
        req.decoded = decoded
        next()
      })
      // next()
    }

    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result)
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result)
    })

    app.post('/carts', async (req, res) => {
      const carts = req.body;
      const result = await cartsCollection.insertOne(carts)
      res.send(result)
    })

    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await cartsCollection.find(query).toArray();
      res.send(result)
    })

    app.delete('/carts/:id', verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartsCollection.deleteOne(query)
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const isexist = await usersCollection.findOne(query)
      if (isexist) {
        return res.send({ message: 'your email address is already exist', insertedId: null })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users', verifyToken,verifyAdmin, async (req, res) => {

      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.patch('/users/admin/:id', verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedoc)
      res.send(result)
    })

    app.delete('/users/:id',verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    app.post('/menu',verifyToken, verifyAdmin, async(req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/menu/:id',verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id: id}
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    })

    app.get('/menu/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: id}
      const result = await menuCollection.findOne(query)
      res.send(result)
    })

    app.patch('/menu/:id', async(req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = {_id:id}
      const updatedoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }
      const result = await menuCollection.updateOne(filter, updatedoc)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send(`boss is running`)
})

app.listen(port, (req, res) => {
  console.log(`boss is running on port: ${port}`)
})