const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors');
var jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9asok.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });

// VerifyJWT
function verifyJWT(req, res, next) {
    const authorization = req.headers.authorization
    // console.log(authorization);
    if (!authorization) {
        return res.status(401).send({ message: "Unauthorized access" })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Not allow to access" })
        }
        req.decoded = decoded
        next()
    })
}

async function run() {
    try {
        await client.connect()
        const bicycleCollection = client.db("bicycleStore").collection("services")
        const orderCollection = client.db("bicycleStore").collection("orders")
        const userCollection = client.db("bicycleStore").collection("users")
        const paymentCollection = client.db("bicycleStore").collection("payment")
        const reviewCollection = client.db("bicycleStore").collection("reviews")

        // VerifyAdmin
        const verifyAdmin=async(req,res,next)=>{
            const requester=req.decoded.email
            // console.log(requester);
            const requestAccount=await userCollection.findOne({email:requester})
            if (requestAccount.role==='admin'){
              next();
            }
            else{
                return    res.status(403).send({message:"Forbiden Access"})
                }
        }

        //user PUT for google
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);

            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            //   console.log(result);
            res.send({ result, accessToken: token });
        })

        //(GET) all product 
        app.get('/service', async (req, res) => {

            const data = req.query;
            const cursor = bicycleCollection.find(data);
            const result = await cursor.toArray();
            // console.log(result);
            res.send(result);
        });
        //(GET) single product 
        app.get("/service/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bicycleCollection.findOne(query);
            res.send(result);
        })

        //(POST) Order save
        app.post("/saveorder", async (req, res) => {
            order = req.body;
            const result = await orderCollection.insertOne(order);
            res.json(result);
        });

        //(GET) Single user Orders
        app.get("/orders", verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email
            if (email === decodedEmail) {
                const query = { client: email };
                const cursor = orderCollection.find(query);
                const result = await cursor.toArray();
                return res.json(result);
            } else {

                return res.status(403).send({ message: "Not allow to access" });
            }

        });

        //(DELETE) DELETE Order
        app.delete("/deleteorder/:id", async (req, res) => {
            const productId = req.params.id;
            // console.log(productId);
            const query = { _id: ObjectId(productId) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        });

         //(POST) Post A Review 
    app.post("/review", async (req, res) => {
        reviewDetails = req.body;
        const result = await reviewCollection.insertOne(reviewDetails);
        res.json(result);
      });

      //(GET) Show All Review
    app.get("/review", async (req, res) => {
        const cursor = reviewCollection.find();
        const result = await cursor.toArray();
        res.json(result);
      });

        // (GET) Get Order For Payment
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })

         // (POST) Post For Payment
         app.post('/create-payment-intent',verifyJWT,async(req,res)=>{
            const order=req.body;
            const price=order.price;
            const ammount=price*100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: ammount,
                currency: "usd",
                payment_method_types:['card'],
              });
              res.send({clientSecret: paymentIntent.client_secret});
        })

        //(PATCH) Patch Order Data
        app.patch('/order/:id', verifyJWT, async(req, res) =>{
            const id  = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
              $set: {
                paid: true,
                transactionId: payment.transactionId
              }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedBooking);
          })

        
        //   (PUT)Put For Update or save profile
        app.put('/userprofile/:email', async(req, res) =>{
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            // const options = { upsert: true };
            const updatedDoc = {
              $set:
               user
            }
            const updatedUser = await userCollection.updateOne(filter, updatedDoc);
            res.send(updatedUser);
          })
      
          //(GET)Get all User
          app.get("/user",verifyJWT,verifyAdmin, async (req, res) => {
            const cursor = userCollection.find();
            const result = await cursor.toArray();
            res.json(result);
          });

        //   (PUT)Put For Make an admin
          app.put('/user/admin/:email',verifyJWT,async(req,res)=>{
            const email=req.params.email;
                const filter={email:email};
                const updateDoc = {
                    $set:{role:'admin'},
                  };
                  const result = await userCollection.updateOne(filter, updateDoc);
             res.send(result);
            
        })

        

        // (GET)Get A Admin
        app.get('/useadmin/:email',async(req,res)=>{
            const email=req.params.email;
            const user=await userCollection.findOne({email:email});
            const isAdmin=user.role==='admin';
            res.send({admin:isAdmin});
        })

        // (POST)Post For Add Product
        app.post('/addservice',verifyJWT,verifyAdmin,async(req,res)=>{
            const product=req.body;
            const result=await bicycleCollection.insertOne(product);
            res.send(result);
        })

        // (GET)Get For Manage All Product
        app.get('/manageservice',verifyJWT,verifyAdmin,async(req,res)=>{
            const result=await bicycleCollection.find().toArray();
            res.send(result);
        })

        //(DELETE) DELETE product From Manage All Product
    app.delete("/deleteservice/:id",verifyJWT,verifyAdmin, async (req, res) => {
        const productId = req.params.id;
        const query = { _id: ObjectId(productId) };
        const result = await bicycleCollection.deleteOne(query);
        res.json(result);
      });

    //   (GET)Get All Orders For Admin
      app.get('/manageorders',verifyJWT,verifyAdmin,async(req,res)=>{
        const result = await orderCollection.find().toArray();
        res.send(result);
      })

        //(PUT) Update Order Status
        app.put("/manageorders/:id",verifyJWT,verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const updateStatus=req.body.status
            // console.log(updateStatus);
            const query = { _id: ObjectId(id) };
            const updateDoc = {
              $set: {
                status:updateStatus,
              },
            };
            // console.log(updateDoc);
            const result = await orderCollection.updateOne(query, updateDoc);
            res.send(result);
          });

          //(DELETE) DELETE Order
        app.delete("/manageorder/:id", async (req, res) => {
            const productId = req.params.id;
            // console.log(productId);
            const query = { _id: ObjectId(productId) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        });
    }
    finally {

    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Welcome to my Side')
})
app.listen(port, () => { console.log('CURD is run', port) })