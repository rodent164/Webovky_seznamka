document.addEventListener('DOMContentLoaded', async () => {
    const status = document.querySelector('#paymentStatus');
    const homeLink = document.querySelector('#homeLink');
    const sessionId = new URLSearchParams(window.location.search).get('session_id');

    if (!sessionId) {
        status.textContent = 'Platební relace nebyla nalezena.';
        homeLink.classList.remove('d-none');
        return;
    }

    try {
        const response = await fetch(`/api/checkout-session/${encodeURIComponent(sessionId)}`);
        const result = await response.json();

        if (!response.ok || !result.paid) {
            throw new Error(result.error || 'Payment has not completed.');
        }

        sessionStorage.removeItem('registrationDetails');
        document.querySelector('.section-heading').textContent = 'Děkujeme!';
        status.textContent = 'Vaše platba i registrace byly potvrzeny.';
    } catch (error) {
        status.textContent = 'Platbu se nepodařilo ověřit. Pokud vám byla částka stržena, kontaktujte prosím pořadatele.';
    }

    homeLink.classList.remove('d-none');
});
