```javascript
export default async function handler(req, res) {
    // Nur POST-Anfragen erlauben
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Methode nicht erlaubt."
        });
    }

    try {
        const { name, id, telefon } = req.body || {};

        // Prüfen, ob alle Angaben vorhanden sind
        if (!name || !id || !telefon) {
            return res.status(400).json({
                success: false,
                message: "Name, ID und Telefonnummer sind erforderlich."
            });
        }

        // Discord Webhook aus der Vercel-Umgebungsvariable laden
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

        if (!webhookUrl) {
            return res.status(500).json({
                success: false,
                message: "Discord-Webhook ist noch nicht eingerichtet."
            });
        }

        // Nachricht für Discord
        const discordMessage = {
            username: "VSA Mitglieder",
            content:
                "📋 **Neuer Parteibeitritt**\n\n" +
                `👤 **Name:** ${name}\n` +
                `🪪 **ID:** ${id}\n` +
                `📞 **Telefon:** ${telefon}\n\n` +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                "Volksbündnis San Andreas"
        };

        // Nachricht an Discord senden
        const discordResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(discordMessage)
        });

        if (!discordResponse.ok) {
            return res.status(500).json({
                success: false,
                message: "Der Antrag konnte nicht an Discord gesendet werden."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Mitgliedsantrag erfolgreich übermittelt."
        });

    } catch (error) {
        console.error("Fehler beim Mitgliedsantrag:", error);

        return res.status(500).json({
            success: false,
            message: "Interner Serverfehler."
        });
    }
}
```
