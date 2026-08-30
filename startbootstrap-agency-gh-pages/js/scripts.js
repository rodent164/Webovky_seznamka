window.addEventListener('DOMContentLoaded', event => {

    const navbarShrink = () => {
        const mainNav = document.querySelector('#mainNav');

        if (mainNav) {
            mainNav.classList.toggle('navbar-shrink', window.scrollY > 0);
        }
    };

    navbarShrink();
    document.addEventListener('scroll', navbarShrink, { passive: true });

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
    async function loadUpcomingEvents() {

        const container =
            document.getElementById('upcoming-events');

        if (!container) {
            return;
        }

        const { data: events, error } =
            await supabaseClient
                .from('events')
                .select(`
                id,
                event_date,
                event_time,
                age_min,
                age_max,
                capacity_m,
                capacity_f,
                registrations (
                    user_id,
                    users (
                        gender
                    )
                ),
                event_categories (
                    id,
                    name,
                    image_main
                )
            `)
                .gte('event_date', new Date().toISOString().split('T')[0])
                .order('event_date', { ascending: true })
                .order('event_time', { ascending: true })
                .limit(5);

        if (error) {
            console.error(
                'CHYBA PŘI NAČÍTÁNÍ NEJBLIŽŠÍCH AKCÍ:',
                error
            );
            return;
        }

        console.log('NEJBLIŽŠÍ AKCE:', events);
        console.log("PRVNÍ AKCE:", events[0]);
        console.log("KAPACITA MUŽI:", events[0]?.capacity_m);
        console.log("KAPACITA ŽENY:", events[0]?.capacity_f);
        console.log("REGISTRACE:", events[0]?.registrations);

        container.innerHTML = '';

        for (const event of events) {


            const category = event.event_categories;

            const date = new Date(event.event_date)
                .toLocaleDateString('cs-CZ');

            const time = event.event_time.slice(0, 5);

            const occupied_m = event.registrations?.filter(
                registration => registration.users?.gender === "Muž"
            ).length || 0;

            const occupied_f = event.registrations?.filter(
                registration => registration.users?.gender === "Žena"
            ).length || 0;

            const capacity_m = event.capacity_m;
            const capacity_f = event.capacity_f;

            const row = document.createElement('div');

            row.className =
                'col-12 d-flex align-items-center justify-content-between mb-3';

            row.innerHTML = `
                <div>
                    <strong>${date}</strong>
                    &nbsp;&nbsp;
                    ${time}
                    &nbsp;&nbsp;
                    <strong>${event.age_min}–${event.age_max} let</strong>
                    &nbsp;&nbsp;
                    ${category.name}
                    &nbsp;&nbsp;
                    <span>♂ ${occupied_m} / ${capacity_m} &nbsp;&nbsp; ♀ ${occupied_f} / ${capacity_f}</span>
                </div>

                <a
                    href="rezervace.html?event_id=${event.id}"
                    class="btn btn-primary"
                >
                    Přihlásit se
                </a>
            `;

            container.appendChild(row);

        }



    }


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
                    <div class="portfolio-hover-content"><i class="fas fa-circle-info fa-2x"></i></div>
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

                <div class="event-terms"></div>

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
            const eventCard = document.querySelector(
                `.portfolio-link[href="#${modal.id}"]`
            )?.closest('.portfolio-item');
            const ageOptions = eventCard?.querySelector('.event-terms');
            const modalAgeOptions = modal.querySelector('.age-options');


            // Vyčistíme stará tlačítka
            if (ageOptions) {
                ageOptions.innerHTML = '<span class="event-terms-label">Termíny</span>';
            }
            if (modalAgeOptions) {
                modalAgeOptions.innerHTML = '<span class="event-terms-label">Termíny</span>';
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
                        '<span class="event-terms-label">Termíny</span><p class="text-muted mb-0">Termín této akce zatím není vypsán.</p>';
                }
                if (modalAgeOptions) {
                    modalAgeOptions.innerHTML =
                        '<span class="event-terms-label">Termíny</span><p class="text-muted mb-0">Termín této akce zatím není vypsán.</p>';
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

            events.sort((a, b) =>
                ((a.age_min + a.age_max) / 2) -
                ((b.age_min + b.age_max) / 2)
            );

            for (const event of events) {

                const ageButton =
                    document.createElement('a');

                // Termín vede přímo na registraci konkrétní akce.
                ageButton.href = `rezervace.html?event_id=${event.id}`;

                ageButton.className =
                    'btn btn-primary';
                // 'btn btn-outline-primary m-1';

                ageButton.textContent =
                    `${event.age_min}–${event.age_max} let - ${new Date(event.event_date).toLocaleDateString('cs-CZ')}`;

                ageButton.dataset.eventId =
                    event.id;

                if (modalAgeOptions) {
                    modalAgeOptions.appendChild(ageButton.cloneNode(true));
                }


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
    loadUpcomingEvents();
    loadEventInfo();

});
