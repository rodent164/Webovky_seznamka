const SUPABASE_URL = "https://fhsptjjfxseijrironas.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoc3B0ampmeHNlaWpyaXJvbmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTg0NDQsImV4cCI6MjEwMTI5NDQ0NH0.jvEjiZQdsbVXvKT02D5ADISKli28VCmaVMpbM3h88yw";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

supabaseClient.rpc('test_auth_role').then(({ data, error }) => {
    console.log("ROLE FROM SUPABASE:", data);
    console.log("ROLE ERROR:", error);
});

document.addEventListener('DOMContentLoaded', async () => {
    const eventId = new URLSearchParams(window.location.search).get('event_id');

    const futureInterest = new URLSearchParams(window.location.search).get('future');

    const isFutureInterest = futureInterest === 'true';

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
            event_date,
            event_time,
            location,
            category_id,
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

            const registrationData = {
                nickname: form.elements.nickname.value.trim(),
                gender: selectedGender.value,
                age: Number(form.elements.age.value),
                email: form.elements.email.value.trim(),
                phone: form.elements.phone.value.trim(),
                event_id: form.elements.event_id.value
            };

            console.log("Odesílám:", registrationData);

            // let minAge = eventData.age_min;
            // let maxAge = eventData.age_max;

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

            if (!isFutureInterest) {

                console.log("START CAPACITY CHECK");
                console.log("EVENT:", registrationData.event_id);
                console.log("GENDER:", registrationData.gender);

                const { data: registrations, error: countError } =
                    await supabaseClient
                        .from('registrations')
                        .select('user_id, users(gender)')
                        .eq('event_id', registrationData.event_id);

                console.log("EVENT REGISTRATIONS:", registrations);
                console.log("CAPACITY ERROR:", countError);

                if (countError) {
                    console.error("COUNT ERROR:", countError);
                    alert("Nepodařilo se ověřit kapacitu akce.");
                    return;
                }

                const sameGenderRegistrations = registrations.filter(
                    registration =>
                        registration.users &&
                        registration.users.gender === registrationData.gender
                );

                const capacity = registrationData.gender === "Muž"
                    ? eventData.capacity_m
                    : eventData.capacity_f;

                console.log("SAME GENDER:", sameGenderRegistrations);
                console.log("CAPACITY:", capacity);
                console.log("COUNT:", sameGenderRegistrations.length);

                if (sameGenderRegistrations.length >= capacity) {
                    alert(
                        `Kapacita pro pohlaví ${registrationData.gender.toLowerCase()} na této akci je již naplněná. Změňte si pohlaví nebo se přihlaste na jinou akci.`
                    );
                    return;
                }
            }



            // 1) vytvoření uživatele
            let user;
            let userError;

            // Zkusíme najít uživatele podle emailu
            const { data: existingUser, error: findUserError } =
                await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('email', registrationData.email)
                    .maybeSingle();

            if (findUserError) {
                console.error("FIND USER ERROR:", findUserError);
                alert("Nepodařilo se ověřit uživatele.");
                return;
            }

            // Uživatel už existuje → zkontrolujeme registraci na tuto akci
            if (existingUser) {

                const {
                    data: existingRegistration,
                    error: registrationCheckError
                } = await supabaseClient
                    .from('registrations')
                    .select('id')
                    .eq('user_id', existingUser.id)
                    .eq('event_id', registrationData.event_id)
                    .maybeSingle();

                if (registrationCheckError) {
                    console.error(
                        "REGISTRATION CHECK ERROR:",
                        registrationCheckError
                    );

                    alert(
                        "Nepodařilo se ověřit, zda už jste na této akci registrováni."
                    );

                    return;
                }

                if (existingRegistration) {
                    alert("Na tuto akci už jste registrováni.");
                    return;
                }

                // Není registrován → aktualizujeme údaje
                const result = await supabaseClient
                    .from('users')
                    .update({
                        nickname: registrationData.nickname,
                        age: registrationData.age
                    })
                    .eq('id', existingUser.id)
                    .select()
                    .single();

                user = result.data;
                userError = result.error;

            } else {

                // Uživatel ještě neexistuje → vytvoříme ho
                const result = await supabaseClient
             
                    .from('users')
                    .insert({
                        nickname: registrationData.nickname,
                        age: registrationData.age,
                        email: registrationData.email,
                        gender: registrationData.gender,
                        user_code: generateUserCode()
                    })
                    .select()
                    .single();

                user = result.data;
                userError = result.error;
            }

            console.log("USER DATA:", user);
            console.log("USER ERROR:", userError);

            if (userError) {
                console.error("USER ERROR OBJECT:", userError);

                alert(
                    "Chyba při ukládání uživatele: "
                    + JSON.stringify(userError)
                );

                return;
            }

            if (isFutureInterest) {

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
                        "FUTURE INTEREST ERROR: "
                        + JSON.stringify(futureInterestError)
                    );

                    return;
                }

                console.log("FUTURE INTEREST SAVED");

                alert(
                    "Děkujeme! Zájem o budoucí akci byl uložen."
                );

                window.location.href = 'index.html';

                return;
            }

            // 2) vytvoření rezervace
            const { error: registrationError } = await supabaseClient
                .from('registrations')
                .insert({
                    user_id: user.id,
                    event_id: registrationData.event_id,
                    status: 'reserved'
                });

            if (registrationError) {
                console.error(registrationError);

                alert(
                    "Chyba při rezervaci: "
                    + registrationError.message
                );

                return;
            }

            // uložení pro review stránku
            sessionStorage.setItem(
                'registrationDetails',
                JSON.stringify(registrationData)
            );

            window.location.href = 'review.html';

        } finally {

            form.dataset.submitting = 'false';
        }

    });
});