import Stripe from "stripe";

const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY")!,
  {
    apiVersion: "2025-06-30.basil",
  }
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req: Request) => {
  console.log("STRIPE WEBHOOK RECEIVED");

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature", {
      status: 400
    });
  }

  const body = await req.text();

  let event;

  try {
    const cryptoProvider = Stripe.createSubtleCryptoProvider();

    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (error) {
    console.error("WEBHOOK SIGNATURE ERROR:", error);

    return new Response("Invalid Stripe signature", {
      status: 400
    });
  }

  console.log("STRIPE EVENT:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const registrationId = session.metadata?.registrationId;

    console.log("REGISTRATION ID:", registrationId);
    if (!registrationId) {
      console.error("MISSING REGISTRATION ID");

      return new Response("Missing registration ID", {
        status: 400
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/registrations?id=eq.${registrationId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          status: "paid"
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "REGISTRATION UPDATE ERROR:",
        errorText
      );

      return new Response("Failed to update registration", {
        status: 500
      });
    }

    console.log(
      "REGISTRATION UPDATED TO PAID:",
      registrationId
    );
    const email = session.metadata?.email;

    if (!email) {
      console.error("MISSING EMAIL");
    } else {
      const emailResponse = await fetch(
        "https://api.web3forms.com/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            access_key: Deno.env.get("WEB3FORMS_ACCESS_KEY"),
            email: email,
            subject: "Potvrzení platby",
            message: "Potvrzujeme přijatou platbu."
          })
        }
      );

      const emailResult = await emailResponse.text();

      console.log("WEB3FORMS RESPONSE:", emailResult);
    }
  }
  return new Response(
    JSON.stringify({
      received: true
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
});