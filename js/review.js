
const paymentUserId = sessionStorage.getItem('paymentUserId');

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
            reviewNickname: details.nickname,
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
        //alert("KLIK NA ZAPLATIT");
        const button = event.currentTarget;

        button.disabled = true;
        button.textContent = 'Přesměrování na platbu…';

        try {
            const paymentUserId = sessionStorage.getItem('paymentUserId');
            const details = JSON.parse(
                sessionStorage.getItem('registrationDetails')
            );

            let registration;
            let registrationError;
            
            const { data: newRegistrationId, error: createRegistrationError } =
                await supabaseClient.rpc(
                    'create_registration',
                    {
                        p_user_id: paymentUserId,
                        p_event_id: details.event_id
                    }
                );

            registration = newRegistrationId
                ? {
                    id: newRegistrationId,
                    status: 'reserved'
                }
                : null;

            registrationError = createRegistrationError;


            if (registrationError) {
                console.error("REGISTRATION ERROR:", registrationError);
                throw new Error("Nepodařilo se vytvořit rezervaci.");
            }

            if (registrationError) {
                console.error("REGISTRATION ERROR:", registrationError);
                throw new Error("Nepodařilo se vytvořit rezervaci.");
            }


            const { data, error } =
                await supabaseClient.functions.invoke(
                    'create-checkout-session',
                    {
                        body: {
                            eventId: details.event_id,
                            userId: paymentUserId,
                            registrationId: registration.id,
                            email: details.email
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

window.addEventListener('pageshow', () => {
    const button = document.querySelector('#confirmRegistration');

    if (button) {
        button.disabled = false;
        button.textContent = 'Zaplatit a potvrdit registraci';
    }
});