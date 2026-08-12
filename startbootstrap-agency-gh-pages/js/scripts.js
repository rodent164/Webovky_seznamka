const SUPABASE_URL = "https://fhsptjjfxseijrironas.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoc3B0ampmeHNlaWpyaXJvbmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTg0NDQsImV4cCI6MjEwMTI5NDQ0NH0.jvEjiZQdsbVXvKT02D5ADISKli28VCmaVMpbM3h88yw";



const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// Navbar shrink function
window.addEventListener('DOMContentLoaded', event => {

    var navbarShrink = function () {
        const navbarCollapsible = document.body.querySelector('#mainNav');

        if (!navbarCollapsible) {
            return;
        }

        if (window.scrollY === 0) {
            navbarCollapsible.classList.remove('navbar-shrink');
        } else {
            navbarCollapsible.classList.add('navbar-shrink');
        }
    };

    // Shrink the navbar
    navbarShrink();

    // Shrink the navbar when page is scrolled
    document.addEventListener('scroll', navbarShrink);


    // Activate Bootstrap scrollspy
    const mainNav = document.body.querySelector('#mainNav');

    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            rootMargin: '0px 0px -40%',
        });
    }


    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');

    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );

    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {

            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }

        });
    });

    const link = document.querySelector('#portfolioModal1 .registration-link');

    if (link) {
        link.addEventListener('click', async (event) => {

            event.preventDefault();

            const eventId = link.dataset.eventId;

            console.log("REGISTRATION EVENT ID:", eventId);

            window.location.href = `rezervace.html?event_id=${eventId}`;
        });
    }


    // Count men and women from Supabase
    async function loadEventInfo() {

        const modals = document.querySelectorAll('.portfolio-modal[data-event-name]');

        for (const modal of modals) {

            const eventName = modal.dataset.eventName;

            // Najdeme ID akce podle názvu
            const { data: events, error: eventError } = await supabaseClient
                .from('events')
                .select('id, capacity_m, capacity_f, event_time, event_date, location, age_min, age_max')
                .eq('name', eventName)

            console.log("EVENT VARIANTS:", events);

            if (eventError) {
                console.error(`Event "${eventName}" error:`, eventError);
                continue;
            }

            console.log("AGES:", events.map(event => ({
                min: event.age_min,
                max: event.age_max
            })));

            const ageOptions = modal.parentElement.querySelector('.age-options');
            console.log("AGE OPTIONS ELEMENT:", ageOptions);

            for (const event of events) {
                const ageButton = document.createElement('button');
                ageButton.dataset.eventId = event.id;
                ageButton.textContent = `${event.age_min}–${event.age_max} let`;
                ageButton.addEventListener('click', async () => {
                    const modal = document.querySelector('#portfolioModal1');

                    const eventDateElement = modal.querySelector('.event-date');
                    const eventTimeElement = modal.querySelector('.event-time');
                    const eventLocationElement = modal.querySelector('.event-location');

                    eventDateElement.textContent = event.event_date;
                    eventTimeElement.textContent = event.event_time;
                    eventLocationElement.textContent = event.location;

                    const registrationLink = modal.querySelector('.registration-link');

                    registrationLink.dataset.eventId = event.id;
                    const { data: registrations, error: registrationError } =
                        await supabaseClient
                            .from('registrations')
                            .select('user_id, users(gender)')
                            .eq('event_id', event.id);

                    if (registrationError) {
                        console.error("REGISTRATION ERROR:", registrationError);
                        return;
                    }

                    let men = 0;
                    let women = 0;

                    for (const registration of registrations) {
                        if (registration.users.gender === "Muž") {
                            men++;
                        }

                        if (registration.users.gender === "Žena") {
                            women++;
                        }
                    }
                    const menElement = modal.querySelector('.men-count');
                    const womenElement = modal.querySelector('.women-count');

                    if (menElement) {
                        menElement.textContent = men;
                    }

                    if (womenElement) {
                        womenElement.textContent = women;
                    }

                    const menCapacityElement = modal.querySelector('.men-capacity');
                    const womenCapacityElement = modal.querySelector('.women-capacity');

                    if (menCapacityElement) {
                        menCapacityElement.textContent = event.capacity_m;
                    }

                    if (womenCapacityElement) {
                        womenCapacityElement.textContent = event.capacity_f;
                    }


                });
                ageOptions.appendChild(ageButton);
            }
        } // konec for (const modal of modals)

    } // konec loadEventInfo()

    loadEventInfo();

}); // konec window.addEventListener('DOMContentLoaded', ...)
