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


    // --------------------------------------------------
    // Load event information from Supabase
    // --------------------------------------------------

    async function loadEventInfo() {
        const { data: categories, error: categoriesError } =
            await supabaseClient
                .from('event_categories')
                .select(`
            id,
            name,
            image_main,
            image_detail,
            description,
            more_info,
            events (
                id,
                capacity_m,
                capacity_f,
                event_time,
                event_date,
                location,
                age_min,
                age_max
            )
        `);

        if (categoriesError) {
            console.error("CHYBA PŘI NAČÍTÁNÍ KATEGORIÍ:", categoriesError);
            return;
        }

        console.log("NAČTENÉ KATEGORIE:", categories);

        const eventsContainer =
            document.querySelector('#events-container');

        if (!eventsContainer) {
            console.error("Nenalezen #events-container");
            return;
        }

        eventsContainer.innerHTML = '';

        for (const category of categories) {
            const modalId = `event-modal-${category.id}`;
            const column = document.createElement('div');
            column.className = 'col-lg-4 col-sm-6 mb-4';

            column.innerHTML = `
        <div class="portfolio-item">

            <a class="portfolio-link"
               data-bs-toggle="modal"
               href="#${modalId}">

                <div class="portfolio-hover">
                    <div class="portfolio-hover-content">
                        <div class="age-options"></div>
                    </div>
                </div>

                <img class="img-fluid event-main-image"
                     src=""
                     alt="${category.name}" />

            </a>

            <div class="portfolio-caption">

                <div class="portfolio-caption-heading">
                    ${category.name}
                </div>

                <div class="portfolio-caption-subheading text-muted">
                    ${category.description || ''}
                </div>

            </div>

        </div>
    `;

            const imageElement =
                column.querySelector('.event-main-image');

            const { data: imageData } =
                supabaseClient
                    .storage
                    .from('event-images')
                    .getPublicUrl(category.image_main);

            if (imageElement) {
                imageElement.src = imageData.publicUrl;
            }

            eventsContainer.appendChild(column);
            const modal = document.createElement('div');

            modal.className = 'portfolio-modal modal fade';
            modal.id = modalId;
            modal.tabIndex = -1;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-hidden', 'true');

            modal.innerHTML = `
    <div class="modal-dialog">
        <div class="modal-content">

            <button class="close-modal"
                    data-bs-dismiss="modal"
                    type="button"
                    aria-label="Zavřít okno">
                <i class="fas fa-xmark fa-2x"></i>
            </button>

            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-lg-8">

                        <div class="modal-body">

                            <h2 class="text-uppercase event-title">
                                ${category.name}
                            </h2>

                            <p class="item-intro text-muted event-description">
                                ${category.description || ''}
                            </p>

                            <div class="age-options mb-4"></div>

                            <img class="img-fluid d-block mx-auto event-detail-image"
                                 src=""
                                 alt="${category.name}" />

                            <p class="event-more-info"></p>

                            <div class="event-practical-info"
                                 style="display: none;">

                                <ul class="list-inline">

                                    <li>
                                        <strong>Kdy?</strong>
                                        <span class="event-date"></span>,
                                        <span class="event-time"></span>
                                    </li>

                                    <li>
                                        <strong>Kde?</strong>
                                        <span class="event-location"></span>
                                    </li>

                                </ul>

                                <div>
                                    Muži:
                                    <span class="men-count">0</span> /
                                    <span class="men-capacity">0</span>
                                    <br>

                                    Ženy:
                                    <span class="women-count">0</span> /
                                    <span class="women-capacity">0</span>
                                </div>

                            </div>

                            <a class="btn btn-primary btn-xl text-uppercase registration-link"
                               href="#"
                               style="display: none;">
                                <i class="fas fa-heart"></i>
                                Přihlásit se
                            </a>

                            <button class="btn btn-secondary btn-xl text-uppercase future-interest-button"
                                    type="button"
                                    style="display: none;">
                                Mám zájem o akci v budoucnu
                            </button>

                        </div>

                    </div>
                </div>
            </div>

        </div>
    </div>
`;

            document.body.appendChild(modal);
        }

        const modals = categories.map(category => ({
            category,
            modal: document.getElementById(`event-modal-${category.id}`)
        }));

        // console.log(
        //     "NALEZENÉ MODALY:",
        //     [...modals].map(modal => ({
        //         id: modal.id,
        //         eventName: modal.dataset.eventName
        //     }))
        // );


        for (const { category, modal } of modals) {

            const eventName = category.name;

            console.log("================================");
            console.log("MODAL:", modal.id);
            console.log("EVENT NAME:", eventName);


            // --------------------------------------------------
            // Find category + all events belonging to it
            // --------------------------------------------------



            const events = category.events || [];




            // --------------------------------------------------
            // Basic category information
            // --------------------------------------------------

            const descriptionElement =
                modal.querySelector('.event-description');

            if (descriptionElement) {
                descriptionElement.textContent =
                    category.description || '';
            }


            const moreInfoElement =
                modal.querySelector('.event-more-info');

            if (moreInfoElement) {
                moreInfoElement.textContent =
                    category.more_info || '';
            }


            // --------------------------------------------------
            // Main image
            // --------------------------------------------------

            const { data: imageData } =
                supabaseClient
                    .storage
                    .from('event-images')
                    .getPublicUrl(category.image_main);

            const mainImage = document.querySelector(
                `.portfolio-link[href="#${modal.id}"] img`
            );

            if (mainImage) {
                mainImage.src = imageData.publicUrl;
            }


            const imageElement =
                modal.querySelector('.event-detail-image');


            if (imageElement) {
                imageElement.src = imageData.publicUrl;
            }


            // --------------------------------------------------
            // Detail image
            // --------------------------------------------------

            const { data: detailImageData } =
                supabaseClient
                    .storage
                    .from('event-images')
                    .getPublicUrl(category.image_detail);


            if (imageElement) {
                imageElement.src = detailImageData.publicUrl;
            }


            // --------------------------------------------------
            // Practical information
            // --------------------------------------------------

            const practicalInfo =
                modal.querySelector('.event-practical-info');

            if (practicalInfo) {
                practicalInfo.style.display = 'none';
            }


            // --------------------------------------------------
            // Registration link
            // --------------------------------------------------

            const registrationLink =
                modal.querySelector('.registration-link');

            if (registrationLink) {
                registrationLink.style.display = 'none';
            }


            // --------------------------------------------------
            // Future interest button
            // --------------------------------------------------

            const futureInterestButton =
                modal.querySelector('.future-interest-button');


            if (futureInterestButton) {

                futureInterestButton.style.display = '';

                futureInterestButton.dataset.categoryId =
                    category.id;


                futureInterestButton.onclick = () => {

                    const categoryId =
                        futureInterestButton.dataset.categoryId;

                    window.location.href =
                        `rezervace.html?future=true&category_id=${categoryId}`;
                };
            }


            // --------------------------------------------------
            // Age options
            // --------------------------------------------------
            const ageOptions = document.querySelector(
                `.portfolio-link[href="#${modal.id}"] .age-options`
            );


            // Vyčistíme stará tlačítka
            if (ageOptions) {
                ageOptions.innerHTML = '';
            }


            // --------------------------------------------------
            // NO FUTURE EVENTS
            // --------------------------------------------------

            if (events.length === 0) {

                console.log(
                    `Akce "${eventName}" zatím nemá žádný termín.`
                );

                if (ageOptions) {
                    ageOptions.innerHTML =
                        '<p class="text-muted">Termín této akce zatím není vypsán.</p>';
                }

                if (practicalInfo) {
                    practicalInfo.style.display = 'none';
                }

                if (registrationLink) {
                    registrationLink.style.display = 'none';
                }

                if (futureInterestButton) {
                    futureInterestButton.style.display = '';
                }

                continue;
            }


            // --------------------------------------------------
            // EVENTS EXIST
            // --------------------------------------------------

            if (futureInterestButton) {
                futureInterestButton.style.display = '';
            }


            // --------------------------------------------------
            // Create one button for every event / age category
            // --------------------------------------------------

            for (const event of events) {

                const ageButton =
                    document.createElement('button');

                ageButton.type = 'button';

                ageButton.className =
                    'btn btn-outline-primary m-1';

                ageButton.textContent =
                    `${event.age_min}–${event.age_max} let`;

                ageButton.dataset.eventId =
                    event.id;


                // --------------------------------------------------
                // Click on age/event
                // --------------------------------------------------

                ageButton.addEventListener(
                    'click',
                    async () => {

                        console.log(
                            "VYBRANÝ EVENT:",
                            event
                        );


                        // Practical information
                        if (practicalInfo) {
                            practicalInfo.style.display = '';
                        }


                        // More information
                        if (moreInfoElement) {
                            moreInfoElement.textContent =
                                category.more_info || '';
                        }


                        // Event title
                        const eventTitleElement =
                            modal.querySelector('.event-title');

                        if (eventTitleElement) {
                            eventTitleElement.textContent =
                                `${eventName} (${event.age_min}–${event.age_max} let)`;
                        }


                        // Event date
                        const eventDateElement =
                            modal.querySelector('.event-date');

                        if (eventDateElement) {
                            const date = new Date(event.event_date);

                            eventDateElement.textContent =
                                date.toLocaleDateString('cs-CZ');
                        }


                        // Event time
                        const eventTimeElement =
                            modal.querySelector('.event-time');

                        if (eventTimeElement) {
                            eventTimeElement.textContent =
                                event.event_time
                                    ? event.event_time.slice(0, 5)
                                    : '';
                        }


                        // Event location
                        const eventLocationElement =
                            modal.querySelector('.event-location');

                        if (eventLocationElement) {
                            eventLocationElement.textContent =
                                event.location || '';
                        }


                        // Detail image
                        const { data: detailImageData } =
                            supabaseClient
                                .storage
                                .from('event-images')
                                .getPublicUrl(
                                    category.image_detail
                                );


                        if (imageElement) {
                            imageElement.src =
                                detailImageData.publicUrl;
                        }


                        // --------------------------------------------------
                        // Registration button
                        // --------------------------------------------------

                        if (registrationLink) {

                            registrationLink.style.display = '';

                            registrationLink.dataset.eventId =
                                event.id;

                            registrationLink.onclick =
                                (clickEvent) => {

                                    clickEvent.preventDefault();

                                    console.log(
                                        "REGISTRATION EVENT ID:",
                                        event.id
                                    );

                                    window.location.href =
                                        `rezervace.html?event_id=${event.id}`;
                                };
                        }


                        // --------------------------------------------------
                        // Count registrations
                        // --------------------------------------------------

                        const {
                            data: registrations,
                            error: registrationError
                        } = await supabaseClient
                            .from('registrations')
                            .select('user_id, users(gender)')
                            .eq('event_id', event.id);


                        if (registrationError) {

                            console.error(
                                "REGISTRATION ERROR:",
                                registrationError
                            );

                            return;
                        }


                        console.log(
                            "COUNTING EVENT:",
                            event.id
                        );

                        console.log(
                            "REGISTRATIONS:",
                            registrations
                        );


                        let men = 0;
                        let women = 0;


                        for (const registration of registrations) {

                            if (
                                registration.users?.gender === "Muž"
                            ) {
                                men++;
                            }

                            if (
                                registration.users?.gender === "Žena"
                            ) {
                                women++;
                            }
                        }


                        // --------------------------------------------------
                        // Display counts
                        // --------------------------------------------------

                        const menElement =
                            modal.querySelector('.men-count');

                        const womenElement =
                            modal.querySelector('.women-count');


                        if (menElement) {
                            menElement.textContent = men;
                        }


                        if (womenElement) {
                            womenElement.textContent = women;
                        }


                        // --------------------------------------------------
                        // Display capacities
                        // --------------------------------------------------

                        const menCapacityElement =
                            modal.querySelector('.men-capacity');

                        const womenCapacityElement =
                            modal.querySelector('.women-capacity');


                        if (menCapacityElement) {
                            menCapacityElement.textContent =
                                event.capacity_m;
                        }


                        if (womenCapacityElement) {
                            womenCapacityElement.textContent =
                                event.capacity_f;
                        }

                    }
                );


                ageOptions.appendChild(ageButton);
            }
        }
    }


    // --------------------------------------------------
    // Reset modal whenever it is opened
    // --------------------------------------------------

    document
        .querySelectorAll('.portfolio-modal')
        .forEach(modal => {

            modal.addEventListener(
                'show.bs.modal',
                () => {

                    const practicalInfo =
                        modal.querySelector(
                            '.event-practical-info'
                        );

                    if (practicalInfo) {
                        practicalInfo.style.display = 'none';
                    }


                    const registrationLink =
                        modal.querySelector(
                            '.registration-link'
                        );

                    if (registrationLink) {
                        registrationLink.style.display = 'none';
                    }


                    const eventTitleElement =
                        modal.querySelector(
                            '.event-title'
                        );

                }
            );
        });


    // Load everything
    loadEventInfo();

});