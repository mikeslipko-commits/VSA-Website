import { neon } from "@neondatabase/serverless";

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

        const databaseUrl =
            process.env.DATABASE_URL ||
            process.env.Database_url ||
            process.env.postgres_url;

        if (!databaseUrl) {
            return res.status(500).json({
                success: false,
                message: "Datenbank ist nicht eingerichtet."
            });
        }

        const sql = neon(databaseUrl);

        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

        if (!webhookUrl) {
            return res.status(500).json({
                success: false,
                message: "Discord-Webhook ist nicht eingerichtet."
            });
        }

        // Tabellen erstellen
        await sql`
            CREATE TABLE IF NOT EXISTS vsa_mitglieder (
                nummer SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                spieler_id TEXT NOT NULL,
                telefon TEXT NOT NULL,
                erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

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

        const neueNummer = result[0].nummer;

        // Alle Mitglieder laden
        const members = await sql`
            SELECT nummer, name, spieler_id, telefon
            FROM vsa_mitglieder
            ORDER BY nummer ASC
        `;

        // Discord-Nachricht aufbauen
        let mitgliederListe =
            "📋 **AKTUELLE VSA-MITGLIEDER**\n\n";

        members.forEach((member) => {

            mitgliederListe +=
                `**#${String(member.nummer).padStart(3, "0")}** — ` +
                `${member.name} | ID: ${member.spieler_id} | 📞 ${member.telefon}\n`;

        });

        mitgliederListe +=
            `\n━━━━━━━━━━━━━━━━━━━━\n` +
            `👥 **Mitglieder insgesamt: ${members.length}**\n` +
            `🏛️ **Volksbündnis San Andreas**`;

        // Gespeicherte Discord-Nachrichten-ID laden
        const settings = await sql`
            SELECT wert
            FROM vsa_einstellungen
            WHERE schluessel = 'discord_message_id'
            LIMIT 1
        `;

        let discordMessageId = null;

        if (settings.length > 0) {
            discordMessageId = settings[0].wert;
        }

        let discordMessageCreated = false;

        // ==========================================
        // KEINE NACHRICHT VORHANDEN
        // ==========================================

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
                const errorText = await discordResponse.text();
                console.error("Discord Fehler:", errorText);

                throw new Error(
                    "Discord-Nachricht konnte nicht erstellt werden."
                );
            }

            const discordData = await discordResponse.json();

            discordMessageId = discordData.id;
            discordMessageCreated = true;

        }

        // ==========================================
        // VORHANDENE NACHRICHT AKTUALISIEREN
        // ==========================================

        if (!discordMessageCreated) {

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

            // Nachricht wurde gelöscht
            if (discordResponse.status === 404) {

                console.log(
                    "Alte Discord-Nachricht existiert nicht mehr. Erstelle neue Nachricht."
                );

                const newDiscordResponse = await fetch(
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

                if (!newDiscordResponse.ok) {

                    const errorText =
                        await newDiscordResponse.text();

                    console.error(
                        "Discord Fehler beim Neuerstellen:",
                        errorText
                    );

                    throw new Error(
                        "Neue Discord-Nachricht konnte nicht erstellt werden."
                    );
                }

                const newDiscordData =
                    await newDiscordResponse.json();

                discordMessageId = newDiscordData.id;

            }

            // Sonstiger Discord-Fehler
            else if (!discordResponse.ok) {

                const errorText =
                    await discordResponse.text();

                console.error(
                    "Discord Update Fehler:",
                    errorText
                );

                throw new Error(
                    "Discord-Nachricht konnte nicht aktualisiert werden."
                );
            }
        }

        // Neue Nachrichten-ID speichern
        await sql`
            INSERT INTO vsa_einstellungen
            (schluessel, wert)
            VALUES
            ('discord_message_id', ${discordMessageId})
            ON CONFLICT (schluessel)
            DO UPDATE SET wert = EXCLUDED.wert
        `;

        // Erfolg
        return res.status(200).json({
            success: true,
            message: "Mitgliedsantrag erfolgreich übermittelt.",
            nummer: neueNummer
        });

    } catch (error) {

        console.error(
            "Mitgliedsantrag Fehler:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Der Mitgliedsantrag konnte nicht verarbeitet werden."
        });
    }
}
