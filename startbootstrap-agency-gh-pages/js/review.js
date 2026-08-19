const paymentUserId = sessionStorage.getItem('paymentUserId');

console.log("PAYMENT USER ID:", paymentUserId);

document.addEventListener('DOMContentLoaded', () => {
    const savedRegistration = sessionStorage.getItem('registrationDetails');
    let details;

    if (!savedRegistration) {
        window.location.replace('rezervace.html');
        return;
    }

    try {
        details = JSON.parse(savedRegistration);
        const fields = {
            reviewName: details.name,
            reviewGender: details.gender,
            reviewAge: details.age,
            reviewEmail: details.email,
            reviewPhone: details.phone
        };

        Object.entries(fields).forEach(([id, value]) => {
            document.querySelector(`#${id}`).textContent = value || '—';
        });
    } catch (error) {
        sessionStorage.removeItem('registrationDetails');
        window.location.replace('rezervace.html');
        return;
    }

    document.querySelector('#confirmRegistration').addEventListener('click', async (event) => {
        const button = event.currentTarget;

        button.disabled = true;
        button.textContent = 'Přesměrování na platbu…';

        try {
            const paymentUserId = sessionStorage.getItem('paymentUserId');
            const details = JSON.parse(
                sessionStorage.getItem('registrationDetails')
            );

            const { data, error } =
                await supabaseClient.functions.invoke(
                    'create-checkout-session',
                    {
                        body: {
                            eventId: details.event_id,
                            userId: paymentUserId
                        }
                    }
                );

            if (error || !data?.url) {
                console.error("STRIPE ERROR:", error);
                console.error("STRIPE DATA:", data);

                throw new Error(
                    error?.message || 'Nepodařilo se vytvořit platbu.'
                );
            }

            window.location.assign(data.url);

        } catch (error) {
            console.error("PAYMENT ERROR:", error);

            button.disabled = false;
            button.textContent = 'Zaplatit a potvrdit registraci';

            alert('Platbu se nepodařilo zahájit. Zkuste to prosím znovu.');
        }
    });
});
