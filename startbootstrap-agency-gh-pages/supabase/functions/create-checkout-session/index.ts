import Stripe from "npm:stripe@22";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-03-31.basil",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    const { eventId, userId, registrationId, email } = await req.json();

    
    console.log("EVENT ID:", eventId);
    console.log("USER ID:", userId);
    console.log("REGISTRATION ID:", registrationId);
    console.log("EMAIL:", email);

    const siteUrl = Deno.env.get("SITE_URL")!;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "czk",
            product_data: {
              name: "Rezervace seznamovací akce",
            },
            unit_amount: 20000,
          },
          quantity: 1,
        },
      ],
      metadata: {
        registrationId: registrationId,
        email: email
      },
      success_url: `${siteUrl}/confirm_payment.html`,
      cancel_url: `${siteUrl}/payment_failed.html?registrationId=${registrationId}`,

    });

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("ERROR:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});