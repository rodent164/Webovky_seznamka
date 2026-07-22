# Stripe Checkout (test mode)

This site uses a server-created Stripe Checkout Session for one paid event ticket. The price is set on the server, never in browser code.

## First-time setup

1. Install Node.js 20 or later, then run `npm install` in this directory.
2. In Stripe Dashboard, switch on **Test mode** and copy the secret key (`sk_test_...`).
3. Copy `.env.example` to `.env` and fill in the values. Do not commit `.env`.
4. Start the site with `npm start`, then open `http://localhost:4242`.
5. Forward Stripe webhooks in another terminal:

   ```sh
   stripe listen --forward-to localhost:4242/webhook
   ```

   Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`, then restart the server.

Use test card `4242 4242 4242 4242`, any future expiration date, and any CVC. Never use real card information while in test mode.

## Before live payments

Replace the webhook log with an idempotent database update keyed by the Checkout Session ID. This is what should grant a ticket/seat and prevent duplicate registrations.
