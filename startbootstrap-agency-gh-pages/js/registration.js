document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#registrationForm');
    const phone = document.querySelector('#phone');
    const genderError = document.querySelector('.gender-error');

    const isCzechPhone = (value) => {
        const normalized = value.replace(/[\s().-]/g, '');
        return /^(?:(?:\+|00)420)?[2-7]\d{8}$/.test(normalized);
    };

    phone.addEventListener('input', () => phone.setCustomValidity(''));

    const savedRegistration = sessionStorage.getItem('registrationDetails');
    if (savedRegistration) {
        try {
            const details = JSON.parse(savedRegistration);
            form.elements.name.value = details.name || '';
            form.elements.gender.value = details.gender || '';
            form.elements.age.value = details.age || '';
            form.elements.email.value = details.email || '';
            form.elements.phone.value = details.phone || '';
        } catch (error) {
            sessionStorage.removeItem('registrationDetails');
        }
    }

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
        sessionStorage.setItem('registrationDetails', JSON.stringify({
            name: form.elements.name.value.trim(),
            gender: selectedGender.value,
            age: form.elements.age.value,
            email: form.elements.email.value.trim(),
            phone: form.elements.phone.value.trim()
        }));
        window.location.href = 'review.html';
    });
});
