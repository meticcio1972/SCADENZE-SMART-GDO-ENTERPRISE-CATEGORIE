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

    const dimensionePagina = 1000;

    const richieste = [
        window.supabaseClient
            .from("prodotti")
            .select("*")
            .order("id", { ascending: true })
            .range(0, dimensionePagina - 1),

        window.supabaseClient
            .from("prodotti")
            .select("*")
            .order("id", { ascending: true })
            .range(dimensionePagina, dimensionePagina * 2 - 1),

        window.supabaseClient
            .from("prodotti")
            .select("*")
            .order("id", { ascending: true })
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

    console.log("ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Scadenze Smart GDO Enterprise avviato");
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

    const { data, error } = await window.supabaseClient
        .from("prodotti")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    Prodotti.carica(ricalcolaGiorni(data));

    // Aggiorna prima la Dashboard. Alcune funzioni della Dashboard
    // possono ridisegnare la tabella: il filtro deve essere applicato
    // come ULTIMA operazione.
    if (typeof Dashboard !== "undefined") {
        Dashboard.aggiorna();
    }

    if (filtroDashboardAttivo) {
        renderTabellaFiltrata(filtroDashboardAttivo);
    } else if (typeof renderTabella === "function") {
        renderTabella();
    }
}
function formattaData(data) {

    if (!data) return "";

    const [anno, mese, giorno] = data.split("-");

   return `${giorno}/${mese}/${anno}`;                                                                    
} 

  let filtroReparto = "";

// Mantiene il filtro della dashboard anche dopo il salvataggio/modifica
// di una referenza. Senza questo stato, ricaricaProdotti() ridisegna
// la tabella completa e perde il filtro "Scaduti/Entro 3/7/10/15".
let filtroDashboardAttivo = "";

// ============================================================
// VENDITE MEDIE SETTIMANALI PER LA CATEGORIA SELEZIONATA
// ============================================================
const STORICO_VENDITE_TABLE = "storico_vendite";
const CACHE_VENDITE_MEDIE = new Map();
let richiestaVenditeToken = 0;

function escapeHtmlVendite(v) {
    return String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizzaCodiceVendite(v) {
    let s = String(v ?? "").trim();
    // Alcuni import CSV/database possono trasformare un codice numerico
    // come 31399 in "31399.0". Lo riportiamo al codice originale.
    if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, "");
    return s;
}

function parseDataPeriodoVendite(v) {
    if (!v) return null;
    const s = String(v).trim();

    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        if (!Number.isNaN(d.getTime())) return d;
    }

    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
    if (m) {
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        if (!Number.isNaN(d.getTime())) return d;
    }

    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function estraiPeriodoVendite(v) {
    if (!v) return null;
    const s = String(v);

    const dateISO = [...s.matchAll(/(\d{4}-\d{1,2}-\d{1,2})/g)]
        .map(m => parseDataPeriodoVendite(m[1]))
        .filter(Boolean);

    if (dateISO.length >= 2) {
        return { inizio: dateISO[0], fine: dateISO[1] };
    }

    const dateIT = [...s.matchAll(/(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})/g)]
        .map(m => parseDataPeriodoVendite(m[1]))
        .filter(Boolean);

    if (dateIT.length >= 2) {
        return { inizio: dateIT[0], fine: dateIT[1] };
    }

    return null;
}

function aggiornaPeriodoVendite(periodo, globale) {
    if (!periodo) return;

    if (!globale.inizio || periodo.inizio < globale.inizio) {
        globale.inizio = new Date(periodo.inizio);
    }
    if (!globale.fine || periodo.fine > globale.fine) {
        globale.fine = new Date(periodo.fine);
    }
}

function giorniPeriodoVendite(periodo) {
    if (!periodo?.inizio || !periodo?.fine) return null;

    const a = new Date(periodo.inizio);
    const b = new Date(periodo.fine);
    a.setHours(0,0,0,0);
    b.setHours(0,0,0,0);

    const giorni = Math.floor((b - a) / 86400000) + 1;
    return giorni > 0 ? giorni : null;
}

function formattaPeriodoVendite(periodo) {
    if (!periodo?.inizio || !periodo?.fine) return "";
    const f = d => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    return `${f(periodo.inizio)} - ${f(periodo.fine)}`;
}

async function caricaVenditeMediePerLista(lista) {
    const codici = [...new Set(
        (lista || [])
            .map(p => normalizzaCodiceVendite(p.codice))
            .filter(Boolean)
    )];

    if (!codici.length) return;

    const nonInCache = codici.filter(c => !CACHE_VENDITE_MEDIE.has(c));
    if (!nonInCache.length) return;

    const token = ++richiestaVenditeToken;
    const stato = document.getElementById("statoVenditeMedie");

    if (stato) {
        stato.textContent = `Calcolo vendite medie per ${nonInCache.length} referenze...`;
    }

    try {
        const righe = [];
        const batch = 100;

        for (let i = 0; i < nonInCache.length; i += batch) {
            const gruppo = nonInCache.slice(i, i + batch);

            const { data, error } = await window.supabaseClient
                .from(STORICO_VENDITE_TABLE)
                .select("codice,descrizione,quantita,periodo")
                .in("codice", gruppo);

            if (error) throw new Error(error.message);
            righe.push(...(data || []));
        }

        const venditePerCodice = new Map();
        const periodoGlobale = { inizio: null, fine: null };

        for (const riga of righe) {
            const codice = normalizzaCodiceVendite(riga.codice);
            if (!codice) continue;

            const q = Number(riga.quantita);
            if (!Number.isNaN(q)) {
                venditePerCodice.set(
                    codice,
                    (venditePerCodice.get(codice) || 0) + q
                );
            }

            aggiornaPeriodoVendite(
                estraiPeriodoVendite(riga.periodo),
                periodoGlobale
            );
        }

        // Lo storico vendite utilizzato dal gestionale copre
        // 01/01/2026 - 31/08/2026 = 243 giorni.
        // Se il campo "periodo" non e' leggibile, usiamo comunque
        // il periodo ufficiale dello storico invece di trasformare
        // tutte le referenze in N/D.
        const giorni = giorniPeriodoVendite(periodoGlobale) || 243;

        for (const codice of nonInCache) {
            if (!venditePerCodice.has(codice) || !giorni) {
                CACHE_VENDITE_MEDIE.set(codice, null);
                continue;
            }

            const totale = venditePerCodice.get(codice) || 0;
            const mediaSettimanale = (totale / giorni) * 7;

            CACHE_VENDITE_MEDIE.set(
                codice,
                Math.round(mediaSettimanale * 10) / 10
            );
        }

        if (token !== richiestaVenditeToken) return;

        const reparto = Dashboard?.repartoSelezionato || "";
        const visibili = (Prodotti.tutti() || []).filter(p => {
            if (reparto && String(p.reparto || "").trim().toLowerCase() !== reparto.trim().toLowerCase()) return false;
            return true;
        });

        renderTabella(visibili);

        if (stato) {
            const trovate = nonInCache.filter(c => CACHE_VENDITE_MEDIE.get(c) !== null).length;
            const periodoTesto = giorni ? formattaPeriodoVendite(periodoGlobale) : "periodo non disponibile";
            stato.textContent = `${trovate} referenze con storico. Periodo: ${periodoTesto}${giorni ? ` (${giorni} giorni)` : ""}.`;
        }

    } catch (errore) {
        console.error("Errore vendite medie:", errore);
        if (token === richiestaVenditeToken && stato) {
            stato.textContent = "Errore vendite medie: " + errore.message;
        }
    }
}

function renderTabella(listaArgomento) {
    console.time("RENDER TABELLA");

    const tbody = document.getElementById("productTable");
    if (!tbody) return;

    let lista = Array.isArray(listaArgomento) ? listaArgomento : Prodotti.tutti();

    // Se la funzione viene richiamata senza una lista esplicita (come
    // dopo un salvataggio), conserva anche il filtro di scadenza attivo.
    if (!Array.isArray(listaArgomento) && filtroDashboardAttivo) {
        lista = applicaFiltroScadenza(lista, filtroDashboardAttivo);
    }

    if (!Array.isArray(listaArgomento) && filtroReparto) {
        lista = lista.filter(p =>
            (p.reparto || "").toLowerCase() === filtroReparto.toLowerCase()
        );
    }

    const righe = [];

    lista.forEach((p, index) => {
        const codice = normalizzaCodiceVendite(p.codice);
        const media = CACHE_VENDITE_MEDIE.get(codice);
        const mediaTesto =
            typeof media === "number"
                ? `${media.toFixed(1)} pz/settimana`
                : (CACHE_VENDITE_MEDIE.has(codice) ? "N/D" : "-");

        righe.push(`
            <tr>
                <td>${escapeHtmlVendite(p.codice)}</td>
                <td>${escapeHtmlVendite(p.descrizione)}</td>
                <td>${escapeHtmlVendite(p.reparto)}</td>
                <td>${escapeHtmlVendite(formattaData(p.scadenza))}</td>
                <td>${escapeHtmlVendite(p.giorni)}</td>
                <td class="media-settimanale">${escapeHtmlVendite(mediaTesto)}</td>
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

    // Le vendite medie vengono richieste solo quando l'utente ha selezionato
    // una categoria: non interroghiamo lo storico per tutte le referenze.
    const repartoAttivo = typeof Dashboard !== "undefined"
        ? Dashboard.repartoSelezionato
        : null;

    if (repartoAttivo && lista.length) {
        caricaVenditeMediePerLista(lista);
    }

    console.timeEnd("RENDER TABELLA");
}

const menuReparto = document.getElementById("repartoCSV");

if (menuReparto) {
    menuReparto.addEventListener("change", () => {
        filtroReparto = menuReparto.value;
        renderTabella();
    });
}

// ============================================================
// FILTRO CARDS DASHBOARD: memorizza la lista di lavoro scelta
// anche se il codice della Dashboard gestisce il click altrove.
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const mappaFiltriDashboard = {
        cardScaduti: "scaduti",
        cardEntro3: "entro3",
        cardEntro7: "entro7",
        cardEntro10: "entro10",
        cardEntro15: "entro15",
        cardTotale: ""
    };

    Object.entries(mappaFiltriDashboard).forEach(([id, filtro]) => {
        const card = document.getElementById(id);
        if (!card) return;

        card.addEventListener("click", () => {
            filtroDashboardAttivo = filtro;
            console.log("Filtro Dashboard memorizzato:", filtro || "tutti");
        }, true);
    });
});


// ============================================================
// STATO LAVORAZIONE
// Crea il campo nel modale senza richiedere modifiche a index.html.
// ============================================================
function preparaCampoStatoLavorazione() {
    const modalBox = document.querySelector("#productModal .modal-box");
    if (!modalBox) return;

    // Evita di crearlo due volte
    if (document.getElementById("stato_lavorazione")) return;

    const separatoreOfferta = modalBox.querySelector('hr[style*="margin:15px 0"]');

    const contenitore = document.createElement("div");
    contenitore.id = "statoLavorazioneBox";
    contenitore.style.cssText =
        "margin:15px 0;padding:14px 0;border-top:1px solid rgba(255,255,255,.25);";

    contenitore.innerHTML = `
        <label for="stato_lavorazione"
               style="display:block;font-weight:700;margin-bottom:8px;">
            Stato lavorazione
        </label>
        <select id="stato_lavorazione"
                style="width:100%;padding:12px;border-radius:8px;font-size:16px;">
            <option value="DA_LAVORARE">ð´ DA LAVORARE</option>
            <option value="IN_OFFERTA">ð  IN OFFERTA</option>
            <option value="OCCHI_PEZZI">ð¡ OCCHI PEZZI</option>
            <option value="LAVORATO">ð¢ LAVORATO</option>
            <option value="NON_LAVORARE">â« NON LAVORARE</option>
        </select>
    `;

    if (separatoreOfferta) {
        modalBox.insertBefore(contenitore, separatoreOfferta);
    } else {
        modalBox.appendChild(contenitore);
    }
}

// ===== MODALE NUOVO PRODOTTO =====

document.addEventListener("DOMContentLoaded", () => {

    preparaCampoStatoLavorazione();

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
        const statoLavorazione = document.getElementById("stato_lavorazione");
        if (statoLavorazione) statoLavorazione.value = "DA_LAVORARE";
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

const prodotto = {
    codice: document.getElementById("codice").value,
    descrizione: document.getElementById("descrizione").value,
    reparto: document.getElementById("categoria").value,
    scadenza: scadenza,
    giorni: giorni,
    offerta: document.getElementById("offerta")?.checked || false,
pezzi_offerta: parseInt(document.getElementById("pezzi_offerta")?.value || "0"),
data_inizio_offerta: document.getElementById("data_inizio_offerta")?.value || null,
data_fine_offerta: document.getElementById("data_fine_offerta")?.value || null,
stato_lavorazione: document.getElementById("stato_lavorazione")?.value || "DA_LAVORARE"
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
        data_fine_offerta: prodotto.data_fine_offerta,
        stato_lavorazione: prodotto.stato_lavorazione
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
            pezzi_offerta: prodotto.pezzi_offerta
        }]);

    if (erroreStorico) {
        console.error("Errore inserimento storico:", erroreStorico);
        alert("Il prodotto ÃÂÃÂÃÂÃÂ¨ stato salvato, ma non ÃÂÃÂÃÂÃÂ¨ stato registrato nello storico.");
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
    offerta: prodotto.offerta,
pezzi_offerta: prodotto.pezzi_offerta,
data_inizio_offerta: prodotto.data_inizio_offerta,
data_fine_offerta: prodotto.data_fine_offerta,
stato_lavorazione: prodotto.stato_lavorazione
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
function applicaFiltroScadenza(lista, filtro) {
    const dati = Array.isArray(lista) ? lista : [];

    switch (filtro) {
        case "scaduti":
            return dati.filter(p => p.giorni < 0);
        case "entro3":
            return dati.filter(p => p.giorni >= 0 && p.giorni <= 3);
        case "entro7":
            return dati.filter(p => p.giorni >= 4 && p.giorni <= 7);
        case "entro10":
            return dati.filter(p => p.giorni >= 8 && p.giorni <= 10);
        case "entro15":
            return dati.filter(p => p.giorni >= 11 && p.giorni <= 15);
        default:
            return dati;
    }
}

function renderTabellaFiltrata(filtro) {

    // Memorizza SEMPRE la scelta della dashboard prima di ridisegnare.
    filtroDashboardAttivo = filtro || "";

    const lista = applicaFiltroScadenza(Prodotti.tutti(), filtroDashboardAttivo);

    // Usa il renderer principale: manteniamo anche la colonna
    // "Vendite medie settimanali".
    renderTabella(lista);

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

    const statoLavorazione = document.getElementById("stato_lavorazione");
    if (statoLavorazione) {
        statoLavorazione.value = p.stato_lavorazione || "DA_LAVORARE";
    }
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

    csvFile.onchange = (e) => {

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
                        note: ""
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
    .eq("reparto", repartoFile);

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
    statoImportazione.textContent = "ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ¡ Importazione in corso...";
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
    statoImportazione.textContent = "ÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂ¢ Completato";
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

    const testo = this.value.toLowerCase().trim();
    let lista = Prodotti.tutti();

    const repartoAttivo = typeof Dashboard !== "undefined"
        ? Dashboard.repartoSelezionato
        : null;

    if (repartoAttivo) {
        lista = lista.filter(p =>
            String(p.reparto || "").trim().toLowerCase() ===
            String(repartoAttivo).trim().toLowerCase()
        );
    }

    if (testo) {
        lista = lista.filter(p =>
            (p.codice || "").toLowerCase().includes(testo) ||
            (p.descrizione || "").toLowerCase().includes(testo) ||
            (p.reparto || "").toLowerCase().includes(testo)
        );
    }

    renderTabella(lista);
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

    const { error } = await window.supabaseClient
        .from("prodotti")
        .delete()
        .eq("reparto", reparto);

    if (error) {
        console.error("Errore eliminazione lista:", error);
        alert("Errore durante l'eliminazione della lista.");
        return;
    }

    alert("Lista " + reparto + " eliminata correttamente.");

    // Ricarica la dashboard e aggiorna i conteggi
    location.reload();
}



document.addEventListener("DOMContentLoaded", () => {
    preparaCampoStatoLavorazione();
});
