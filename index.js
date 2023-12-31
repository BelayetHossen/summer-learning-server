const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1wn0xld.mongodb.net/?retryWrites=true&w=majority`;

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
        const usersCollection = client.db('summerLearningDB').collection('users')
        const classCollection = client.db('summerLearningDB').collection('classes')
        const selectedClassCollection = client.db('summerLearningDB').collection('selectedClasses')
        const paymentCollection = client.db('summerLearningDB').collection('payments')
        const enrolledCollection = client.db('summerLearningDB').collection('enrolledClass')

        // create pament
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // payment info send to DB
        app.post('/payments/:deleteId', async (req, res) => {
            const payment = req.body;
            const deleteId = req.params.deleteId;
            const insertResult = await paymentCollection.insertOne(payment);

            const query = { classId: deleteId }
            const deleteResult = await selectedClassCollection.deleteOne(query)

            res.send({ insertResult, deleteResult });
        })




        // Get auth user
        app.get('/getAuth/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            res.send(result)
        })

        // Save user to DB
        app.post('/addUser', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // Get all users
        app.get('/allUsers', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        // Get single instructor
        app.get('/instructor/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const filter = { email: email };
                const result = await usersCollection.findOne(filter);

                if (result) {
                    res.send(result);
                } else {
                    res.status(404).send('Instructor not found');
                }
            } catch (error) {
                res.status(500).send('Internal server error');
            }
        });

        // update user role to admin
        app.patch('/updateRoleAdmin/:id', async (req, res) => {
            const id = req.params.id
            const role = req.body.role
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: role,
                },
            }
            const update = await usersCollection.updateOne(query, updateDoc)
            res.send(update)
        })
        // update user role to student
        app.patch('/updateRoleStudent/:id', async (req, res) => {
            const id = req.params.id
            const role = req.body.role
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: role,
                },
            }
            const update = await usersCollection.updateOne(query, updateDoc)
            res.send(update)
        })
        // update user role to instructor
        app.patch('/updateRoleInstructor/:id', async (req, res) => {
            const id = req.params.id
            const role = req.body.role
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: role,
                },
            }
            const update = await usersCollection.updateOne(query, updateDoc)
            res.send(update)
        })



        // Save class to DB
        app.post('/addClass', async (req, res) => {
            const classData = req.body;
            const result = await classCollection.insertOne(classData);
            res.send(result);
        });

        //get all classes for instructor
        app.get('/getMyClass/:email', async (req, res) => {
            const email = req.params.email
            if (!email) {
                res.send([])
            }
            const query = { instructor_email: email }
            const result = await classCollection.find(query).toArray()
            res.send(result)
        })

        //edit my class a single class data load for edit
        app.get('/mySingleClass/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await classCollection.findOne(query);
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });
        //update my class a single class data update
        app.put('/mySingleClass/:id', async (req, res) => {
            const updateData = req.body

            const filter = { _id: new ObjectId(req.params.id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: updateData,
            }
            const result = await classCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // delete a class
        app.delete('/deleteClass/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.deleteOne(query)
            res.send(result)
        })


        // Get all classes for admin
        app.get('/allClassesAdmin', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })

        // Get all aproved classes
        app.get('/allClasses', async (req, res) => {
            const query = { status: "Approved" };
            const result = await classCollection.find(query).toArray();
            res.send(result);
        });
        // Get instuctor Classs
        app.get('/instuctorClasss/:email', async (req, res) => {
            const email = req.params.email
            if (!email) {
                res.send([])
            }
            const query = { instructor_email: email }
            const result = await classCollection.find(query).toArray()
            res.send(result)
        });
        // Get instuctor Classs for frontend
        app.get('/instuctorClasssFront/:email', async (req, res) => {
            const email = req.params.email;
            if (!email) {
                res.send([]);
                return;
            }
            const query = { instructor_email: email, status: "Approved" };
            const result = await classCollection.find(query).toArray();
            res.send(result);
        });

        // Get all instuctors
        app.get('/allInstuctors', async (req, res) => {
            const filter = { role: "Instructor" };
            const result = await usersCollection.find(filter).toArray()
            res.send(result)
        })
        // Get all popular class
        app.get('/popularClass', async (req, res) => {
            try {
                const query = { status: "Approved", enrolled: { $gt: 0 } };
                const result = await classCollection.find(query).sort({ enrolled: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        // Get all popular Instructor
        app.get('/popularInstructor', async (req, res) => {
            try {
                const query = { role: "Instructor", students: { $gt: 0 } };
                const result = await usersCollection.find(query).sort({ students: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // update class status approved
        app.patch('/updateClassApproved/:id', async (req, res) => {
            const id = req.params.id
            const status = req.body.status
            const denied_for = req.body.denied_for
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: status,
                    denied_for: denied_for,
                },
            }
            const update = await classCollection.updateOne(query, updateDoc)
            res.send(update)
        })
        // update class status pending
        app.patch('/updateClassPending/:id', async (req, res) => {
            const id = req.params.id
            const status = req.body.status
            const denied_for = req.body.denied_for
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: status,
                    denied_for: denied_for,
                },
            }
            const update = await classCollection.updateOne(query, updateDoc)
            res.send(update)
        })
        // update class status Denied
        app.patch('/updateClassDenied/:id', async (req, res) => {
            const id = req.params.id
            const status = req.body.status
            const denied_for = req.body.denied_for
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: status,
                    denied_for: denied_for,
                },
            }
            const update = await classCollection.updateOne(query, updateDoc)
            res.send(update)
        })

        // select class for student
        app.post('/selectClass/:classId', async (req, res) => {
            try {
                const classId = req.params.classId;
                const userEmail = req.body.userEmail;

                if (!userEmail || !classId) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                const classData = { userEmail: userEmail, classId: classId };

                const existingClass = await selectedClassCollection.findOne(classData);
                if (existingClass) {
                    return res.send({ message: 'Class already Added, select another' });
                }

                const result = await selectedClassCollection.insertOne(classData);
                res.send(result);
            } catch (error) {
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        // delete a Selected Class
        app.delete('/deleteSelectedClass/:userEmail/:classId', async (req, res) => {
            try {
                const userEmail = req.params.userEmail;
                const classId = req.params.classId;
                const query = { classId: classId, userEmail: userEmail }
                const result = await selectedClassCollection.deleteOne(query)
                res.send(result)
            } catch (error) {
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get student selected Classs
        app.get('/getSelectedClass/:email', async (req, res) => {
            try {
                const email = req.params.email;

                if (!email) {
                    res.send([]);
                    return;
                }
                const query = { userEmail: email };
                const result = await selectedClassCollection.find(query).toArray();
                const classIds = result.map(({ classId }) => classId);
                const filter = { _id: { $in: classIds.map(id => new ObjectId(id)) } };
                const final = await classCollection.find(filter).toArray();
                res.send(final);
            } catch (error) {
                res.status(500).json({ error: 'Internal server error' });
            }
        });
















        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
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
    res.send('Server is running..')
})

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})