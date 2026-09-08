const mitgliedForm = document.getElementById("mitgliedForm");
const formMessage = document.getElementById("formMessage");

if (mitgliedForm) {

    mitgliedForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const id = document.getElementById("id").value.trim();
        const telefon = document.getElementById("telefon").value.trim();

        if (!name || !id || !telefon) {

            formMessage.textContent =
                "Bitte fülle alle Felder aus.";

            return;
        }

        const button = mitgliedForm.querySelector("button");

        button.disabled = true;
        button.textContent = "Wird gesendet...";

        formMessage.textContent = "";

        try {

            const response = await fetch("/api/mitglied", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    id: id,
                    telefon: telefon
                })

            });


            const data = await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Der Mitgliedsantrag konnte nicht gesendet werden."
                );

            }


            formMessage.textContent =
                "✓ Mitgliedsantrag erfolgreich übermittelt.";


            mitgliedForm.reset();


        } catch (error) {

            console.error(
                "Mitgliedsantrag Fehler:",
                error
            );

            formMessage.textContent =
                error.message ||
                "Der Antrag konnte nicht gesendet werden.";

        } finally {

            button.disabled = false;
            button.textContent =
                "Mitgliedsantrag absenden";

        }

    });

}
