/* SCADENZE SMART GDO ENTERPRISE
   PUNTI VENDITA
   Gestione centrale del punto vendita dell'utente.
*/

"use strict";

const CHIAVE_PUNTO_VENDITA = "scadenzeSmart_puntoVenditaSelezionato";

window.configPuntoVendita = {
    puntoVendita: null,
    ruolo: null,
    inizializzato: false
};

async function caricaConfigurazionePuntoVendita() {

    if (!window.supabaseClient) {
        console.error("Supabase non disponibile.");
        return null;
    }

    const { data: sessionData, error: sessionError } =
        await window.supabaseClient.auth.getSession();

    if (sessionError || !sessionData?.session?.user) {
        console.error("Utente non autenticato.");
        return null;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await window.supabaseClient
        .from("utenti_punti_vendita")
        .select("punto_vendita, ruolo")
        .eq("user_id", userId)
        .single();

    if (error || !data) {
        console.error(
            "Impossibile recuperare il punto vendita dell'utente:",
            error
        );
        return null;
    }

    window.configPuntoVendita.ruolo = data.ruolo;
    window.configPuntoVendita.inizializzato = true;

    /*
       UTENTE NORMALE:
       il punto vendita Ã¨ obbligatoriamente quello assegnato
       da Supabase.
    */
    if (data.ruolo !== "admin") {

        window.configPuntoVendita.puntoVendita =
            data.punto_vendita;

        return window.configPuntoVendita;
    }

    /*
       ADMIN:
       puÃ² lavorare su un punto vendita alla volta.

       Se esiste una scelta precedente la manteniamo.
       Altrimenti partiamo da Casilina.
    */
    const salvato =
        localStorage.getItem(CHIAVE_PUNTO_VENDITA);

    if (
        salvato === "Casilina" ||
        salvato === "Ciliegie"
    ) {
        window.configPuntoVendita.puntoVendita = salvato;
    } else {
        window.configPuntoVendita.puntoVendita = "Casilina";
        localStorage.setItem(
            CHIAVE_PUNTO_VENDITA,
            "Casilina"
        );
    }

    return window.configPuntoVendita;
}


/*
   Restituisce il punto vendita effettivamente utilizzabile
   dall'app.
*/
async function getPuntoVenditaCorrente() {

    if (
        !window.configPuntoVendita.inizializzato
    ) {
        await caricaConfigurazionePuntoVendita();
    }

    return window.configPuntoVendita.puntoVendita;
}


/*
   Restituisce il ruolo dell'utente.
*/
async function getRuoloUtente() {

    if (
        !window.configPuntoVendita.inizializzato
    ) {
        await caricaConfigurazionePuntoVendita();
    }

    return window.configPuntoVendita.ruolo;
}


/*
   True solamente per l'admin.
*/
async function utenteEAdmin() {

    const ruolo = await getRuoloUtente();

    return ruolo === "admin";
}


/*
   Permette all'admin di cambiare punto vendita.

   L'utente normale non puÃ² utilizzare questa funzione
   per cambiare negozio: il valore viene sempre ripreso
   dalla configurazione Supabase.
*/
async function impostaPuntoVendita(puntoVendita) {

    const admin = await utenteEAdmin();

    if (!admin) {
        console.warn(
            "Cambio punto vendita non consentito: utente non admin."
        );
        return false;
    }

    if (
        puntoVendita !== "Casilina" &&
        puntoVendita !== "Ciliegie"
    ) {
        console.error(
            "Punto vendita non valido:",
            puntoVendita
        );
        return false;
    }

    window.configPuntoVendita.puntoVendita =
        puntoVendita;

    localStorage.setItem(
        CHIAVE_PUNTO_VENDITA,
        puntoVendita
    );

    return true;
}


/*
   Inizializzazione automatica.
   Non modifica la grafica e non ricarica la pagina.
*/
document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            await caricaConfigurazionePuntoVendita();

            console.log(
                "Punto vendita corrente:",
                window.configPuntoVendita.puntoVendita
            );

            console.log(
                "Ruolo utente:",
                window.configPuntoVendita.ruolo
            );

        } catch (errore) {

            console.error(
                "Errore inizializzazione punti vendita:",
                errore
            );
        }
    }
);
