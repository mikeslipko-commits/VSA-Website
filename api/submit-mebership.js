```javascript
import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Methode nicht erlaubt."
        });
    }

    try {
        const { name, id, telefon } = req.body || {};

        if (!name || !id || !telefon) {
            return res.status(400).json({
                success: false,
                message: "Bitte fülle alle Felder aus."
            });
        }

        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

        if (!webhookUrl) {
            return res.status(500).json({
                success: false,
                message: "Discord-Webhook ist nicht eingerichtet."
            });
        }

        // Mitglieder-Tabelle erstellen
        await sql`
            CREATE TABLE IF NOT EXISTS vsa_mitglieder (
                nummer SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                spieler_id TEXT NOT NULL,
                telefon TEXT NOT NULL,
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Einstellungen-Tabelle erstellen
        await sql`
            CREATE TABLE IF NOT EXISTS vsa_einstellungen (
                schluessel TEXT PRIMARY KEY,
                wert TEXT NOT NULL
            )
        `;

        // Neues Mitglied speichern
        const result = await sql`
            INSERT INTO vsa_mitglieder
            (name, spieler_id, telefon)
            VALUES
            (${name}, ${String(id)}, ${telefon})
            RETURNING nummer
        `;

        const neueNummer = result.rows[0].nummer;

        // Alle Mitglieder laden
        const membersResult = await sql`
            SELECT nummer, name, spieler_id, telefon
            FROM vsa_mitglieder
            ORDER BY nummer ASC
        `;

        const members = membersResult.rows;

        // Discord-Liste erstellen
        let mitgliederListe = "📋 **AKTUELLE VSA-MITGLIEDER**\n\n";

        members.forEach((member) => {
            mitgliederListe +=
                `**#${String(member.nummer).padStart(3, "0")}** — ` +
                `${member.name} | ID: ${member.spieler_id} | 📞 ${member.telefon}\n`;
        });

        mitgliederListe +=
            `\n━━━━━━━━━━━━━━━━━━━━\n` +
            `👥 **Mitglieder insgesamt: ${members.length}**\n` +
            `🏛️ **Volksbündnis San Andreas**`;

        // Prüfen, ob bereits eine Discord-Nachricht existiert
        const messageResult = await sql`
            SELECT wert
            FROM vsa_einstellungen
            WHERE schluessel = 'discord_message_id'
            LIMIT 1
        `;

        let discordMessageId = null;

        if (messageResult.rows.length > 0) {
            discordMessageId = messageResult.rows[0].wert;
        }

        // Erste Discord-Nachricht erstellen
        if (!discordMessageId) {

            const discordResponse = await fetch(
                `${webhookUrl}?wait=true`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: "VSA Mitglieder",
                        content: mitgliederListe
                    })
                }
            );

            if (!discordResponse.ok) {
                throw new Error("Discord-Nachricht konnte nicht erstellt werden.");
            }

            const discordData = await discordResponse.json();

            discordMessageId = discordData.id;

            await sql`
                INSERT INTO vsa_einstellungen
                (schluessel, wert)
                VALUES
                ('discord_message_id', ${discordMessageId})
            `;

        } else {

            // Bestehende Discord-Nachricht aktualisieren
            const discordResponse = await fetch(
                `${webhookUrl}/messages/${discordMessageId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        content: mitgliederListe
                    })
                }
            );

            if (!discordResponse.ok) {
                throw new Error("Discord-Nachricht konnte nicht aktualisiert werden.");
            }
        }

        return res.status(200).json({
            success: true,
            message: "Mitgliedsantrag erfolgreich übermittelt.",
            nummer: neueNummer
        });

    } catch (error) {
        console.error("Mitgliedsantrag Fehler:", error);

        return res.status(500).json({
            success: false,
            message: "Der Mitgliedsantrag konnte nicht verarbeitet werden."
        });
    }
}
```
