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
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: details.email })
            });
            const result = await response.json();

            if (!response.ok || !result.url) {
                throw new Error(result.error || 'Unable to create Checkout Session.');
            }

            window.location.assign(result.url);
        } catch (error) {
            button.disabled = false;
            button.textContent = 'Zaplatit a potvrdit registraci';
            alert('Platbu se nepodařilo zahájit. Zkuste to prosím znovu.');
        }
    });
});
