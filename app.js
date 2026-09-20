"use strict"; 

/*
=====================================
SCADENZE SMART GDO ENTERPRISE
APP
=====================================
*/

document.addEventListener("DOMContentLoaded", avvia);
function ricalcolaGiorni(data) {

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    return data.map(p => {

        const [anno, mese, giorno] = p.scadenza.split("-");

        const scadenza = new Date(
            Number(anno),
            Number(mese) - 1,
            Number(giorno)
        );

        scadenza.setHours(0, 0, 0, 0);

        const giorni = Math.ceil(
            (scadenza - oggi) / (1000 * 60 * 60 * 24)
        );

        return {
            ...p,
            giorni
        };
    });
}

async function caricaTuttiProdotti() {

    const puntoVendita = await getPuntoVenditaCorrente();

    if (!puntoVendita) {
        return {
            data: null,
            error: new Error("Punto vendita non disponibile")
        };
    }

    const dimensionePagina = 1000;

    const richieste = [
        window.supabaseClient
            .from("prodotti")
            .select("*")
            .order("id", { ascending: true })
            .eq("punto_vendita", puntoVendita)
            .range(0, dimensionePagina - 1),

        window.supabaseClient
            .from("prodotti")
            .select("*")
            .order("id", { ascending: true })
            .eq("punto_vendita", puntoVendita)
            .range(dimensionePagina, dimensionePagina * 2 - 1),

        window.supabaseClient
            .from("prodotti")
            .select("*")
            .order("id", { ascending: true })
            .eq("punto_vendita", puntoVendita)
            .range(dimensionePagina * 2, dimensionePagina * 3 - 1)
    ];

    const risultati = await Promise.all(richieste);

    for (const risultato of risultati) {
        if (risultato.error) {
            return { data: null, error: risultato.error };
        }
    }

    const tutti = risultati.flatMap(r => r.data || []);

    console.log("Prodotti caricati:", tutti.length);

    return { data: tutti, error: null };
}

 async function avvia() {

        const { data: sessionData, error: sessionError } =
        await window.supabaseClient.auth.getSession();

    if (sessionError || !sessionData?.session) {
        window.location.replace("login.html");
        return;
    }

    const configurazionePuntoVendita =
        await caricaConfigurazionePuntoVendita();

    if (!configurazionePuntoVendita?.puntoVendita) {
        console.error("Punto vendita non disponibile.");
        alert("Impossibile determinare il punto vendita dell'utente.");
        return;
    }

    console.log("Punto vendita corrente:", configurazionePuntoVendita.puntoVendita);
    console.log("Ruolo utente:", configurazionePuntoVendita.ruolo);

    console.log("Ã¢ÂÂ Scadenze Smart GDO Enterprise avviato");
    console.log("VERSIONE APP 19 LUGLIO");
    // Carica i prodotti salvati

   const { data, error } = await caricaTuttiProdotti();

if (error) {
    console.error("Errore caricamento prodotti:", error);
    return;
}

Prodotti.carica(ricalcolaGiorni(data));

console.log("Prodotti caricati:", data.length);
    // Disegna la tabella
    renderTabella();

    // Aggiorna i contatori dashboard
    if (typeof Dashboard !== "undefined" &&
    document.getElementById("scaduti")) {

    Dashboard.aggiorna();

}

}
async function ricaricaProdotti() {

    const puntoVendita = await getPuntoVenditaCorrente();

    if (!puntoVendita) {
        console.error("Punto vendita non disponibile.");
        return;
    }

    const { data, error } = await window.supabaseClient
        .from("prodotti")
        .select("*")
        .eq("punto_vendita", puntoVendita)
        .order("id", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    Prodotti.carica(ricalcolaGiorni(data));
    if (typeof renderTabella === "function") {
        renderTabella();
    }

    if (typeof Dashboard !== "undefined") {
        Dashboard.aggiorna();
    }
}
function formattaData(data) {

    if (!data) return "";

    const [anno, mese, giorno] = data.split("-");

   return `${giorno}/${mese}/${anno}`;                                                                    
} 

  let filtroReparto = "";

function renderTabella() {
    console.time("RENDER TABELLA");

    const tbody = document.getElementById("productTable");

    if (!tbody) return;

    const lista = Prodotti.tutti();

    const righe = [];

    lista.forEach((p, index) => {

        if (
            filtroReparto &&
            (p.reparto || "").toLowerCase() !== filtroReparto.toLowerCase()
        ) {
            return;
        }

        righe.push(`
            <tr>
                <td>${p.codice}</td>
                <td>${p.descrizione}</td>
                <td>${p.reparto}</td>
                <td>${formattaData(p.scadenza)}</td>
                <td>${p.giorni}</td>
                <td>
                    <button class="btn-edit" onclick="modificaProdotto(${p.id})">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>

                    <button class="btn-delete" onclick="eliminaProdotto(${index})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    tbody.innerHTML = righe.join("");

    console.timeEnd("RENDER TABELLA");
}

const menuReparto = document.getElementById("repartoCSV");

if (menuReparto) {
    menuReparto.addEventListener("change", () => {
        filtroReparto = menuReparto.value;
        renderTabella();
    });
} 
// ===== MODALE NUOVO PRODOTTO =====

document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("productModal");
    console.log("Modal:", modal);
    const nuovoProdottoBtn = document.getElementById("newProduct");
    
    console.log("Pulsante:", nuovoProdottoBtn);
    const chiudiModal = document.getElementById("closeModal");
    const salvaProdotto = document.getElementById("saveProduct");
    const chkOfferta = document.getElementById("offerta");
const boxPezzi = document.getElementById("pezziOffertaBox");
const boxDateOfferta = document.getElementById("dateOffertaBox");
if (chkOfferta && boxPezzi) {

    chkOfferta.addEventListener("change", () => {

        boxPezzi.style.display =
            chkOfferta.checked ? "block" : "none";

        if (boxDateOfferta) {
            boxDateOfferta.style.display =
                chkOfferta.checked ? "block" : "none";
        }

    });

}

    if (!modal || !chiudiModal || !salvaProdotto) return;
    console.log("Salva:", salvaProdotto);
    console.log(modal);
    console.log(nuovoProdottoBtn);

    if (nuovoProdottoBtn) {

    nuovoProdottoBtn.onclick = () => {
        modal.style.display = "flex";
    };

}

    chiudiModal.onclick = () => {
        modal.style.display = "none";
    };
   salvaProdotto.onclick = async () => {
   console.log("CLICK SALVA");
   console.log("prodottoInModifica =", window.prodottoInModifica);
   console.log("idProdottoInModifica =", window.idProdottoInModifica);
    const scadenza = document.getElementById("scadenza").value;

const oggi = new Date();
oggi.setHours(0,0,0,0);

const dataScadenza = new Date(scadenza);
dataScadenza.setHours(0,0,0,0);

const giorni = Math.ceil(
    (dataScadenza - oggi) / (1000 * 60 * 60 * 24)
);

const puntoVendita = await getPuntoVenditaCorrente();

if (!puntoVendita) {
    alert("Impossibile determinare il punto vendita.");
    return;
}

const prodotto = {
    codice: document.getElementById("codice").value,
    descrizione: document.getElementById("descrizione").value,
    reparto: document.getElementById("categoria").value,
    scadenza: scadenza,
    giorni: giorni,
    offerta: document.getElementById("offerta")?.checked || false,
pezzi_offerta: parseInt(document.getElementById("pezzi_offerta")?.value || "0"),
data_inizio_offerta: document.getElementById("data_inizio_offerta")?.value || null,
data_fine_offerta: document.getElementById("data_fine_offerta")?.value || null 
};


    if (window.idProdottoInModifica !== undefined) {

    const { data, error } = await window.supabaseClient
    .from("prodotti")
    .update({
        codice: prodotto.codice,
        descrizione: prodotto.descrizione,
        reparto: prodotto.reparto,
        scadenza: prodotto.scadenza,
        giorni: prodotto.giorni,
        offerta: prodotto.offerta,
        pezzi_offerta: prodotto.pezzi_offerta,
        data_inizio_offerta: prodotto.data_inizio_offerta,
        data_fine_offerta: prodotto.data_fine_offerta
    })
    .eq("id", window.idProdottoInModifica)
    .select();

console.log("DATI AGGIORNATI:", data);
console.log("ERRORE:", error);

if (error) {
    console.error(error);
    alert("Errore durante l'aggiornamento");
    return;
}

// REGISTRA LO STORICO SOLO QUANDO
// IL PRODOTTO VIENE MESSO IN OFFERTA
if (
    prodotto.offerta === true &&
    window.offertaOriginale !== true &&
    prodotto.pezzi_offerta > 0
) {
    const { error: erroreStorico } = await window.supabaseClient
        .from("storico_scadenze")
        .insert([{
            prodotto_id: String(window.idProdottoInModifica),
            codice: prodotto.codice,
            descrizione: prodotto.descrizione,
            reparto: prodotto.reparto,
            scadenza: prodotto.scadenza,
            giorni: prodotto.giorni,
            stato: "in_offerta",
            intervento: "Metti in offerta",
            pezzi_offerta: prodotto.pezzi_offerta,
            punto_vendita: puntoVendita
        }]);

    if (erroreStorico) {
        console.error("Errore inserimento storico:", erroreStorico);
        alert("Il prodotto ÃÂ¨ stato salvato, ma non ÃÂ¨ stato registrato nello storico.");
        return;
    }

    console.log("Storico salvato:", prodotto.pezzi_offerta, "pezzi");
}

await ricaricaProdotti();

window.prodottoInModifica = undefined;
window.idProdottoInModifica = undefined;    
} else {
    

     console.log("Sto salvando su Supabase");
    const { error } = await window.supabaseClient
        .from("prodotti")
      .insert([{
    codice: prodotto.codice,
    descrizione: prodotto.descrizione,
    reparto: prodotto.reparto,
    scadenza: prodotto.scadenza,
    giorni: prodotto.giorni,
    quantita: "",
    prezzo: "",
    note: "",
    supermercato: "San Cesareo",
    punto_vendita: puntoVendita,
    offerta: prodotto.offerta,
pezzi_offerta: prodotto.pezzi_offerta,
data_inizio_offerta: prodotto.data_inizio_offerta,
data_fine_offerta: prodotto.data_fine_offerta
}]);
       console.log("Errore:", error);
     
    if (error) {
        console.error(error);
        alert("Errore durante il salvataggio su Supabase");
        return;
    }

    Prodotti.aggiungi(prodotto);

}
    

    modal.style.display = "none";

};
});
function renderTabellaFiltrata(filtro) {

    let lista = Prodotti.tutti();

    switch (filtro) {

        case "scaduti":
            lista = lista.filter(p => p.giorni < 0);
            break;

        case "entro3":
            lista = lista.filter(p => p.giorni >= 0 && p.giorni <= 3);
            break;

        case "entro7":
            lista = lista.filter(p => p.giorni >= 4 && p.giorni <= 7);
            break;

        case "entro10":
            lista = lista.filter(p => p.giorni >= 8 && p.giorni <= 10);
            break;

        case "entro15":
            lista = lista.filter(p => p.giorni >= 11 && p.giorni <= 15);
            break;

        default:
            lista = Prodotti.tutti();
    }

    const tbody = document.getElementById("productTable");
    tbody.innerHTML = "";

    lista.forEach((p, index) => {

        tbody.innerHTML += `
        <tr>
            <td>${p.codice}</td>
            <td>${p.descrizione}</td>
            <td>${p.reparto}</td>
            <td>${formattaData(p.scadenza)}</td>
            <td>${p.giorni}</td>
            <td>
    ${
        ["entro3", "entro7", "entro10", "entro15"].includes(filtro)
        ? `
            <button class="btn-offerta" onclick="mettiInOfferta(${p.id}, '${filtro}')">
                <i class="fa-solid fa-tag"></i>
            </button>
          `
        : ""
    }

    <button class="btn-edit" onclick="modificaProdotto(${p.id})">
        <i class="fa-solid fa-pen-to-square"></i>
    </button>

    <button class="btn-delete" onclick="eliminaProdotto(${index})">
        <i class="fa-solid fa-trash"></i>
    </button>
</td>
</tr>
`;                
    });

}
function modificaProdotto(id) {
 console.log(document.getElementById("offerta"));
console.log(document.getElementById("pezzi_offerta"));
console.log(document.getElementById("productModal"));
 console.log("Sono entrato in modifica", id);

    const p = Prodotti.tutti().find(x => x.id == id);

    if (!p) return;

    document.getElementById("codice").value = p.codice || "";
    document.getElementById("descrizione").value = p.descrizione || "";
    document.getElementById("categoria").value = p.reparto || "";
    document.getElementById("scadenza").value = p.scadenza || "";
    document.getElementById("quantita").value = p.quantita || "";
    document.getElementById("prezzo").value = p.prezzo || "";
    document.getElementById("note").value = p.note || "";
    const chk = document.getElementById("offerta");
const pezzi = document.getElementById("pezzi_offerta");

if (chk) {
    chk.checked = p.offerta || false;
}

if (pezzi) {
    pezzi.value = p.pezzi_offerta || 0;
}
const dataInizio = document.getElementById("data_inizio_offerta");
const dataFine = document.getElementById("data_fine_offerta");

if (dataInizio) {
    dataInizio.value = p.data_inizio_offerta || "";
}

if (dataFine) {
    dataFine.value = p.data_fine_offerta || "";
}
const box = document.getElementById("pezziOffertaBox");
const boxDateOfferta = document.getElementById("dateOffertaBox");

if (box) {
    box.style.display = p.offerta ? "block" : "none";
}

if (boxDateOfferta) {
    boxDateOfferta.style.display = p.offerta ? "block" : "none";
}
    window.prodottoInModifica = p;
    window.offertaOriginale = !!p.offerta;

window.idProdottoInModifica = p.id;

console.log("ID prodotto:", p.id);
 
    document.getElementById("productModal").style.display = "flex";
}
function mettiInOfferta(id, filtro) {
    modificaProdotto(id);

    const chk = document.getElementById("offerta");
    const box = document.getElementById("pezziOffertaBox");
    const boxDateOfferta = document.getElementById("dateOffertaBox");

    if (chk) {
        chk.checked = true;
    }

    if (box) {
        box.style.display = "block";
    }
    if (boxDateOfferta) {
    boxDateOfferta.style.display = "block";
}
    if (boxDateOfferta) {
        boxDateOfferta.style.display = "block";
    }

    // Determina la durata dell'offerta
    let giorniOfferta = 0;

    if (filtro === "entro3") {
        giorniOfferta = 3;
    } else if (filtro === "entro7") {
        giorniOfferta = 7;
    } else if (filtro === "entro10") {
        giorniOfferta = 10;
    } else if (filtro === "entro15") {
        giorniOfferta = 15;
    }

    // Data inizio = oggi
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    // Data fine = oggi + 3/7/10/15 giorni
    const fine = new Date(oggi);
    fine.setDate(fine.getDate() + giorniOfferta);

    // Formato YYYY-MM-DD per i campi input type="date"
    const formattaInputData = (data) => {
        const anno = data.getFullYear();
        const mese = String(data.getMonth() + 1).padStart(2, "0");
        const giorno = String(data.getDate()).padStart(2, "0");

        return `${anno}-${mese}-${giorno}`;
    };

    const dataInizio = document.getElementById("data_inizio_offerta");
    const dataFine = document.getElementById("data_fine_offerta");

    if (dataInizio) {
        dataInizio.value = formattaInputData(oggi);
    }

    if (dataFine) {
        dataFine.value = formattaInputData(fine);
    }
}
function eliminaProdotto(index){

    if(confirm("Eliminare questo prodotto?")){

        Prodotti.tutti().splice(index,1);

        Storage.salva(Prodotti.lista);
        renderTabella();
        Dashboard.aggiorna();
    }
}
const importCSVBtn = document.getElementById("importCSV");
const csvFile = document.getElementById("csvFile");

if (importCSVBtn && csvFile) {

    importCSVBtn.onclick = () => {
        csvFile.click();
    };

    csvFile.onchange = async (e) => {

        const file = e.target.files[0];

        if (!file) return;

        console.log("CSV selezionato:", file.name);

        // Nome del file = reparto
        const nomeFile = file.name
            .toLowerCase()
            .replace(".csv", "")
            .trim();

        const reparti = {
            macelleria: "Macelleria",
            latticini: "Latticini",
            gastronomia: "Gastronomia",
            ortofrutta: "Ortofrutta",
            pescheria: "Pescheria",
            surgelati: "Surgelati",
            pane: "Pane"
        };

      const repartoCSV = document.getElementById("repartoCSV");
      const repartoSelezionato = repartoCSV ? repartoCSV.value : "";
      const repartoFile = repartoSelezionato || reparti[nomeFile] || "Altro";
      
      const puntoVendita = await getPuntoVenditaCorrente();

      if (!puntoVendita) {
          alert("Impossibile determinare il punto vendita.");
          return;
      }

      console.log("Punto vendita importazione:", puntoVendita);
      console.log("Reparto assegnato:", repartoSelezionato || repartoFile);        
        const reader = new FileReader();

        reader.onload = async function(event) {

            try {

                console.log("CSV letto");

                const testo = event.target.result;

                console.log("Lunghezza CSV:", testo.length);

                const righe = testo.trim().split(/\r\n|\n|\r/);

                console.log("Numero righe:", righe.length);

                const prodotti = [];

                const oggi = new Date();
                oggi.setHours(0, 0, 0, 0);

                for (let i = 1; i < righe.length; i++) {

                    if (!righe[i].trim()) continue;

                    const campi = righe[i].split(";");

                    if (campi.length < 3) continue;

                    if (
                        !campi[0].trim() ||
                        !campi[1].trim() ||
                        !campi[2].trim()
                    ) {
                        console.log("Riga saltata:", righe[i]);
                        continue;
                    }

                    const codice = campi[0].trim();
                    const descrizione = campi[1].trim();
                    const data = campi[2].trim();

                    const parti = data.split("/");

                    if (parti.length !== 3) {
                        console.log("Data non valida:", data);
                        continue;
                    }

                    const scadenza = new Date(
                        parti[2],
                        parti[1] - 1,
                        parti[0]
                    );

                    scadenza.setHours(0, 0, 0, 0);

                    const giorni = Math.ceil(
                        (scadenza - oggi) / (1000 * 60 * 60 * 24)
                    );

                    prodotti.push({
                        codice: codice,
                        descrizione: descrizione,
                      reparto: repartoFile,
                        scadenza:
                            parti[2] + "-" +
                            parti[1] + "-" +
                            parti[0],
                        giorni: giorni,
                        quantita: "",
                        prezzo: "",
                        note: "",
                        punto_vendita: puntoVendita
                    });
                }

                console.log(
                    "Prodotti trovati:",
                    prodotti.length
                );

                if (prodotti.length === 0) {
                    alert("Nessun prodotto trovato nel CSV.");
                    return;
                }

                // Sostituisce SOLO il reparto del CSV importato
const { error: erroreReparto } = await window.supabaseClient
    .from("prodotti")
    .delete()
    .eq("reparto", repartoFile)
    .eq("punto_vendita", puntoVendita);

if (erroreReparto) {
    console.error("Errore cancellazione reparto:", erroreReparto);

    alert(
        "Errore cancellazione reparto: " +
        JSON.stringify(erroreReparto)
    );

    return;
}
// Aggiorna riquadro Importazione
const statoImportazione = document.getElementById("statoImportazione");
const repartoImportazione = document.getElementById("repartoImportazione");
const fileImportazione = document.getElementById("fileImportazione");
const prodottiImportati = document.getElementById("prodottiImportati");
const ultimoImport = document.getElementById("ultimoImport");

if (statoImportazione) {
    statoImportazione.textContent = "Ã°ÂÂÂ¡ Importazione in corso...";
}

if (repartoImportazione) {
    repartoImportazione.textContent = repartoFile;
}

if (fileImportazione) {
    fileImportazione.textContent = file.name;
}

if (prodottiImportati) {
    prodottiImportati.textContent = "0 / " + prodotti.length;
}
                // Importazione a blocchi
                const BLOCCO = 100;

                for (
                    let i = 0;
                    i < prodotti.length;
                    i += BLOCCO
                ) {

                    const blocco =
                        prodotti.slice(i, i + BLOCCO);

                    const { error } =
                        await window.supabaseClient
                            .from("prodotti")
                            .insert(blocco);

                    if (error) {

                        console.error(error);

                        alert(
                            "Errore nel blocco " +
                            (i / BLOCCO + 1) +
                            ": " +
                            JSON.stringify(error)
                        );

                        return;
                    }

                    console.log(
                        "Caricati " +
                        Math.min(
                            i + BLOCCO,
                            prodotti.length
                        ) +
                        " di " +
                        prodotti.length
                    );
                    if (prodottiImportati) {
    prodottiImportati.textContent =
        Math.min(i + BLOCCO, prodotti.length) +
        " / " +
        prodotti.length;
}
                }

                // Ricarica i prodotti da Supabase
                const { data, error } =
                    await window.supabaseClient
                        .from("prodotti")
                        .select("*")
                        .eq("punto_vendita", puntoVendita)
                        .order("id", { ascending: true });

                if (error) {
                    console.error(error);
                    alert(
                        "Errore nel caricamento dei prodotti."
                    );
                    return;
                }

                Prodotti.carica(data);

                renderTabella();

                Dashboard.aggiorna();

                if (statoImportazione) {
    statoImportazione.textContent = "Ã°ÂÂÂ¢ Completato";
}

if (ultimoImport) {
    ultimoImport.textContent =
        new Date().toLocaleString("it-IT");
}
                
                alert(
                    "Importazione completata!\n" +
                    prodotti.length +
                    " prodotti caricati nel reparto " +
                    repartoFile
                );

            } catch (errore) {

                console.error(
                    "ERRORE CSV:",
                    errore
                );

                alert(
                    "Errore durante l'importazione CSV."
                );
            }
        };

        reader.readAsText(file);

        // Permette di ricaricare anche lo stesso CSV
        csvFile.value = "";
    };
}

document.getElementById("ricerca")?.addEventListener("input", function () { 

    const testo = this.value.toLowerCase();

    const lista = Prodotti.tutti().filter(p =>
        (p.codice || "").toLowerCase().includes(testo) ||
        (p.descrizione || "").toLowerCase().includes(testo) ||
        (p.reparto || "").toLowerCase().includes(testo)
    );

    const tbody = document.getElementById("productTable");
    tbody.innerHTML = "";

    lista.forEach((p, index) => {

     tbody.innerHTML +=
    '<tr>' +
        '<td>' + p.codice + '</td>' +
        '<td>' + p.descrizione + '</td>' +
        '<td>' + p.reparto + '</td>' +
        '<td>' + formattaData(p.scadenza) + '</td>' +
        '<td>' + p.giorni + '</td>' +
        '<td>' +
            '<button class="btn-edit" onclick="modificaProdotto(' + p.id + ')">' +
                '<i class="fa-solid fa-pen-to-square"></i>' +
            '</button>' +
            '<button class="btn-delete" onclick="eliminaProdotto(' + index + ')">' +
                '<i class="fa-solid fa-trash"></i>' +
            '</button>' +
        '</td>' +
    '</tr>';
    });

});
const menuOfferte = document.getElementById("menuOfferte");
const paginaOfferte = document.getElementById("paginaOfferte");
const dashboard = document.getElementById("dashboard");
const tornaDashboard = document.getElementById("tornaDashboard");
console.log({
    menuOfferte,
    paginaOfferte,
    dashboard,
    tornaDashboard
});

if (menuOfferte) {
    menuOfferte.addEventListener("click", (e) => {
    e.preventDefault();

    dashboard.style.display = "none";
    paginaOfferte.style.display = "block";
});
}
if (tornaDashboard) {
    tornaDashboard.addEventListener("click", () => {

    paginaOfferte.style.display = "none";
    dashboard.style.display = "block";

});
} 

// ======================================================
// ELIMINA LISTA COMPLETA DI UN REPARTO
// ======================================================

async function eliminaListaReparto(reparto) {

    const conferma = confirm(
        "Sei sicuro di voler eliminare tutta la lista del reparto " +
        reparto +
        "?"
    );

    if (!conferma) return;

    const puntoVendita = await getPuntoVenditaCorrente();

    if (!puntoVendita) {
        alert("Impossibile determinare il punto vendita.");
        return;
    }

    const { error } = await window.supabaseClient
        .from("prodotti")
        .delete()
        .eq("reparto", reparto)
        .eq("punto_vendita", puntoVendita);

    if (error) {
        console.error("Errore eliminazione lista:", error);
        alert("Errore durante l'eliminazione della lista.");
        return;
    }

    alert("Lista " + reparto + " eliminata correttamente.");

    // Ricarica la dashboard e aggiorna i conteggi
    location.reload();
}

