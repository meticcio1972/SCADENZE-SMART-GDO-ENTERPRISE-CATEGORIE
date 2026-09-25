"use strict";

/*
=====================================
DASHBOARD
Scadenze Smart GDO Enterprise
=====================================
*/

const CATEGORIE_GDO = [
    "Macelleria",
    "Pollame",
    "Pescheria",
    "Salumeria",
    "Formaggi",
    "Latticini",
    "Yogurt e Dessert",
    "Latte Fresco",
    "Latte UHT",
    "Caffè",
    "Tè e Infusi",
    "Biscotti",
    "Merendine",
    "Cioccolato",
    "Caramelle",
    "Dolciumi",
    "Cereali e Prima Colazione",
    "Creme Spalmabili",
    "Marmellate e Confetture",
    "Pasta",
    "Riso",
    "Legumi",
    "Conserve",
    "Tonno e Pesce in scatola",
    "Salse e Condimenti",
    "Olio",
    "Aceto",
    "Farine",
    "Zucchero e Dolcificanti",
    "Sale e Spezie",
    "Preparati per Cucina",
    "Acqua",
    "Bibite",
    "Succhi e Nettari",
    "Birra",
    "Vini",
    "Liquori e Distillati",
    "Bevande Energetiche",
    "Pane",
    "Pasticceria",
    "Prodotti da Forno",
    "Fette Biscottate e Cracker",
    "Surgelati",
    "Gelati",
    "Piatti Pronti Surgelati",
    "Ortofrutta",
    "IV Gamma",
    "Frutta Secca",
    "Prima Infanzia",
    "Omogeneizzati e Baby Food",
    "Cibbiani",
    "Cibbigatto",
    "Altro"
];

const Dashboard = {

    repartoSelezionato: null,

    dati: {

        scaduti: 0,
        entro3: 0,
        entro7: 0,
        entro10: 0,
        entro15: 0,
        totale: 0,

        reparti: Object.fromEntries(
            CATEGORIE_GDO.map(reparto => [reparto, 0])
        )

    },


    aggiorna: function () {

        const tuttiProdotti = Prodotti.tutti();

        // =====================================
        // CONTEGGIO GENERALE DEI REPARTI
        // =====================================

        Object.keys(this.dati.reparti).forEach(reparto => {
            this.dati.reparti[reparto] = 0;
        });

        for (const p of tuttiProdotti) {

            if (this.dati.reparti[p.reparto] !== undefined) {
                this.dati.reparti[p.reparto]++;
            }

        }

        // =====================================
        // PRODOTTI DA CONTROLLARE
        // Se è selezionato un reparto,
        // lavoriamo SOLO su quel reparto.
        // =====================================

        let prodotti = tuttiProdotti;

        if (this.repartoSelezionato) {

            prodotti = tuttiProdotti.filter(
                p => p.reparto === this.repartoSelezionato
            );

        }

        // =====================================
        // CALCOLO CONTATORI
        // =====================================

        this.dati.totale = prodotti.length;
        this.dati.scaduti = 0;
        this.dati.entro3 = 0;
        this.dati.entro7 = 0;
        this.dati.entro10 = 0;
        this.dati.entro15 = 0;

        for (const p of prodotti) {

            const giorni = Number(p.giorni);

            if (giorni < 0) {

                this.dati.scaduti++;

            } else if (giorni <= 3) {

                this.dati.entro3++;

            } else if (giorni <= 7) {

                this.dati.entro7++;

            } else if (giorni <= 10) {

                this.dati.entro10++;

            } else if (giorni <= 15) {

                this.dati.entro15++;

            }

        }

        // =====================================
        // AGGIORNA DASHBOARD
        // =====================================

        if (document.getElementById("scaduti")) {

            document.getElementById("scaduti").textContent =
                this.dati.scaduti;

            document.getElementById("entro3").textContent =
                this.dati.entro3;

            document.getElementById("entro7").textContent =
                this.dati.entro7;

            document.getElementById("entro10").textContent =
                this.dati.entro10;

            document.getElementById("entro15").textContent =
                this.dati.entro15;

            document.getElementById("totale").textContent =
                this.dati.totale;


            // =====================================
            // NUMERI DEI REPARTI
            // Questi rimangono sempre generali.
            // =====================================

            CATEGORIE_GDO.forEach(reparto => {

                const elemento =
                    document.getElementById(
                        "count" + reparto.replace(/[^a-zA-Z0-9]/g, "")
                    );

                if (elemento) {
                    elemento.textContent =
                        this.dati.reparti[reparto] || 0;
                }

            });

        }

    }

};


// =====================================
// COSTRUZIONE CATEGORIE GDO
// =====================================


const IMMAGINI_CATEGORIE_GDO = {
    'Macelleria': "assets/categorie/v7-01-macelleria.jpg",
    'Pollame': "assets/categorie/v7-02-pollame.jpg",
    'Pescheria': "assets/categorie/v7-03-pescheria.jpg",
    'Salumeria': "assets/categorie/v7-04-salumeria.jpg",
    'Formaggi': "assets/categorie/v7-05-formaggi.jpg",
    'Latticini': "assets/categorie/v7-06-latticini.jpg",
    'Yogurt e Dessert': "assets/categorie/v7-07-yogurt-e-dessert.jpg",
    'Latte Fresco': "assets/categorie/v7-08-latte-fresco.jpg",
    'Latte UHT': "assets/categorie/v7-09-latte-uht.jpg",
    'Caffè': "assets/categorie/v7-10-caff.jpg",
    'Tè e Infusi': "assets/categorie/v7-11-t-e-infusi.jpg",
    'Biscotti': "assets/categorie/v7-12-biscotti.jpg",
    'Merendine': "assets/categorie/v7-13-merendine.jpg",
    'Cioccolato': "assets/categorie/v7-14-cioccolato.jpg",
    'Caramelle': "assets/categorie/v7-15-caramelle.jpg",
    'Dolciumi': "assets/categorie/v7-16-dolciumi.jpg",
    'Cereali e Prima Colazione': "assets/categorie/v7-17-cereali-e-prima-colazione.jpg",
    'Creme Spalmabili': "assets/categorie/v7-18-creme-spalmabili.jpg",
    'Marmellate e Confetture': "assets/categorie/v7-19-marmellate-e-confetture.jpg",
    'Pasta': "assets/categorie/v7-20-pasta.jpg",
    'Riso': "assets/categorie/v7-21-riso.jpg",
    'Legumi': "assets/categorie/v7-22-legumi.jpg",
    'Conserve': "assets/categorie/v7-23-conserve.jpg",
    'Tonno e Pesce in scatola': "assets/categorie/v7-24-tonno-e-pesce-in-scatola.jpg",
    'Salse e Condimenti': "assets/categorie/v7-25-salse-e-condimenti.jpg",
    'Olio': "assets/categorie/v7-26-olio.jpg",
    'Aceto': "assets/categorie/v7-27-aceto.jpg",
    'Farine': "assets/categorie/v7-28-farine.jpg",
    'Zucchero e Dolcificanti': "assets/categorie/v7-29-zucchero-e-dolcificanti.jpg",
    'Sale e Spezie': "assets/categorie/v7-30-sale-e-spezie.jpg",
    'Preparati per Cucina': "assets/categorie/v7-31-preparati-per-cucina.jpg",
    'Acqua': "assets/categorie/v7-32-acqua.jpg",
    'Bibite': "assets/categorie/v7-33-bibite.jpg",
    'Succhi e Nettari': "assets/categorie/v7-34-succhi-e-nettari.jpg",
    'Birra': "assets/categorie/v7-35-birra.jpg",
    'Vini': "assets/categorie/v7-36-vini.jpg",
    'Liquori e Distillati': "assets/categorie/v7-37-liquori-e-distillati.jpg",
    'Bevande Energetiche': "assets/categorie/v7-38-bevande-energetiche.jpg",
    'Pane': "assets/categorie/v7-39-pane.jpg",
    'Pasticceria': "assets/categorie/v7-40-pasticceria.jpg",
    'Prodotti da Forno': "assets/categorie/v7-41-prodotti-da-forno.jpg",
    'Fette Biscottate e Cracker': "assets/categorie/v7-42-fette-biscottate-e-cracker.jpg",
    'Surgelati': "assets/categorie/v7-43-surgelati.jpg",
    'Gelati': "assets/categorie/v7-44-gelati.jpg",
    'Piatti Pronti Surgelati': "assets/categorie/v7-45-piatti-pronti-surgelati.jpg",
    'Ortofrutta': "assets/categorie/v7-46-ortofrutta.jpg",
    'IV Gamma': "assets/categorie/v7-47-iv-gamma.jpg",
    'Frutta Secca': "assets/categorie/v7-48-frutta-secca.jpg",
    'Prima Infanzia': "assets/categorie/v7-49-prima-infanzia.jpg",
    'Omogeneizzati e Baby Food': "assets/categorie/v7-50-omogeneizzati-e-baby-food.jpg",
    'Cibbiani': "assets/categorie/v7-51-cibbiani.jpg",
    'Cibbigatto': "assets/categorie/v7-52-cibbigatto.jpg",
    'Altro': "assets/categorie/v7-53-altro.jpg",
};


/*
VERIFICA ASSOCIAZIONE IMMAGINI V7:
32 Acqua -> acqua
33 Bibite -> bibite analcoliche
34 Succhi e Nettari -> succhi
35 Birra -> birra
36 Vini -> vino
37 Liquori e Distillati -> liquori/distillati
38 Bevande Energetiche -> energy drink
39 Pane -> pane
40 Pasticceria -> pasticceria
41 Prodotti da Forno -> prodotti da forno
42 Fette Biscottate e Cracker -> fette biscottate/cracker
43 Surgelati -> surgelati
44 Gelati -> gelati
45 Piatti Pronti Surgelati -> piatti pronti
46 Ortofrutta -> frutta e verdura
47 IV Gamma -> insalate pronte
48 Frutta Secca -> frutta secca
49 Prima Infanzia -> prima infanzia
50 Omogeneizzati e Baby Food -> baby food
51 Cibbiani -> cibo per cani
52 Cibbigatto -> cibo per gatti
53 Altro -> assortimento generico
*/

function creaCategorieGDO() {

    const contenitoreReparti = document.getElementById("listaReparti");
    const menuImportazione = document.getElementById("repartoCSV");
    const menuCategoria = document.getElementById("categoria");

    if (contenitoreReparti) {
        contenitoreReparti.innerHTML = CATEGORIE_GDO.map(reparto => {
            const id = "count" + reparto.replace(/[^a-zA-Z0-9]/g, "");

            const immagine = IMMAGINI_CATEGORIE_GDO[reparto] || "assets/categorie/altro.svg";

            return `
                <div class="reparto-count-card categoria-card-visuale" onclick='selezionaReparto(${JSON.stringify(reparto)})' style="cursor:pointer;">
                    <div class="categoria-immagine">
                        <img src="${immagine}" alt="${reparto}">
                    </div>
                    <div class="categoria-nome">${reparto}</div>
                    <strong id="${id}">0 referenze</strong>
                    <button type="button" onclick='event.stopPropagation(); eliminaListaReparto(${JSON.stringify(reparto)})' title="Elimina lista">🗑</button>
                </div>
            `;
        }).join("");
    }

    if (menuImportazione) {
        menuImportazione.innerHTML =
            '<option value="">Seleziona reparto</option>' +
            CATEGORIE_GDO.map(reparto =>
                `<option value="${reparto}">${reparto}</option>`
            ).join("");
    }

    if (menuCategoria) {
        menuCategoria.innerHTML =
            CATEGORIE_GDO.map(reparto =>
                `<option value="${reparto}">${reparto}</option>`
            ).join("");
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", creaCategorieGDO);
} else {
    creaCategorieGDO();
}


// =====================================
// SELEZIONE REPARTO
// =====================================

function selezionaReparto(reparto) {
    Dashboard.repartoSelezionato = reparto;

    console.log("REPARTO SELEZIONATO:", reparto);

    const lista = Prodotti.tutti().filter(
        p => p.reparto === reparto
    );

    Dashboard.aggiorna();
    renderTabellaDashboard(lista);
}



// =====================================
// TABELLA DASHBOARD FILTRATA
// Mostra solo la lista ricevuta, mantenendo
// la tabella della Dashboard indipendente
// dal caricamento generale dei prodotti.
// =====================================

async function aggiornaMedieSettimanaliDashboard() {

    const celle = Array.from(document.querySelectorAll("#productTable .media-settimanale-dashboard"));
    if (!celle.length) return;

    const client = window.supabaseClient;
    if (!client) return;

    const normalizzaCodice = codice =>
        String(codice ?? "")
            .trim()
            .replace(/\s+/g, "")
            .replace(/\.0$/, "");

    const codici = [...new Set(
        celle.map(c => normalizzaCodice(c.dataset.codice)).filter(Boolean)
    )];

    const totali = new Map();

    for (let i = 0; i < codici.length; i += 100) {
        const gruppo = codici.slice(i, i + 100);

        const { data, error } = await client
            .from("storico_vendite")
            .select("codice, quantita")
            .in("codice", gruppo);

        if (error) {
            console.error("Errore lettura storico_vendite per medie settimanali:", error);
            continue;
        }

        (data || []).forEach(riga => {
            const codice = normalizzaCodice(riga.codice);
            const quantita = Number(riga.quantita) || 0;
            totali.set(codice, (totali.get(codice) || 0) + quantita);
        });
    }

    const GIORNI_STORICO = 243;

    celle.forEach(cella => {
        const codice = normalizzaCodice(cella.dataset.codice);
        const totale = totali.get(codice);

        if (totale === undefined) {
            cella.textContent = "N/D";
            return;
        }

        const media = (totale / GIORNI_STORICO) * 7;
        cella.textContent = media.toFixed(1);
    });
}


// ============================================================
// INDICATORE STATO LAVORAZIONE NELLA TABELLA DASHBOARD
// ============================================================
function indicatoreStatoLavorazioneDashboard(stato) {
    const stati = {
        DA_LAVORARE:   { colore: "#ef4444", testo: "DA LAVORARE" },
        IN_OFFERTA:    { colore: "#f97316", testo: "IN OFFERTA" },
        OCCHI_PEZZI:   { colore: "#eab308", testo: "OCCHI PEZZI" },
        LAVORATO:      { colore: "#22c55e", testo: "LAVORATO" },
        NON_LAVORARE:  { colore: "#6b7280", testo: "NON LAVORARE" },
        RESO_FORNITORE:{ colore: "#3b82f6", testo: "RESO A FORNITORE" }
    };

    const s = stati[stato] || stati.DA_LAVORARE;

    return `
        <span title="${s.testo}"
              aria-label="${s.testo}"
              style="
                display:inline-block;
                width:13px;
                height:13px;
                min-width:13px;
                border-radius:50%;
                background:${s.colore};
                margin-right:8px;
                vertical-align:middle;
                box-shadow:0 0 0 2px rgba(255,255,255,.18);
              "></span>
    `;
}


// ============================================================
// LEGENDA STATO LAVORAZIONE - DASHBOARD
// ============================================================
function inserisciLegendaStatoLavorazioneDashboard() {
    if (document.getElementById("legendaStatoLavorazione")) return;

    const tbody = document.getElementById("productTable");
    if (!tbody) return;

    const table = tbody.closest("table");
    if (!table || !table.parentElement) return;

    const wrapper = table.parentElement;
    const legenda = document.createElement("div");

    legenda.innerHTML = `
<!-- LEGENDA STATO LAVORAZIONE -->
<div id="legendaStatoLavorazione"
     style="
       display:flex;
       flex-wrap:wrap;
       align-items:center;
       gap:10px 16px;
       margin:0 0 14px 0;
       padding:10px 14px;
       border-radius:10px;
       background:rgba(255,255,255,.08);
       font-size:13px;
       line-height:1.4;
     ">
  <strong style="margin-right:4px;">Legenda:</strong>
  <span><i style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#ef4444;margin-right:5px;"></i>DA LAVORARE</span>
  <span><i style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#f97316;margin-right:5px;"></i>IN OFFERTA</span>
  <span><i style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#eab308;margin-right:5px;"></i>OCCHI PEZZI</span>
  <span><i style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#22c55e;margin-right:5px;"></i>LAVORATO</span>
  <span><i style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#6b7280;margin-right:5px;"></i>NON LAVORARE</span>
  <span><i style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#3b82f6;margin-right:5px;"></i>RESO A FORNITORE</span>
</div>
`;
    wrapper.insertBefore(legenda.firstElementChild, table);
}

document.addEventListener("DOMContentLoaded", inserisciLegendaStatoLavorazioneDashboard);

function renderTabellaDashboard(lista) {

    const tbody = document.getElementById("productTable");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Nessun prodotto presente.
                </td>
            </tr>
        `;
        return;
    }

    const tutti = Prodotti.tutti();

    lista.forEach(p => {

        const indiceGlobale = tutti.findIndex(
            x => String(x.id) === String(p.id)
        );

        tbody.innerHTML += `
            <tr>
                <td>${p.codice || ""}</td>
                <td>${indicatoreStatoLavorazioneDashboard(p.stato_lavorazione)}${p.descrizione || ""}</td>
                <td>${p.reparto || ""}</td>
                <td>${typeof formattaData === "function" ? formattaData(p.scadenza) : (p.scadenza || "")}</td>
                <td>${p.giorni ?? ""}</td>
                <td class="media-settimanale-dashboard" data-codice="${String(p.codice || "").replace(/\"/g, "&quot;")}">
                    —
                </td>
                <td>
                    <button class="btn-edit" onclick="modificaProdotto(${Number(p.id)})" title="Modifica">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-delete" onclick="eliminaProdotto(${indiceGlobale})" title="Elimina">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    aggiornaMedieSettimanaliDashboard();
}

// =====================================
// DESELEZIONA REPARTO
// =====================================

function deselezionaReparto() {
    Dashboard.repartoSelezionato = null;

    console.log("NESSUN REPARTO SELEZIONATO");

    Dashboard.aggiorna();
    renderTabellaDashboard(Prodotti.tutti());
}

// =====================================
// FILTRO DASHBOARD
// =====================================

function filtraDashboard(tipo) {

    let lista = Prodotti.tutti();

    // Prima applichiamo il reparto
    if (Dashboard.repartoSelezionato) {

        lista = lista.filter(
            p => p.reparto === Dashboard.repartoSelezionato
        );

    }

    // Poi applichiamo la scadenza
    switch (tipo) {

        case "scaduti":

            lista = lista.filter(
                p => Number(p.giorni) < 0
            );

            break;


        case "entro3":

            lista = lista.filter(
                p => Number(p.giorni) >= 0 &&
                     Number(p.giorni) <= 3
            );

            break;


        case "entro7":

            lista = lista.filter(
                p => Number(p.giorni) >= 4 &&
                     Number(p.giorni) <= 7
            );

            break;


        case "entro10":

            lista = lista.filter(
                p => Number(p.giorni) >= 8 &&
                     Number(p.giorni) <= 10
            );

            break;


        case "entro15":

            lista = lista.filter(
                p => Number(p.giorni) >= 11 &&
                     Number(p.giorni) <= 15
            );

            break;


        case "totale":

            // Già filtrato per reparto, se selezionato.

            break;

    }

    renderTabellaDashboard(lista);

}


// =====================================
// CLICK SULLE CARD DELLE SCADENZE
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const cardScaduti =
        document.getElementById("cardScaduti");

    if (!cardScaduti) return;


    document.getElementById("cardScaduti").onclick =
        () => apriScadenze("scaduti");


    document.getElementById("cardEntro3").onclick =
        () => apriScadenze("entro3");


    document.getElementById("cardEntro7").onclick =
        () => apriScadenze("entro7");


    document.getElementById("cardEntro10").onclick =
        () => apriScadenze("entro10");


    document.getElementById("cardEntro15").onclick =
        () => apriScadenze("entro15");


    document.getElementById("cardTotale").onclick =
        () => apriScadenze("totale");

});
   
// =====================================
// APRE PAGINA SCADENZE
// Mantenendo il reparto selezionato
// =====================================

function apriScadenze(tipo) {

    // I contatori della Dashboard filtrano sempre la lista
    // direttamente nella Dashboard.
    //
    // Se è selezionato un reparto, filtra prima per reparto
    // e poi per scadenza.
    //
    // Se non è selezionato un reparto, filtra tutta la lista.
    filtraDashboard(tipo);

}
// =====================================
// SELETTORE REPARTO DAL MENU
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const menuReparto = document.getElementById("repartoCSV");

    if (!menuReparto) return;

    menuReparto.addEventListener("change", () => {

        const reparto = menuReparto.value;

        if (!reparto) {
            deselezionaReparto();
            return;
        }

        selezionaReparto(reparto);
    });

});
