const express=require('express')
require('dotenv').config()
const app=express()
const cors=require('cors')

const port=process.env.PORT||5000

app.use(cors())
app.use(express.json())

// db_user
// l76L8p5d51Iu7g4N


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9asok.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });

async function run(){
    try{
        await client.connect()
        const bicycleCollection = client.db("bicycleStore").collection("services")

        app.get('/service',async(req,res)=>{
      
            const data=req.query
            const cursor = bicycleCollection.find(data);
            const result=await cursor.toArray()
            // console.log(result);
            res.send(result)
        })
    }
    finally{

    }
}
run().catch(console.dir)


app.get('/',(req,res)=>{
    res.send('Welcome to Side')
})
app.listen(port,()=>{console.log('CURD is running',port)})