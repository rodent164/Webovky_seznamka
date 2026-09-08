supabaseClient.rpc('test_auth_role').then(({ data, error }) => {
    console.log("ROLE FROM SUPABASE:", data);
    console.log("ROLE ERROR:", error);
});

document.addEventListener('DOMContentLoaded', async () => {
    const eventId = new URLSearchParams(window.location.search).get('event_id');

    const futureInterest = new URLSearchParams(window.location.search).get('future');

    const isFutureInterest = futureInterest === 'true';

    console.log("FUTURE INTEREST PARAM:", futureInterest);
    console.log("IS FUTURE INTEREST:", isFutureInterest);

    const eventDetailsInfo = document.querySelector('.event-details-info');

    if (eventDetailsInfo && isFutureInterest) {
        eventDetailsInfo.style.display = 'none';
    }

    console.log("IS FUTURE INTEREST:", isFutureInterest);
    console.log("FUTURE INTEREST:", futureInterest);

    const eventIdInput = document.querySelector('#event_id');

    if (eventIdInput && eventId) {
        eventIdInput.value = eventId;
    }

    console.log("EVENT ID FROM URL:", eventId);



    let eventData = null;

    if (!isFutureInterest) {

        const { data, error } = await supabaseClient
            .from('events')
            .select(`
            age_min,
            age_max,
            capacity_m,
            capacity_f,
            capacity_m_f,
            event_date,
            event_time,
            location,
            category_id,
            price,
            event_categories (
            name
        )
        `)
            .eq('id', eventId)
            .single();

        if (error) {
            console.error("EVENT ERROR:", error);
            return;
        }

        eventData = data;

        const minAgeElement = document.querySelector('.minAge');
        const maxAgeElement = document.querySelector('.maxAge');

        if (minAgeElement) {
            minAgeElement.textContent = eventData.age_min;
        }

        if (maxAgeElement) {
            maxAgeElement.textContent = eventData.age_max;
        }

        const eventDateElement = document.querySelector('.eventDate');
        const eventTimeElement = document.querySelector('.eventTime');
        const eventLocationElement = document.querySelector('.eventLocation');
        const eventPriceElement = document.querySelector('.eventPrice');

        if (eventDateElement) {
            const [year, month, day] = eventData.event_date.split('-');
            eventDateElement.textContent =
                `${Number(day)}. ${Number(month)}. ${year}`;
        }

        if (eventTimeElement) {
            eventTimeElement.textContent =
                eventData.event_time.slice(0, 5);
        }

        if (eventLocationElement) {
            eventLocationElement.textContent =
                eventData.location;
        }

        if (eventPriceElement) {
            eventPriceElement.textContent =
                eventData.price;
        }

        console.log("EVENT AGE LIMITS:", eventData);
    }

    const categoryId = isFutureInterest
        ? new URLSearchParams(window.location.search).get('category_id')
        : eventData.category_id;


    const { data: categoryData, error: categoryError } =
        await supabaseClient
            .from('event_categories')
            .select('name')
            .eq('id', categoryId)
            .single();

    if (categoryError) {
        console.error("CATEGORY ERROR:", categoryError);
    } else {
        console.log("CATEGORY DATA:", categoryData);
        const eventNameElement = document.querySelector('.registration-event-name');
        if (eventNameElement) {
            eventNameElement.textContent = categoryData.name;
        }
    }


    const form = document.querySelector('#registrationForm');
    const phone = document.querySelector('#phone');
    const genderError = document.querySelector('.gender-error');

    const generateUserCode = () => {
        console.log("generateUserCode called");
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';

        for (let i = 0; i < 6; i++) {
            code += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );
        }

        return code;
    };

    form.addEventListener('invalid', (event) => {
        console.log("INVALID FIELD:", event.target);
    }, true);

    const isCzechPhone = (value) => {
        const normalized = value.replace(/[\s().-]/g, '');
        return /^(?:(?:\+|00)420)?[2-7]\d{8}$/.test(normalized);
    };


    phone.addEventListener('input', () => {
        phone.setCustomValidity('');
    });


    form.addEventListener('submit', async (event) => {

        console.log("SUBMIT EVENT", form.dataset.submitting);

        if (form.dataset.submitting === 'true') {
            return;
        }

        event.preventDefault();

        form.dataset.submitting = 'true';

        try {

            console.log("SUBMIT START");
            console.log("FORM DATA:", {
                nickname: form.elements.nickname.value,
                age: form.elements.age.value,
                email: form.elements.email.value,
                phone: form.elements.phone.value,
                gender: form.querySelector('input[name="gender"]:checked')?.value
            });

            const selectedGender = form.querySelector(
                'input[name="gender"]:checked'
            );

            // kontrola telefonu pouze pokud byl vyplněn
            if (phone.value.trim() !== '') {
                phone.setCustomValidity(
                    isCzechPhone(phone.value)
                        ? ''
                        : 'Zadejte platné české telefonní číslo.'
                );
            } else {
                phone.setCustomValidity('');
            }

            genderError.hidden = Boolean(selectedGender);

            if (!form.checkValidity() || !selectedGender) {
                form.classList.add('was-validated');
                return;
            }

            if (isFutureInterest && !form.elements.marketing.checked) {
                alert(
                    "Pro registraci jako zájemce o budoucí akci je nutné souhlasit s přijímáním e-mailů s informacemi o dalších chystaných akcích."
                );
                return;
            }

            const registrationData = {
                nickname: form.elements.nickname.value.trim(),
                gender: selectedGender.value,
                age: Number(form.elements.age.value),
                email: form.elements.email.value.trim(),
                phone: form.elements.phone.value.trim(),
                allow_email_info: form.elements.marketing.checked,
                event_id: form.elements.event_id.value
            };

            console.log("Odesílám:", registrationData);


            // ============================================================
            // 1) KONTROLA VĚKU
            // ============================================================

            if (!isFutureInterest) {

                if (
                    registrationData.age < eventData.age_min ||
                    registrationData.age > eventData.age_max
                ) {
                    alert(
                        `Tato akce je určena pro věk ${eventData.age_min}–${eventData.age_max} let.`
                    );
                    return;
                }
            }


            // ============================================================
            // 2) KONTROLA KAPACITY
            // ============================================================

            if (!isFutureInterest) {

                console.log("START CAPACITY CHECK");
                console.log("EVENT:", registrationData.event_id);
                console.log("GENDER:", registrationData.gender);

                const { data: hasCapacity, error: capacityError } =
                    await supabaseClient.rpc('check_event_capacity', {
                        event_id_input: registrationData.event_id,
                        gender_input: registrationData.gender
                    });

                console.log("HAS CAPACITY:", hasCapacity);
                console.log("CAPACITY ERROR:", capacityError);

                if (capacityError) {
                    console.error("CAPACITY ERROR:", capacityError);
                    alert("Nepodařilo se ověřit kapacitu akce.");
                    return;
                }

                if (!hasCapacity) {
                    alert(
                        "Kapacita této akce je již naplněná. Přihlaste se na jinou akci nebo se zaregistrujte jako zájemce o tuto akci v budoucnu."
                    );
                    return;
                }


            }


            // ============================================================
            // 3) NAJDEME NEBO VYTVOŘÍME UŽIVATELE
            // ============================================================

            let user;
            let userError;

            const { data: existingUser, error: findUserError } =
                await supabaseClient
                    .rpc('find_user_by_email', {
                        user_email: registrationData.email
                    })
                    .maybeSingle();

            console.log("EMAIL HLEDÁNÍ:", registrationData.email);
            console.log("EXISTING USER:", existingUser);
            console.log("FIND USER ERROR:", findUserError);

            if (findUserError) {

                console.error("FIND USER ERROR:", findUserError);

                alert("Nepodařilo se ověřit uživatele.");

                return;
            }


            if (existingUser) {

                console.log("EXISTUJÍCÍ UŽIVATEL:", existingUser.id);

                if (existingUser.gender !== registrationData.gender) {

                    alert(
                        "Tento e-mail už byl zaregistrovaný pod jiným pohlavím. Chcete-li pohlaví změnit, napište nám prosím přes kontaktní formulář."
                    );

                    return;
                }


                // Aktualizujeme údaje existujícího uživatele
                const { error } =
                    await supabaseClient.rpc(
                        'update_user_registration',
                        {
                            user_id: existingUser.id,
                            new_nickname: registrationData.nickname,
                            new_age: registrationData.age,
                            new_allow_email_info: registrationData.allow_email_info,
                        }
                    );

                user = {
                    id: existingUser.id
                };

                userError = error;


            } else {

                console.log("JDU DO INSERTU NOVÉHO UŽIVATELE");
                console.log("PHONE Z FORMULÁŘE:", registrationData.phone);

                const { data: newUserId, error: createUserError } =
                    await supabaseClient.rpc('create_user_registration', {
                        new_nickname: registrationData.nickname,
                        new_age: registrationData.age,
                        new_email: registrationData.email,
                        new_phone: registrationData.phone,
                        new_gender: registrationData.gender,
                        new_allow_email_info: registrationData.allow_email_info,
                        new_user_code: generateUserCode()
                    });

                console.log("NEW USER ID:", newUserId);
                console.log("CREATE USER ERROR:", createUserError);

                if (createUserError || !newUserId) {
                    console.error("CREATE USER FAILED:", createUserError);
                    throw new Error("Nepodařilo se vytvořit uživatele.");
                }

                user = {
                    id: newUserId
                };

                userError = null;
            }


            console.log("USER:", user);
            console.log("USER ERROR:", userError);


            if (userError) {

                console.error("USER ERROR OBJECT:", userError);

                alert(
                    "Chyba při ukládání uživatele: " +
                    JSON.stringify(userError)
                );

                return;
            }
            console.log("=== PŘED FUTURE INTEREST BLOKEM ===");
            console.log("isFutureInterest:", isFutureInterest);
            console.log("userError:", userError);
            console.log("categoryId:", categoryId);


            // ============================================================
            // 4) BUDOUCÍ ZÁJEM
            // ============================================================

            if (isFutureInterest) {

                const { data: existingInterest, error: interestCheckError } =
                    await supabaseClient.rpc(
                        'check_future_interest',
                        {
                            p_user_id: user.id,
                            p_category_id: Number(categoryId)
                        }
                    );


                if (interestCheckError) {

                    console.error(
                        "FUTURE INTEREST CHECK ERROR:",
                        interestCheckError
                    );

                    alert(
                        "Nepodařilo se ověřit váš předchozí zájem o tuto akci."
                    );

                    return;
                }


                if (existingInterest) {

                    alert(
                        "O tuto akci jste již projevil/a zájem."
                    );

                    return;
                }


                const { error: futureInterestError } =
                    await supabaseClient
                        .from('future_event_interests')
                        .insert({
                            user_id: user.id,
                            category_id: Number(categoryId),
                            status: 'interested'
                        });


                if (futureInterestError) {

                    console.error(
                        "FUTURE INTEREST ERROR:",
                        futureInterestError
                    );

                    alert(
                        "Nepodařilo se uložit váš zájem o budoucí akci: " +
                        futureInterestError.message
                    );

                    return;
                }


                // Uložíme údaje pro review stránku
                sessionStorage.setItem(
                    'registrationDetails',
                    JSON.stringify(registrationData)
                );

                sessionStorage.setItem(
                    'paymentUserId',
                    user.id
                );

                sessionStorage.setItem(
                    'futureInterest',
                    'true'
                );
                window.location.href = 'future-review.html';

                return;
            }


            // ============================================================
            // 5) NORMÁLNÍ REGISTRACE
            // ============================================================

            sessionStorage.setItem(
                'registrationDetails',
                JSON.stringify(registrationData)
            );

            sessionStorage.setItem(
                'paymentUserId',
                user.id
            );

            sessionStorage.removeItem('futureInterest');

            window.location.href = 'review.html';


        } finally {

            form.dataset.submitting = 'false';
        }

    });


});
