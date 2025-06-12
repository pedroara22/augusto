require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const upload = require('./multer');
const { MongoClient, ObjectId } = require("mongodb");

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(bodyParser.json());

const { PORT, DB_USER, DB_PASSWORD } = process.env;

const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.bissghl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("MongoDB conectado com sucesso.");
    } catch (e) {
        console.error("Erro ao conectar ao MongoDB:", e);
    }
}
run().catch(console.dir);

const db = client.db("data");
const data = db.collection("data");

// Criar nova memória
app.post('/newMemory', upload.single("file"), async (req, res) => {
    const file = req.file;

    const memory = {
        title: req.body.title,
        author: req.body.author,
        image: file?.path || "", // URL do Cloudinary
        description: req.body.description,
        data: req.body.data ? new Date(req.body.data) : new Date()
    };

    try {
        const result = await data.insertOne(memory);
        res.send(`Documento inserido com _id: ${result.insertedId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao salvar a memória.");
    }
});

// Buscar todas as memórias
app.get('/memories', async (req, res) => {
    try {
        const memories = await data.find({})
            .sort({ data: -1 })
            .limit(10)
            .toArray();
        res.json(memories);
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao buscar as memórias.");
    }
});

// Buscar uma memória
app.get('/memories/:id', async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).send("ID inválido.");

    try {
        const memory = await data.findOne({ _id: new ObjectId(id) });
        if (!memory) return res.status(404).send("Memória não encontrada.");
        res.json(memory);
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao buscar a memória.");
    }
});

// Atualizar memória
app.put('/memories/:id', async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).send("ID inválido.");

    const updates = {};
    ['title', 'author', 'description', 'data'].forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = field === 'data' ? new Date(req.body[field]) : req.body[field];
        }
    });

    if (Object.keys(updates).length === 0)
        return res.status(400).send("Nenhum campo válido para atualizar.");

    try {
        const result = await data.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        if (result.matchedCount === 0)
            return res.status(404).send("Memória não encontrada.");

        res.send("Memória atualizada com sucesso.");
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao atualizar a memória.");
    }
});

// Deletar memória
app.delete('/memories/:id', async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).send("ID inválido.");

    try {
        const result = await data.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0)
            return res.status(404).send("Memória não encontrada.");
        res.send("Memória deletada com sucesso.");
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao deletar a memória.");
    }
});

// Start
app.listen(PORT, () => {
    console.log("App rodando na porta " + PORT);
});
