document.addEventListener("DOMContentLoaded", async () => {

    const tbody = document.getElementById("tabellaOfferte");

    // Data di oggi nel formato YYYY-MM-DD
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const anno = oggi.getFullYear();
    const mese = String(oggi.getMonth() + 1).padStart(2, "0");
    const giorno = String(oggi.getDate()).padStart(2, "0");

    const oggiISO = `${anno}-${mese}-${giorno}`;

    // ==========================================
    // DISATTIVA AUTOMATICAMENTE LE OFFERTE SCADUTE
    // ==========================================

    const { error: erroreScadute } = await window.supabaseClient
        .from("prodotti")
        .update({
            offerta: false,
            pezzi_offerta: 0
        })
        .eq("offerta", true)
        .lt("data_fine_offerta", oggiISO);

    if (erroreScadute) {
        console.error(
            "Errore aggiornamento offerte scadute:",
            erroreScadute
        );
    }

    // ==========================================
    // CARICA SOLO LE OFFERTE ANCORA VALIDE
    // ==========================================

    const { data, error } = await window.supabaseClient
        .from("prodotti")
        .select("*")
        .eq("offerta", true)
        .order("descrizione");

    if (error) {
        alert("Errore nel caricamento delle offerte");
        console.error(error);
        return;
    }

    tbody.innerHTML = "";

    window.offerteExcel = data;

    data.forEach(p => {

        tbody.innerHTML += `
        <tr>
            <td>${p.codice}</td>
            <td>${p.descrizione}</td>
            <td>${p.reparto}</td>
            <td>${p.pezzi_offerta}</td>
            <td>${p.prezzo}</td>
            <td>${p.data_inizio_offerta || ""}</td>
            <td>${p.data_fine_offerta || ""}</td>
        <td>

                <button
                    class="azione-modifica"
                    onclick="modificaOfferta(${p.id})">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>

                <button
                    class="azione-elimina"
                    onclick="eliminaOfferta(${p.id})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>

            </td>
        </tr>`;
    });

});
async function modificaOfferta(id) {

    const { data, error } = await window.supabaseClient
        .from("prodotti")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        alert("Errore nel caricamento del prodotto");
        return;
    }

    document.getElementById("codice").value = data.codice;
    document.getElementById("descrizione").value = data.descrizione;
    document.getElementById("categoria").value = data.reparto;
    document.getElementById("prezzo").value = data.prezzo;
    document.getElementById("offerta").checked = data.offerta;
    document.getElementById("pezzi_offerta").value = data.pezzi_offerta || 0;
    document.getElementById("data_inizio_offerta").value = data.data_inizio_offerta || "";
    document.getElementById("data_fine_offerta").value = data.data_fine_offerta || "";

    document.getElementById("productModal").style.display = "flex";

    window.idProdottoInModifica = id;
}


async function eliminaOfferta(id) {

    if (!confirm("Rimuovere il prodotto dalle offerte?"))
        return;

    const { error } = await window.supabaseClient
        .from("prodotti")
        .update({
            offerta: false,
            pezzi_offerta: 0
        })
        .eq("id", id);

    if (error) {
        alert("Errore");
        return;
    }

    location.reload();
}
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("productModal").style.display = "none";
});
document.getElementById("saveOfferta").addEventListener("click", async () => {

    const { error } = await window.supabaseClient
        .from("prodotti")
       .update({
    prezzo: document.getElementById("prezzo").value,
    offerta: document.getElementById("offerta").checked,
    pezzi_offerta: parseInt(document.getElementById("pezzi_offerta").value) || 0,
    data_inizio_offerta: document.getElementById("data_inizio_offerta").value || null,
    data_fine_offerta: document.getElementById("data_fine_offerta").value || null
})
        .eq("id", window.idProdottoInModifica);

    if (error) {
        alert("Errore durante il salvataggio");
        return;
    }

    document.getElementById("productModal").style.display = "none";

    location.reload();

});
document.getElementById("excelOfferte").addEventListener("click", () => {

    const dati = window.offerteExcel || [];

    if (dati.length === 0) {
        alert("Non ci sono offerte da esportare.");
        return;
    }

    const righe = dati.map(p => ({
        "Codice": p.codice,
        "Descrizione": p.descrizione,
        "Reparto": p.reparto,
        "Pezzi": p.pezzi_offerta,
        "Prezzo Offerta": p.prezzo
    }));

    const foglio = XLSX.utils.json_to_sheet(righe);

    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        libro,
        foglio,
        "Offerte"
    );

    XLSX.writeFile(
        libro,
        "Offerte.xlsx"
    );
});
