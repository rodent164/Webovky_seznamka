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

    const eventIdInput = document.querySelector('#event_id');

    if (eventIdInput) {
        eventIdInput.value = eventId;
    }

    console.log("EVENT ID FROM URL:", eventId);

    const { data: eventData, error: eventError } = await supabaseClient
    .from('events')
    .select('age_min, age_max, capacity_m, capacity_f')
    .eq('id', eventId)
    .single();

if (eventError) {
    console.error("EVENT ERROR:", eventError);
    return;
}

console.log("EVENT AGE LIMITS:", eventData);

    


    const form = document.querySelector('#registrationForm');
    const phone = document.querySelector('#phone');
    const genderError = document.querySelector('.gender-error');


    const isCzechPhone = (value) => {
        const normalized = value.replace(/[\s().-]/g, '');
        return /^(?:(?:\+|00)420)?[2-7]\d{8}$/.test(normalized);
    };


    phone.addEventListener('input', () => {
        phone.setCustomValidity('');
    });


    form.addEventListener('submit', async (event) => {
        
    if (form.dataset.submitting === 'true') {
        return;
    }

    form.dataset.submitting = 'true';

    event.preventDefault();


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


if (
    registrationData.age < eventData.age_min ||
    registrationData.age > eventData.age_max
) {
    alert(
        `Tato akce je určena pro věk ${eventData.age_min}–${eventData.age_max} let.`
    );

    return;
}
const { count, error: countError } = await supabaseClient
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', registrationData.event_id)
    .eq('gender', registrationData.gender);

if (countError) {
    console.error("COUNT ERROR:", countError);

    alert("Nepodařilo se ověřit kapacitu akce.");
    return;
}

const capacity = registrationData.gender === "Muž"
    ? eventData.capacity_m
    : eventData.capacity_f;

if (count >= capacity) {
    alert(
        `Kapacita pro pohlaví ${registrationData.gender.toLowerCase()} na této akci je již naplněná. Změňte si pohlaví nebo se přihlaště ne jinou akci.`
    );

    return;
}

// 1) vytvoření uživatele
const { data: user, error: userError } = await supabaseClient
    .from('users')
    .insert({
        nickname: registrationData.nickname,
        age: registrationData.age,
        email: registrationData.email
    })
    .select()
    .single();

    console.log("USER DATA:", user);
    console.log("USER ERROR:", userError);
            


        if (userError) {
    console.log("USER ERROR OBJECT:", userError);
    console.log("USER ERROR JSON:", JSON.stringify(userError, null, 2));

    alert(
        "Chyba při ukládání uživatele: "
        + JSON.stringify(userError)
    );

    return;
}



        // 2) vytvoření rezervace
        const { error: registrationError } = await supabaseClient
            .from('registrations')
            .insert({

                user_id: user.id,

                event_id: registrationData.event_id,

                gender: registrationData.gender,

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

    });

});