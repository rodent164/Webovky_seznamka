document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#registrationForm');
    const phone = document.querySelector('#phone');
    const genderError = document.querySelector('.gender-error');
    const success = document.querySelector('#formSuccess');

    const isCzechPhone = (value) => {
        const normalized = value.replace(/[\s().-]/g, '');
        return /^(?:(?:\+|00)420)?[2-7]\d{8}$/.test(normalized);
    };

    phone.addEventListener('input', () => phone.setCustomValidity(''));

    form.addEventListener('submit', (event) => {
        const selectedGender = form.querySelector('input[name="gender"]:checked');
        phone.setCustomValidity(isCzechPhone(phone.value) ? '' : 'Zadejte platné české telefonní číslo.');
        genderError.hidden = Boolean(selectedGender);

        if (!form.checkValidity() || !selectedGender) {
            event.preventDefault();
            form.classList.add('was-validated');
            return;
        }

        event.preventDefault();
        form.reset();
        form.classList.remove('was-validated');
        success.hidden = false;
    });
});
