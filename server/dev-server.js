// Local development server for email API
// Run with: node server/dev-server.js

import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Email endpoint
app.post('/api/send-email', async (req, res) => {
    const apiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
    
    if (!apiKey) {
        console.error('RESEND_API_KEY not configured');
        return res.status(500).json({ 
            error: 'Email service not configured. RESEND_API_KEY is missing.' 
        });
    }

    try {
        const { to, subject, html } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
        }

        const resend = new Resend(apiKey);

        const { data, error } = await resend.emails.send({
            from: 'Liceo Cares <noreply@citattendance.info>',
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        });

        if (error) {
            console.error('Resend API error:', error);
            return res.status(500).json({ error: error.message || 'Failed to send email' });
        }

        console.log('Email sent successfully:', data.id);
        return res.status(200).json({ success: true, id: data.id });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: error.message || 'Unknown error occurred' });
    }
});

app.listen(PORT, () => {
    console.log(`📧 Dev email server running at http://localhost:${PORT}`);
    console.log(`   POST /api/send-email to send emails`);
});
