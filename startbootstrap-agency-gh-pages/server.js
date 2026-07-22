require('dotenv').config();

const express = require('express');
const Stripe = require('stripe');

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

if (!Number.isInteger(eventPriceCzk) || eventPriceCzk < 1) {
    throw new Error('EVENT_PRICE_CZK must be a positive whole number.');
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

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        // Replace this log with an idempotent database update before going live.
        console.log(`Payment confirmed for Checkout Session ${session.id}`);
    }

    return response.json({ received: true });
});

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/create-checkout-session', async (request, response) => {
    const { email } = request.body || {};

    if (!email || typeof email !== 'string') {
        return response.status(400).json({ error: 'A valid email address is required.' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: email.trim(),
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

        return response.json({ url: session.url });
    } catch (error) {
        console.error('Unable to create Checkout Session:', error.message);
        return response.status(500).json({ error: 'Unable to start payment. Please try again.' });
    }
});

app.get('/api/checkout-session/:sessionId', async (request, response) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(request.params.sessionId);
        return response.json({
            paid: session.payment_status === 'paid',
            customerEmail: session.customer_details?.email || null
        });
    } catch (error) {
        return response.status(404).json({ error: 'Payment session was not found.' });
    }
});

app.listen(port, () => {
    console.log(`Site running at ${siteUrl} (local port ${port})`);
});
