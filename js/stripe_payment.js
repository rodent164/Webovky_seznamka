async function startStripePayment(eventId, userId) {

    const { data, error } =
        await supabaseClient.functions.invoke(
            'create-checkout-session',
            {
                body: {
                    eventId: eventId,
                    userId: userId
                }
            }
        );

    if (error) {
        console.error("STRIPE ERROR:", error);
        alert("Nepodařilo se vytvořit platbu.");
        return;
    }

    window.location.href = data.url;
}

