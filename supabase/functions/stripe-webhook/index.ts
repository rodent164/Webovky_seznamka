import Stripe from "stripe";

const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY")!,
  {
    apiVersion: "2025-06-30.basil",
  }
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req: Request) => {

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


  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const registrationId = session.metadata?.registrationId;

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

    const registrationResponse = await fetch(
      `${supabaseUrl}/rest/v1/registrations?id=eq.${registrationId}&select=user_id,event_id`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`
        }
      }
    );

    const registrationData = await registrationResponse.json();

    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${registrationData[0].user_id}&select=nickname,email,user_code`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`
        }
      }
    );

    const userData = await userResponse.json();

    const eventResponse = await fetch(
      `${supabaseUrl}/rest/v1/events?id=eq.${registrationData[0].event_id}&select=name,event_date,event_time,location,category_id,event_categories(name,more_info)`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`
        }
      }
    );

    const eventData = await eventResponse.json();

    // ==========================================
    // PŘÍPRAVA POTVRZOVACÍHO E-MAILU
    // ==========================================

    const user = userData[0];
    const eventDetails = eventData[0];

    const emailText = `
      Potvrzení registrace

      Dobrý den,

      potvrzujeme přijatou platbu a registraci na seznamovací akci.

      Přezdívka: ${user.nickname}
      E-mail: ${user.email}
      Kód uživatele: ${user.user_code}

      Akce: ${eventDetails.name}
      Datum: ${new Date(eventDetails.event_date).toLocaleDateString('cs-CZ')}
      Čas: ${eventDetails.event_time}
      Místo: ${eventDetails.location}

      Informace o akci:
      ${eventDetails.event_categories?.more_info || ""}
      `;

    if (!user || !eventDetails) {
      console.error("MISSING USER OR EVENT DATA");
    } else {

      // ==========================================
      // E-MAIL ÚČASTNÍKOVI PŘES RESEND
      // ==========================================

      const participantEmailResponse = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Seznamovací akce <info@seznamovaci-akce.cz>",
            to: user.email,
            subject: "Potvrzení registrace na seznamovací akci",
            text: emailText
          })
        }
      );

      const participantEmailResult =
        await participantEmailResponse.text();

    }
        // ==========================================
    // E-MAIL ORGANIZÁTOROVI PŘES RESEND
    // ==========================================

    const organizerEmailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Seznamovací akce <info@seznamovaci-akce.cz>",
          to: "seznamovaci.akce@gmail.com",
          subject: "Nová zaplacená registrace",
          text: emailText
        })
      }
    );

    const organizerEmailResult =
      await organizerEmailResponse.text();
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