import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
    try {
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

        // Alle Test-Mitglieder löschen
        await sql`
            TRUNCATE TABLE vsa_mitglieder RESTART IDENTITY;
        `;

        // Gespeicherte Discord-Nachrichten-ID löschen,
        // damit beim nächsten Antrag eine neue Nachricht erstellt wird.
        await sql`
            DELETE FROM vsa_einstellungen
            WHERE schluessel = 'discord_message_id';
        `;

        return res.status(200).json({
            success: true,
            message: "VSA-Mitgliederliste wurde komplett zurückgesetzt."
        });

    } catch (error) {
        console.error("Reset Fehler:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Reset fehlgeschlagen."
        });
    }
}
