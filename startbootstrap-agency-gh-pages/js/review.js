document.addEventListener('DOMContentLoaded', () => {
    const savedRegistration = sessionStorage.getItem('registrationDetails');

    if (!savedRegistration) {
        window.location.replace('rezervace.html');
        return;
    }

    try {
        const details = JSON.parse(savedRegistration);
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

    document.querySelector('#confirmRegistration').addEventListener('click', () => {
        sessionStorage.removeItem('registrationDetails');
        document.querySelector('#reviewContent').innerHTML = `
            <div class="text-center registration-confirmation" role="status">
                <h1 class="section-heading text-uppercase">Děkujeme!</h1>
                <p class="registration-intro">Vaše registrace byla potvrzena.</p>
                <a class="btn btn-primary btn-xl text-uppercase" href="index.html">Zpět na hlavní stránku</a>
            </div>`;
    });
});
