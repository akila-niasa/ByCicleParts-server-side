const express=require('express')
require('dotenv').config()
const app=express()
const cors=require('cors')

const port=process.env.PORT||5000

app.use(cors())
app.use(express.json())


app.get('/',(req,res)=>{
    res.send('Welcome to Side')
})
app.listen(port,()=>{console.log('CURD is running',port)})