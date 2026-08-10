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


    // Load event registrations
    loadGenderCount();

});


// Count men and women from Supabase
async function loadGenderCount() {

    const { data, error } = await supabaseClient
        .from('registrations')
        .select('gender, user_id');

    console.log("REGISTRATIONS DATA:", data);
    console.log("REGISTRATIONS ERROR:", error);

    if (error) {
        console.error("Supabase error:", error);
        return;
    }

    let men = 0;
    let women = 0;

    for (const registration of data) {

        if (registration.gender === "Muž") {
            men++;
        }

        if (registration.gender === "Žena") {
            women++;
        }
    }

    const menElement = document.getElementById("menCount");
    const womenElement = document.getElementById("womenCount");

    if (menElement) {
        menElement.textContent = men;
    }

    if (womenElement) {
        womenElement.textContent = women;
    }
}