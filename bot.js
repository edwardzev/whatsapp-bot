const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

const WASSENGER_API_KEY = "a0c3b4560866855af80566411e718d7b085357fc6e9731f7a03cc9b91db73cb0c8b408b68735ad72";  // Replace with actual API key
require('dotenv').config();
const openaiKey = process.env.OPENAI_API_KEY;
const PORT = 3000;

// Initialize OpenAI API
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Webhook route to receive messages
app.post('/webhook', async (req, res) => {
    if (!req.body || !req.body.data) {
        return res.sendStatus(400);
    }

    const message = req.body.data.body;
    const from = req.body.data.fromNumber;

    console.log(`Received message from ${from}: ${message}`);

    // Generate AI response using OpenAI GPT-4o
    const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a WhatsApp chatbot that provides helpful responses to users." },
            { role: "user", content: message }
        ],
        temperature: 0.7
    });

    const responseText = aiResponse.choices[0].message.content.trim();

    // Send the response back to WhatsApp user
    await axios.post('https://api.wassenger.com/v1/messages', {
        phone: from,
        message: responseText
    }, {
        headers: { Authorization: `Bearer ${WASSENGER_API_KEY}` }
    });

    console.log(`Replied to ${from}: ${responseText}`);
    res.sendStatus(200);
});

// Start the server
app.listen(PORT, () => {
    console.log(`WhatsApp AI bot running on port ${PORT}`);
});
