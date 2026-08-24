
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
        alert("KLIK NA ZAPLATIT");
        const button = event.currentTarget;

        button.disabled = true;
        button.textContent = 'Přesměrování na platbu…';

        try {
            const paymentUserId = sessionStorage.getItem('paymentUserId');
            const details = JSON.parse(
                sessionStorage.getItem('registrationDetails')
            );

            console.log("USER ID FOR INSERT:", paymentUserId);
            console.log("EVENT ID FOR INSERT:", details.event_id);
            alert("JDU VYTVÁŘET REGISTRACI");

            let registration;
            let registrationError;

            const { data: existingRegistration, error: existingRegistrationError } =
                await supabaseClient
                    .from('registrations')
                    .select('id, status')
                    .eq('user_id', paymentUserId)
                    .eq('event_id', details.event_id)
                    .maybeSingle();

            if (existingRegistrationError) {
                throw new Error("Nepodařilo se ověřit existující rezervaci.");
            }

            if (existingRegistration) {
                console.log("EXISTUJÍCÍ REGISTRACE:", existingRegistration);

                registration = existingRegistration;
            } else {
                const result = await supabaseClient
                    .from('registrations')
                    .insert({
                        user_id: paymentUserId,
                        event_id: details.event_id,
                        status: 'reserved'
                    })
                    .select('id, status')
                    .single();

                registration = result.data;
                registrationError = result.error;
            }

            if (registrationError) {
                console.error("REGISTRATION ERROR:", registrationError);
                throw new Error("Nepodařilo se vytvořit rezervaci.");
            }

            if (registrationError) {
                console.error("REGISTRATION ERROR:", registrationError);
                throw new Error("Nepodařilo se vytvořit rezervaci.");
            }

            console.log("REGISTRATION CREATED:", registration);
            console.log("REGISTRATION OBJECT BEFORE STRIPE:", registration);
            console.log("REGISTRATION ID BEFORE STRIPE:", registration.id);

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
            console.log("SENDING TO STRIPE:", {
                eventId: details.event_id,
                userId: paymentUserId,
                registrationId: registration.id,
                email: details.email
            });

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