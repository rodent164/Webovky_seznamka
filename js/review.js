
document.addEventListener('DOMContentLoaded', () => {

    const savedRegistration = sessionStorage.getItem('registrationDetails');
    let details;

    // ==========================================
    // 1. KONTROLA REGISTRAČNÍCH ÚDAJŮ
    // ==========================================

    if (!savedRegistration) {
        window.location.replace('rezervace.html');
        return;
    }

    try {
        details = JSON.parse(savedRegistration);


        const fields = {
            reviewNickname: details.nickname,
            reviewGender: details.gender,
            reviewAge: details.age,
            reviewEmail: details.email,
            reviewPhone: details.phone,
            reviewAbout: details.about,
            reviewNote: details.note,
            reviewUserCode: details.user_code
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.querySelector(`#${id}`);

            if (element) {
                element.textContent = value || '—';
            }
        });

    } catch (error) {
        console.error('REGISTRATION DATA ERROR:', error);

        sessionStorage.removeItem('registrationDetails');
        window.location.replace('rezervace.html');
        return;
    }


    // ==========================================
    // 2. POTVRZENÍ REGISTRACE
    // ==========================================

    document.querySelector('#confirmRegistration').addEventListener(
        'click',
        async (event) => {

            const button = event.currentTarget;

            button.disabled = true;
            button.textContent = 'Dokončení registrace…';

            try {

                const paymentUserId =
                    sessionStorage.getItem('paymentUserId');

                const details = JSON.parse(
                    sessionStorage.getItem('registrationDetails')
                );

                if (!paymentUserId) {
                    throw new Error('Chybí ID uživatele.');
                }

                // ==========================================
                // 4. NAČTENÍ USERCODE Z REGISTRAČNÍCH ÚDAJŮ
                // ==========================================

                const userCode = details.user_code;

                if (!userCode) {
                    throw new Error('Chybí uživatelský kód.');
                }


                // ==========================================
                // 5. VYTVOŘENÍ REGISTRACE
                // ==========================================

                // Pokud registrace již vznikla, použijeme její ID.
                // Zabráníme tak vytvoření duplicitní registrace
                // při opakovaném pokusu o odeslání e-mailu.

                let registrationId = sessionStorage.getItem(
                    'pendingRegistrationId'
                );

                if (!registrationId) {

                    button.textContent = 'Vytváření registrace…';

                    const {
                        data: newRegistrationId,
                        error: createRegistrationError
                    } = await supabaseClient.rpc(
                        'create_registration',
                        {
                            p_user_id: paymentUserId,
                            p_event_id: details.event_id
                        }
                    );

                    if (
                        createRegistrationError ||
                        !newRegistrationId
                    ) {
                        console.error(
                            'REGISTRATION ERROR:',
                            createRegistrationError
                        );

                        throw new Error(
                            'Nepodařilo se vytvořit novou rezervaci.'
                        );
                    }

                    registrationId = newRegistrationId;

                    // Uložíme ID pro případ opakovaného pokusu.
                    sessionStorage.setItem(
                        'pendingRegistrationId',
                        registrationId
                    );
                }


                // ==========================================
                // 6. ODESLÁNÍ POTVRZOVACÍHO EMAILU
                // ==========================================

                button.textContent = 'Odesílání potvrzovacího e-mailu…';

                const {
                    data: emailData,
                    error: emailError
                } = await supabaseClient.functions.invoke(
                    'send-registration-payment-email',
                    {
                        body: {
                            registrationId: registrationId,
                            userId: paymentUserId,
                            eventId: details.event_id,
                            email: details.email,
                            userCode: userCode
                        }
                    }
                );


                if (emailError || !emailData?.success) {

                    console.error(
                        'EMAIL ERROR:',
                        emailError || emailData
                    );

                    throw new Error(
                        emailData?.error ||
                        'Nepodařilo se odeslat potvrzovací e-mail.'
                    );
                }


                // ==========================================
                // 7. ÚSPĚŠNÉ DOKONČENÍ
                // ==========================================


                // Vyčistíme sessionStorage až po úspěšném odeslání.
                // Uložení QR kódu pro platební stránku
                sessionStorage.setItem(
                    'paymentQRCode',
                    emailData.qrBase64
                );

                sessionStorage.removeItem('registrationDetails');
                sessionStorage.removeItem('paymentUserId');
                sessionStorage.removeItem('pendingRegistrationId');

                // Přesměrování na QR stránku.
                window.location.assign('pay_with_QR.html');


            } catch (error) {

                console.error('REGISTRATION ERROR:', error);

                button.disabled = false;
                button.textContent = 'Zkusit znovu';

                alert(
                    error.message ||
                    'Registraci se nepodařilo dokončit. Zkuste to prosím znovu.'
                );
            }
        }
    );
});


// ==========================================
// 8. OBNOVENÍ TLAČÍTKA PO NÁVRATU NA STRÁNKU
// ==========================================

window.addEventListener('pageshow', () => {

    const button = document.querySelector('#confirmRegistration');

    if (button) {
        button.disabled = false;
        button.textContent = 'Potvrdit registraci';
    }

});
