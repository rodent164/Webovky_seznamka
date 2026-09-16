document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#contactForm");

    if (!form) return;

    const button = form.querySelector("#submitButton");
    const feedback = form.querySelector("#contactFeedback");

    const showFeedback = (message, type) => {
        feedback.textContent = message;
        feedback.className = `mt-3 ${type === "success" ? "text-white" : "text-warning"}`;
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        button.disabled = true;
        button.textContent = "Odesílání…";
        showFeedback("", "success");

        try {
            const { data, error } = await supabaseClient.functions.invoke(
                "send-contact-message",
                { body: payload }
            );

            if (error || !data?.success) {
                let errorMessage = data?.error;

                if (!errorMessage && error?.context instanceof Response) {
                    const errorBody = await error.context.json().catch(() => null);
                    errorMessage = errorBody?.error;
                }

                throw new Error(errorMessage || error?.message || "Zprávu se nepodařilo odeslat.");
            }

            form.reset();
            form.classList.remove("was-validated");
            showFeedback("Děkujeme, zpráva byla odeslána.", "success");
        } catch (error) {
            console.error("CONTACT FORM ERROR:", error);
            showFeedback("Zprávu se nepodařilo odeslat. Zkuste to prosím později.", "error");
        } finally {
            button.disabled = false;
            button.textContent = "Odeslat zprávu";
        }
    });
});
