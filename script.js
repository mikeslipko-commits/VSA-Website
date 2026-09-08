```javascript
document.addEventListener("DOMContentLoaded", () => {

    // ==============================
    // NAVBAR BEIM SCROLLEN
    // ==============================

    const navbar = document.querySelector(".navbar");

    if (navbar) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 30) {
                navbar.classList.add("scrolled");
            } else {
                navbar.classList.remove("scrolled");
            }
        });
    }


    // ==============================
    // ANIMATIONEN BEIM SCROLLEN
    // ==============================

    const animatedElements = document.querySelectorAll(
        ".value-card, .topic-card, .about-highlight, .program-box, .membership-box"
    );

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.1
            }
        );

        animatedElements.forEach((element) => {
            element.classList.add("animate-on-scroll");
            observer.observe(element);
        });
    }


    // ==============================
    // EXTERNE LINKS
    // ==============================

    const links = document.querySelectorAll("a");

    links.forEach((link) => {
        const href = link.getAttribute("href");

        if (
            href &&
            (href.startsWith("http://") ||
             href.startsWith("https://"))
        ) {
            link.setAttribute("target", "_blank");
            link.setAttribute("rel", "noopener noreferrer");
        }
    });


    // ==============================
    // MITGLIEDSANTRAG
    // ==============================

    const membershipForm = document.getElementById("membershipForm");
    const formMessage = document.getElementById("formMessage");

    if (membershipForm) {

        membershipForm.addEventListener("submit", async (event) => {

            // Verhindert das Neuladen der Seite
            event.preventDefault();

            const nameInput = document.getElementById("name");
            const idInput = document.getElementById("id");
            const telefonInput = document.getElementById("telefon");
            const submitButton = membershipForm.querySelector(
                'button[type="submit"]'
            );

            const name = nameInput?.value.trim();
            const id = idInput?.value.trim();
            const telefon = telefonInput?.value.trim();


            // ==============================
            // EINGABEN PRÜFEN
            // ==============================

            if (!name || !id || !telefon) {

                if (formMessage) {
                    formMessage.textContent =
                        "Bitte fülle alle Felder aus.";

                    formMessage.className =
                        "form-message error";
                }

                return;
            }


            // ==============================
            // BUTTON DEAKTIVIEREN
            // ==============================

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent =
                    "Antrag wird gesendet...";
            }


            // ==============================
            // ANTRAG AN SERVER SENDEN
            // ==============================

            try {

                const response = await fetch(
                    "/api/submit-membership",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            name: name,
                            id: id,
                            telefon: telefon
                        })
                    }
                );


                const result = await response.json();


                // ==============================
                // ERFOLGREICH
                // ==============================

                if (response.ok && result.success) {

                    if (formMessage) {
                        formMessage.textContent =
                            "✅ Dein Mitgliedsantrag wurde erfolgreich übermittelt.";

                        formMessage.className =
                            "form-message success";
                    }

                    membershipForm.reset();

                } else {

                    // ==============================
                    // FEHLER VOM SERVER
                    // ==============================

                    if (formMessage) {
                        formMessage.textContent =
                            "❌ " +
                            (result.message ||
                            "Der Antrag konnte nicht gesendet werden.");

                        formMessage.className =
                            "form-message error";
                    }
                }


            } catch (error) {

                console.error(
                    "Fehler beim Senden des Mitgliedsantrags:",
                    error
                );

                if (formMessage) {
                    formMessage.textContent =
                        "❌ Der Antrag konnte nicht gesendet werden. Bitte versuche es später erneut.";

                    formMessage.className =
                        "form-message error";
                }

            } finally {

                // ==============================
                // BUTTON WIEDER AKTIVIEREN
                // ==============================

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent =
                        "Mitgliedsantrag absenden →";
                }
            }

        });
    }

});
```
