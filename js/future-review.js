document.addEventListener('DOMContentLoaded', () => {

    const savedRegistration =
        sessionStorage.getItem('registrationDetails');

    if (!savedRegistration) {
        window.location.replace('rezervace.html');
        return;
    }

    let details;

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
            const element = document.querySelector(`#${id}`);

            if (element) {
                element.textContent = value || '—';
            }
        });

    } catch (error) {

        console.error("CHYBA PŘI NAČÍTÁNÍ ÚDAJŮ:", error);

        sessionStorage.removeItem('registrationDetails');
        window.location.replace('rezervace.html');
        return;
    }


    const button =
        document.querySelector('#confirmRegistration');

    if (!button) {
        return;
    }


    button.textContent = 'Potvrdit zájem';


    button.addEventListener('click', () => {

        button.disabled = true;
        button.textContent = 'Potvrzeno ✓';

        alert(
            'Děkujeme! Váš zájem o budoucí akci byl uložen.'
        );

        sessionStorage.removeItem('registrationDetails');
        sessionStorage.removeItem('paymentUserId');
        sessionStorage.removeItem('futureInterest');

        window.location.href = 'index.html';
    });

});