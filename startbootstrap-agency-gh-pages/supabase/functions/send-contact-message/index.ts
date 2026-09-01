const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { name, email, phone, message, website } = await req.json();

    // Hidden honeypot field: bots usually fill it, regular visitors never see it.
    if (typeof website === "string" && website.trim()) {
      return jsonResponse({ success: true });
    }

    const contactName = typeof name === "string" ? name.trim() : "";
    const contactEmail = typeof email === "string" ? email.trim() : "";
    const contactPhone = typeof phone === "string" ? phone.trim() : "";
    const contactMessage = typeof message === "string" ? message.trim() : "";

    if (
      !contactName || contactName.length > 100 ||
      !isEmail(contactEmail) || contactEmail.length > 254 ||
      contactPhone.length > 50 ||
      !contactMessage || contactMessage.length > 5000
    ) {
      return jsonResponse({ error: "Zkontrolujte prosím vyplněné údaje." }, 400);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return jsonResponse({ error: "E-mailová služba není nakonfigurována." }, 500);
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Seznamovací akce <info@seznamovaci-akce.cz>",
        to: "seznamovaci.akce@gmail.com",
        reply_to: contactEmail,
        subject: `Zpráva z kontaktního formuláře: ${contactName}`,
        text: [
          "Nová zpráva z kontaktního formuláře",
          "",
          `Jméno: ${contactName}`,
          `E-mail: ${contactEmail}`,
          `Telefon: ${contactPhone || "neuveden"}`,
          "",
          "Zpráva:",
          contactMessage,
        ].join("\n"),
      }),
    });

    if (!resendResponse.ok) {
      console.error("RESEND CONTACT EMAIL ERROR:", await resendResponse.text());
      return jsonResponse({ error: "Zprávu se nepodařilo odeslat." }, 502);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("CONTACT FORM ERROR:", error);
    return jsonResponse({ error: "Neplatný požadavek." }, 400);
  }
});
