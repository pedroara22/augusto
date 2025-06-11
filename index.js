const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const upload = require('./multer');
const fs = require('fs');
const {PORT, DB_USER,  DB_PASSWORD, CLIENT_ID, CLIENT_SECRET } = process.env
const { ImgurClient } = require('imgur');
const { MongoClient, ServerApiVersion } = require("mongodb");
const { ObjectId } = require("mongodb");

app.use(cors({ origin: "*" }));

app.use(express.json());
app.use(bodyParser.json());

const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.bissghl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        console.log("Nice");
    }
}
run().catch(console.dir);

// Configura o ImgurClient
const imgurClient = new ImgurClient({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET // opcional, mas recomendado
});

const db = client.db("data");
const data = db.collection("data");

app.post('/newMemory', upload.single("file"), async (req, res) => {
    const file = req.file;

    const memory = {
        title: req.body.title,
        author: req.body.author,
        image: "",
        description: req.body.description,
        data: req.body.data ? new Date(req.body.data) : new Date() // se o usuário enviar a data, converte para Date; senão usa agora
    };

    try {
        const response = await imgurClient.upload({
            image: file.buffer.toString("base64"),
            type: 'base64'
        });


        memory.image = response.data.link;

        const result = await data.insertOne(memory);
        res.send(`A document was inserted with the _id: ${result.insertedId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao fazer upload da imagem.");
    }
});


app.get('/memories', async (req, res) => {
    try {
        const memories = await data
            .find({})
            .sort({ data: -1 }) // ordena do mais recente para o mais antigo
            .limit(10)
            .toArray();

        res.json(memories);
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao buscar as memórias.");
    }
});

// DELETE memória por id
app.delete('/memories/:id', async (req, res) => {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send("ID inválido.");
    }

    try {
        const result = await data.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).send("Memória não encontrada.");
        }

        res.send("Memória deletada com sucesso.");
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao deletar a memória.");
    }
});

// UPDATE memória por id
app.put('/memories/:id', async (req, res) => {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send("ID inválido.");
    }

    const updates = {};

    // Campos que podem ser atualizados
    const possibleFields = ['title', 'author', 'description', 'data'];

    // Só copia os campos enviados no body que estão na lista permitida
    possibleFields.forEach(field => {
        if (req.body[field] !== undefined) {
            if(field === 'data') {
                // converte para Date, se for o campo data
                updates[field] = new Date(req.body[field]);
            } else {
                updates[field] = req.body[field];
            }
        }
    });

    if (Object.keys(updates).length === 0) {
        return res.status(400).send("Nenhum campo válido para atualizar.");
    }

    try {
        const result = await data.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send("Memória não encontrada.");
        }

        res.send("Memória atualizada com sucesso.");
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao atualizar a memória.");
    }
});

app.get('/memories/:id', async (req, res) => {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send("ID inválido.");
    }

    try {
        const memory = await data.findOne({ _id: new ObjectId(id) });

        if (!memory) {
            return res.status(404).send("Memória não encontrada.");
        }

        res.json(memory);
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao buscar a memória.");
    }
});

app.listen(PORT, () => {
    console.log("app running at " + PORT);
});
