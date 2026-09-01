import Stripe from "npm:stripe@22";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-03-31.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

    if (typeof eventId !== "string" || !eventId.trim()) {
      return new Response(
        JSON.stringify({ error: "Chybí platné ID akce." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("price")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("EVENT PRICE LOAD ERROR:", eventError);
      throw new Error("Nepodařilo se načíst cenu akce.");
    }

    // Postgres numeric values can arrive as either a number or a string.
    // Stripe expects an integer amount in the smallest currency unit (haléře).
    const eventPrice = Number(event.price);
    const unitAmount = Math.round(eventPrice * 100);

    if (!Number.isFinite(eventPrice) || eventPrice <= 0 || unitAmount <= 0) {
      console.error("INVALID EVENT PRICE:", { eventId, price: event.price });
      return new Response(
        JSON.stringify({ error: "Cena akce není platná." }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("EVENT PRICE:", { eventId, eventPrice, unitAmount });

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
            unit_amount: unitAmount,
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
