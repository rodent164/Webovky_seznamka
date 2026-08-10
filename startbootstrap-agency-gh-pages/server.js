require('dotenv').config();

const express = require('express');
const Stripe = require('stripe');
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const requiredEnvironment = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SITE_URL'];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);

if (missingEnvironment.length) {
    throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`);
}

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const port = Number(process.env.PORT || 4242);
const siteUrl = process.env.SITE_URL.replace(/\/$/, '');
const eventPriceCzk = Number(process.env.EVENT_PRICE_CZK || 500);
const databasePath = path.resolve(process.env.DATABASE_PATH || './data/registrations.db');

if (!Number.isInteger(eventPriceCzk) || eventPriceCzk < 1) {
    throw new Error('EVENT_PRICE_CZK must be a positive whole number.');
}

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY,
        checkout_session_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        gender TEXT NOT NULL,
        age INTEGER NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        paid_at TEXT
    );
`);

const insertRegistration = database.prepare(`
    INSERT INTO registrations (checkout_session_id, name, gender, age, email, phone)
    VALUES (@checkoutSessionId, @name, @gender, @age, @email, @phone)
`);
const markRegistrationPaid = database.prepare(`
    UPDATE registrations
    SET status = 'paid', paid_at = CURRENT_TIMESTAMP
    WHERE checkout_session_id = ? AND status = 'pending'
`);
const findRegistration = database.prepare(`
    SELECT status FROM registrations WHERE checkout_session_id = ?
`);

function validateRegistration(input) {
    const registration = {
        name: typeof input?.name === 'string' ? input.name.trim() : '',
        gender: typeof input?.gender === 'string' ? input.gender : '',
        age: Number(input?.age),
        email: typeof input?.email === 'string' ? input.email.trim() : '',
        phone: typeof input?.phone === 'string' ? input.phone.trim() : ''
    };

    const isValid = registration.name && ['Muž', 'Žena'].includes(registration.gender)
        && Number.isInteger(registration.age) && registration.age >= 18 && registration.age <= 99
        && /^\S+@\S+\.\S+$/.test(registration.email) && registration.phone;

    return isValid ? registration : null;
}

// Stripe must receive the unchanged request body to verify its webhook signature.
app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
    const signature = request.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        console.error('Webhook signature verification failed:', error.message);
        return response.status(400).send('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
            markRegistrationPaid.run(session.id);
            console.log(`Registration paid for Checkout Session ${session.id}`);
        }
    }

    return response.json({ received: true });
});

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/create-checkout-session', async (request, response) => {
    const registration = validateRegistration(request.body);

    if (!registration) {
        return response.status(400).json({ error: 'Registration details are invalid.' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: registration.email,
            line_items: [{
                price_data: {
                    currency: 'czk',
                    product_data: { name: 'Vstupenka na seznamovací akci' },
                    unit_amount: eventPriceCzk * 100
                },
                quantity: 1
            }],
            success_url: `${siteUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/review.html`
        });

        insertRegistration.run({
            checkoutSessionId: session.id,
            ...registration
        });

        return response.json({ url: session.url });
    } catch (error) {
        console.error('Unable to create Checkout Session:', error.message);
        return response.status(500).json({ error: 'Unable to start payment. Please try again.' });
    }
});

app.get('/api/checkout-session/:sessionId', async (request, response) => {
    const sessionId = request.params.sessionId;
    let registration = findRegistration.get(sessionId);

    if (!registration) {
        return response.status(404).json({ error: 'Payment session was not found.' });
    }

    // The webhook is the normal source of truth. This direct Stripe check makes
    // the customer return page resilient if a local webhook listener was offline.
    if (registration.status === 'pending') {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === 'paid') {
                markRegistrationPaid.run(sessionId);
                registration = findRegistration.get(sessionId);
            }
        } catch (error) {
            console.error(`Unable to verify Checkout Session ${sessionId}:`, error.message);
        }
    }

    return response.json({ paid: registration.status === 'paid' });
});

app.listen(port, () => {
    console.log(`Site running at ${siteUrl} (local port ${port})`);
});
