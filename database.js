"use strict";

async function caricaProdottiDB() {

    const { data, error } = await window.supabaseClient
        .from("prodotti")
        .select("*")
        .order("scadenza", { ascending: true });

    if (error) {
        console.error("Errore caricamento:", error);
        const locali = Storage.carica();

if (locali.length > 0) {
    console.log("Caricati prodotti dal backup locale");
}

return locali;
    }

    Storage.salva(data);

    return data;
}

async function salvaProdottoDB(prodotto) {

    const { error } = await window.supabaseClient
        .from("prodotti")
        .insert([prodotto]);

    if (error) {
        console.error("Errore salvataggio:", error);
        return false;
    }

    return true;
}
