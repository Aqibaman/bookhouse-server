const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const app = express();
const jwt = require("jsonwebtoken");
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tbyvndu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// varify JWT
function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();

    })

}


async function run() {
    try {
        const booksCategoriesCollection = client.db('bookHouse').collection('bookCategories');
        const booksCollection = client.db('bookHouse').collection('books');
        const usersCollection = client.db('bookHouse').collection('users');
        const bookingsCollection = client.db('bookHouse').collection('bookings');
        const advertisedCollection = client.db('bookHouse').collection('advertised');
        const reportedToAdmin = client.db('bookHouse').collection('reportedtoadmin');
        const paymentsCollection = client.db('bookHouse').collection('paymentsCollection');

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '23h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '20h' })
            res.send({ token })
        })



        app.get('/bookCategories', async (req, res) => {
            const query = {}
            const cursor = booksCategoriesCollection.find(query);
            const bookCategories = await cursor.sort({ _id: -1 }).limit(3).toArray();
            console.log(bookCategories);
            res.send(bookCategories);
        });

        app.get("/category/:category_id", async (req, res) => {
            const id = req.params.category_id;
            const query = { category_id: id }
            const result = await booksCollection.find(query).toArray()
            res.send(result);
        });

        app.post("/addproduct", async (req, res) => {
            const product = req.body;
            // console.log(product);
            const result = await booksCollection.insertOne(product);
            res.send(result);
        });

        app.get("/product", async (req, res) => {
            const query = { email: req.query.email }
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        app.get("/requser", async (req, res) => {
            const query = { email: req.query.email }
            // console.log(query)
            const result = await usersCollection.findOne(query);
            res.send(result);
        });
        app.get('/allsellers', async (req, res) => {
            const query = { type: "seller" };
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers);
        });
        app.get('/allbuyers', async (req, res) => {
            const query = { type: "buyer" };
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers);
        });
        app.delete('/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        });
        app.delete('/buyer/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        });

        app.post('/bookings', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await bookingsCollection.insertOne(user);
            res.send(result);
        });

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: ObjectId(id) }

            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    booking_type: "Booked"
                }
            }
            const result = await booksCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });

        app.post('/advertise', async (req, res) => {
            const product = req.body;
            // console.log(product);
            const result = await advertisedCollection.insertOne(product);
            res.send(result);
        });

        app.get('/advertise/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: ObjectId(id) }
            console.log(query)
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: true
                }
            }
            const result = await booksCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });

        app.get("/myorders", verifyJWT, async (req, res) => {
            const query = { emailadress: req?.query?.email };
            const email = query?.emailadress;
            console.log(email);

            // console.log('token', req.headers.authorization);

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidde access' })
            }
            console.log(query)
            console.log(query.emailadress);

            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        });

        app.get("/advertised", verifyJWT, async (req, res) => {
            const query = {}
            const email = req.query.email;
            console.log(email);

            // // console.log('token', req.headers.authorization);

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidde access' })
            }

            const result = await advertisedCollection.find(query).toArray();
            res.send(result);
        })
        //_____________________________________

        app.delete('/advertised/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await advertisedCollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/changestatus/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: false
                }
            }
            const result = await booksCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });


        app.post('/reportedtoadmin', async (req, res) => {
            const product = req.body;
            // console.log(product);
            const result = await reportedToAdmin.insertOne(product);
            res.send(result);
        });
        app.get('/reportedtoadmin', async (req, res) => {
            const query = {};
            // console.log(product);
            const result = await reportedToAdmin.find(query).toArray();
            res.send(result);
        });

        app.get("/payforbook/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            // console.log(query)
            const result = await bookingsCollection.findOne(query);
            res.send(result);
        })

        app.get('/verified', async (req, res) => {
            const filter = { email: req.query.email }
            // console.log(filter)
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    verified: true,
                }
            }
            const result = await booksCollection.updateMany(filter, updatedDoc, options);
            res.send(result);
        })

        app.post('/gsignup', async (req, res) => {
            const product = req.body;
            // console.log(product);
            const result = await usersCollection.insertOne(product);
            res.send(result);
        });

        //payments 
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.bookprice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post("/payments", async (req, res) => {
            const payments = req.body
            const result = await paymentsCollection.insertOne(payments)
            const id = payments.productId
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transectionId: payments.transectionId
                }
            }
            const updateResult = await bookingsCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
        });

        app.delete('/deleteproduct/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await booksCollection.deleteOne(filter);
            res.send(result);
        })



    }
    finally {

    }


}

run().catch(e => console.error(e))

app.get('/', async (req, res) => {
    res.send('Bookhouse server is running');
})

app.listen(port, () => console.log(`Bookhouse running on ${port}`))