document.addEventListener('DOMContentLoaded', async () => {
    const status = document.querySelector('#paymentStatus');
    const homeLink = document.querySelector('#homeLink');
    const sessionId = new URLSearchParams(window.location.search).get('session_id');

    if (!sessionId) {
        status.textContent = 'Platební relace nebyla nalezena.';
        homeLink.classList.remove('d-none');
        return;
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
            const response = await fetch(`/api/checkout-session/${encodeURIComponent(sessionId)}`);
            const result = await response.json();

            if (response.ok && result.paid) {
                sessionStorage.removeItem('registrationDetails');
                document.querySelector('.section-heading').textContent = 'Děkujeme!';
                status.textContent = 'Vaše platba i registrace byly potvrzeny.';
                homeLink.classList.remove('d-none');
                return;
            }
        } catch (error) {
            // The webhook may still be on its way. Keep trying for a short period.
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }

    status.textContent = 'Platba se stále ověřuje. Pokud vám byla částka stržena, kontaktujte prosím pořadatele.';
    homeLink.classList.remove('d-none');
});
