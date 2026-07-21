/*!
* Start Bootstrap - Agency v7.0.12 (https://startbootstrap.com/theme/agency)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-agency/blob/master/LICENSE)
*/
//
// Scripts
// 

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


// Count men and women from Google Sheets
function loadGenderCount() {

    const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSBaJVngtTeBAUL8_Ns0TMnYzjA86ul0pHn95VGIi77vp8sKdPkQxNEJkT12uua9lYU5gzLovvHJEh/pub?gid=859303276&single=true&output=csv";


    fetch(sheetUrl)
        .then(response => response.text())
        .then(data => {

            const rows = data.trim().split("\n");

            // First row contains column names
            const headers = rows[0].split(",");

            const genderIndex = headers.indexOf("Pohlaví");

            let men = 0;
            let women = 0;


            rows.slice(1).forEach(row => {

                const values = row.split(",");

                const gender = values[genderIndex]?.trim();


                if (gender === "Muž") {
                    men++;
                }

                if (gender === "Žena") {
                    women++;
                }

            });


            // Update HTML only if elements exist
            const menElement = document.getElementById("menCount");
            const womenElement = document.getElementById("womenCount");


            if (menElement) {
                menElement.textContent = men;
            }

            if (womenElement) {
                womenElement.textContent = women;
            }

        })
        .catch(error => {
            console.error("Google Sheets error:", error);
        });

}