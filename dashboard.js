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
    aggiornaPannelloIntelligence();
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

function indicatoreStatoLavorazioneDashboard(p) {
    // L'offerta ha priorita visiva: se il prodotto e in offerta,
    // il pallino deve essere sempre ARANCIONE.
    const stato = p?.offerta ? "IN_OFFERTA" : (p?.stato_lavorazione || "DA_LAVORARE");

    const colori = {
        DA_LAVORARE: "#ef4444",
        IN_OFFERTA: "#f59e0b",
        LAVORATO: "#22c55e",
        NON_LAVORARE: "#64748b",
        RESO_FORNITORE: "#2563eb"
    };

    const colore = colori[stato] || colori.DA_LAVORARE;
    const titolo = {
        DA_LAVORARE: "DA LAVORARE",
        IN_OFFERTA: "IN OFFERTA",
        LAVORATO: "LAVORATO",
        NON_LAVORARE: "NON LAVORARE",
        RESO_FORNITORE: "RESO A FORNITORE"
    }[stato] || "DA LAVORARE";

    return `<span title="${titolo}" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${colore};margin-right:9px;vertical-align:middle;"></span>`;
}

function inserisciLegendaStatoLavorazione() {
    if (document.getElementById("legendaStatoLavorazione")) return;

    const legenda = document.createElement("div");
    legenda.id = "legendaStatoLavorazione";
    legenda.style.cssText = "display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center;margin:14px 0;padding:10px 14px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;";

    const stati = [
        ["DA_LAVORARE", "DA LAVORARE", "#ef4444"],
        ["IN_OFFERTA", "IN OFFERTA", "#f59e0b"],
        ["LAVORATO", "LAVORATO", "#22c55e"],
        ["NON_LAVORARE", "NON LAVORARE", "#64748b"],
        ["RESO_FORNITORE", "RESO A FORNITORE", "#2563eb"]
    ];

    stati.forEach(([, testo, colore]) => {
        const item = document.createElement("span");
        item.style.cssText = "display:inline-flex;align-items:center;gap:6px;white-space:nowrap;";
        item.innerHTML = `<span style="width:11px;height:11px;border-radius:50%;background:${colore};display:inline-block;"></span>${testo}`;
        legenda.appendChild(item);
    });

    const tabella = document.querySelector("#productTable");
    const area = tabella ? tabella.closest(".table-area") : null;
    if (area) area.insertBefore(legenda, area.querySelector("table"));
}

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
                <td>${indicatoreStatoLavorazioneDashboard(p)}${p.descrizione || ""}</td>
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
// INTELLIGENCE GDO V8
// COSA DEVO FARE OGGI
//
// Usa:
// - scadenza
// - storico acquisti/vendite
// - differenza acquisti-vendite
//
// NON usa la giacenza reale a scaffale.
// La quantità reale viene sempre verificata dall'operatore.
// =====================================

async function intelligenceCaricaMovimenti(prodotti) {
    const client = window.supabaseClient;
    const movimenti = new Map();

    if (!client || !prodotti || !prodotti.length) return movimenti;

    const normalizzaCodice = codice =>
        String(codice ?? "")
            .trim()
            .replace(/\s+/g, "")
            .replace(/\.0$/, "");

    const codici = [
        ...new Set(
            prodotti.map(p => normalizzaCodice(p.codice)).filter(Boolean)
        )
    ];

    const GIORNI_STORICO = 243;
    const SETTIMANE_STORICO = GIORNI_STORICO / 7;

    for (let i = 0; i < codici.length; i += 100) {
        const gruppo = codici.slice(i, i + 100);

        const { data, error } = await client
            .from("storico_movimenti")
            .select("codice,acquisti_pz,vendite_pz,diff_pz,periodo")
            .in("codice", gruppo);

        if (error) {
            console.error("Errore Intelligence lettura storico_movimenti:", error);
            continue;
        }

        (data || []).forEach(riga => {
            const codice = normalizzaCodice(riga.codice);
            const acquisti = Number(riga.acquisti_pz) || 0;
            const vendite = Number(riga.vendite_pz) || 0;
            const diff = Number(riga.diff_pz) || 0;

            movimenti.set(codice, {
                acquistiSettimanali: acquisti / SETTIMANE_STORICO,
                venditeSettimanali: vendite / SETTIMANE_STORICO,
                differenzaSettimanale: diff / SETTIMANE_STORICO,
                pressioneAccumulo: acquisti > 0 ? (diff / acquisti) * 100 : 0,
                periodo: riga.periodo || ""
            });
        });
    }

    return movimenti;
}

function intelligenceValutaMovimento(p, movimento) {
    const giorni = Number(p?.giorni);

    if (!Number.isFinite(giorni)) return null;

    if (giorni < 0) {
        return {
            livello: 0,
            stato: "CONTROLLO IMMEDIATO",
            colore: "#dc2626",
            azione: "Controlla subito",
            motivo: "Prodotto già scaduto."
        };
    }

    if (giorni <= 3) {
        return {
            livello: 0,
            stato: "CONTROLLO IMMEDIATO",
            colore: "#dc2626",
            azione: "Controlla subito",
            motivo: "Scadenza entro 3 giorni."
        };
    }

    if (!movimento) {
        return {
            livello: 3,
            stato: "DATI DA VERIFICARE",
            colore: "#64748b",
            azione: "Verifica storico",
            motivo: "Storico movimenti non disponibile per questa referenza."
        };
    }

    const diff = movimento.differenzaSettimanale;
    const pressione = movimento.pressioneAccumulo;

    // Accumulo storico + scadenza ravvicinata:
    // chiediamo un controllo della quantità reale.
    if (giorni <= 7 && diff > 0) {
        return {
            livello: 1,
            stato: "VERIFICARE QUANTITÀ",
            colore: "#f59e0b",
            azione: "Verifica quantità",
            motivo:
                `Lo storico mostra +${diff.toFixed(1)} unità/settimana ` +
                `di differenza tra acquisti e vendite.`
        };
    }

    // Entro 14 giorni: se gli acquisti superano le vendite,
    // anticipiamo il controllo senza dichiarare una giacenza reale.
    if (giorni <= 14 && diff > 0) {
        return {
            livello: 1,
            stato: "ANTICIPARE CONTROLLO",
            colore: "#f59e0b",
            azione: "Anticipa controllo",
            motivo:
                `Acquisti ${movimento.acquistiSettimanali.toFixed(1)}/sett. · ` +
                `vendite ${movimento.venditeSettimanali.toFixed(1)}/sett. · ` +
                `accumulo storico +${diff.toFixed(1)}/sett.`
        };
    }

    // Oltre 14 giorni: segnaliamo solo un accumulo storico significativo.
    if (giorni > 14 && diff > 0 && pressione >= 20) {
        return {
            livello: 2,
            stato: "MONITORARE",
            colore: "#64748b",
            azione: "Monitora",
            motivo:
                `La differenza storica è +${diff.toFixed(1)}/sett. ` +
                `(${pressione.toFixed(1)}% rispetto agli acquisti).`
        };
    }

    return {
        livello: 4,
        stato: "NESSUNA AZIONE URGENTE",
        colore: "#16a34a",
        azione: "Nessuna azione urgente",
        motivo: "Nessun segnale di accumulo rilevante nello storico."
    };
}

function inserisciPannelloIntelligence() {
    if (document.getElementById("pannelloIntelligence")) return;

    const tabella = document.querySelector("#productTable");
    const area = tabella ? tabella.closest(".table-area") : null;

    if (!area) return;

    const panel = document.createElement("section");
    panel.id = "pannelloIntelligence";
    panel.style.cssText =
        "margin:20px 0 10px;padding:18px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;";

    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:15px;flex-wrap:wrap;">
            <div>
                <div style="font-size:20px;font-weight:700;color:#0f172a;">
                    🧠 COSA DEVO FARE OGGI
                </div>
                <div style="font-size:13px;color:#64748b;margin-top:4px;max-width:760px;">
                    Incrocia scadenza e storico acquisti/vendite per indicare cosa controllare.
                    La giacenza reale non viene stimata: quando serve, va verificata sul posto.
                </div>
            </div>
        </div>

        <div id="intelligenceRiepilogo"
             style="display:flex;gap:10px;flex-wrap:wrap;margin-top:15px;">
        </div>

        <div id="intelligencePriorita" style="margin-top:16px;"></div>
    `;

    area.parentNode.insertBefore(panel, area.nextSibling);
    aggiornaPannelloIntelligence();
}

async function aggiornaPannelloIntelligence() {
    const riepilogo = document.getElementById("intelligenceRiepilogo");
    const prioritaEl = document.getElementById("intelligencePriorita");

    if (!riepilogo || !prioritaEl) return;

    let prodotti = Prodotti.tutti();

    if (Dashboard.repartoSelezionato) {
        prodotti = prodotti.filter(
            p => p.reparto === Dashboard.repartoSelezionato
        );
    }

    const movimenti = await intelligenceCaricaMovimenti(prodotti);

    const normalizzaCodice = codice =>
        String(codice ?? "")
            .trim()
            .replace(/\s+/g, "")
            .replace(/\.0$/, "");

    const righe = prodotti.map(p => {
        const codice = normalizzaCodice(p.codice);
        const movimento = movimenti.get(codice);
        const info = intelligenceValutaMovimento(p, movimento);
        return { p, movimento, info };
    });

    righe.sort((a, b) =>
        a.info.livello - b.info.livello ||
        Number(a.p.giorni) - Number(b.p.giorni)
    );

    const immediati = righe.filter(x => x.info.livello === 0).length;
    const anticipare = righe.filter(x => x.info.livello === 1).length;
    const monitorare = righe.filter(x => x.info.livello === 2).length;
    const datiDaVerificare = righe.filter(x => x.info.livello === 3).length;
    const nessunaAzione = righe.filter(x => x.info.livello === 4).length;

    const card = (numero, testo, bg, colore) => `
        <div style="padding:10px 14px;border-radius:10px;background:${bg};border:1px solid #e5e7eb;min-width:145px;">
            <strong style="font-size:19px;color:${colore};">${numero}</strong>
            <div style="font-size:12px;color:#475569;margin-top:2px;">${testo}</div>
        </div>
    `;

    riepilogo.innerHTML =
        card(immediati, "Controllo immediato", "#fef2f2", "#dc2626") +
        card(anticipare, "Anticipare controllo", "#fffbeb", "#d97706") +
        card(monitorare, "Monitorare", "#f8fafc", "#64748b") +
        card(datiDaVerificare, "Storico da verificare", "#f8fafc", "#475569") +
        card(nessunaAzione, "Nessuna azione urgente", "#f0fdf4", "#16a34a");

    const priorita = righe.filter(x => x.info.livello <= 2).slice(0, 12);

    if (!priorita.length) {
        prioritaEl.innerHTML = `
            <div style="padding:14px;color:#64748b;background:#f8fafc;border-radius:10px;">
                Nessuna referenza richiede un controllo prioritario con i dati disponibili.
            </div>
        `;
        return;
    }

    prioritaEl.innerHTML = `
        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:8px;">
            Priorità operative
        </div>

        <div style="
            display:grid;
            grid-template-columns:90px minmax(220px,1fr) 85px 150px 150px minmax(280px,1.4fr);
            gap:10px;
            align-items:center;
            padding:10px 12px;
            background:#f8fafc;
            border:1px solid #e5e7eb;
            border-radius:9px 9px 0 0;
            font-size:11px;
            font-weight:700;
            color:#475569;
        ">
            <div>CODICE</div>
            <div>REFERENZA</div>
            <div>GIORNI</div>
            <div>ACQUISTI / SETT.</div>
            <div>VENDITE / SETT.</div>
            <div>COSA FARE</div>
        </div>

        ${priorita.map(({p, movimento, info}) => {
            const codice = String(p.codice ?? "").trim() || "—";
            const descrizione = String(p.descrizione ?? "").trim() || "—";
            const giorni = Number(p.giorni);
            const acquisti = movimento ? movimento.acquistiSettimanali.toFixed(1) : "N/D";
            const vendite = movimento ? movimento.venditeSettimanali.toFixed(1) : "N/D";

            return `
                <div style="
                    display:grid;
                    grid-template-columns:90px minmax(220px,1fr) 85px 150px 150px minmax(280px,1.4fr);
                    gap:10px;
                    align-items:center;
                    padding:12px;
                    border-left:1px solid #e5e7eb;
                    border-right:1px solid #e5e7eb;
                    border-bottom:1px solid #e5e7eb;
                    font-size:12px;
                ">
                    <div style="font-weight:700;">${codice}</div>
                    <div style="font-weight:600;">${descrizione}</div>
                    <div style="font-weight:700;color:${info.colore};">${giorni} gg</div>
                    <div>${acquisti}</div>
                    <div>${vendite}</div>
                    <div>
                        <div style="font-weight:700;color:${info.colore};">${info.azione}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:3px;">${info.motivo}</div>
                    </div>
                </div>
            `;
        }).join("")}

        ${righe.filter(x => x.info.livello <= 2).length > 12 ? `
            <div style="padding:9px 12px;color:#64748b;font-size:11px;">
                Mostrate le prime 12 priorità.
            </div>
        ` : ""}
    `;
}

// =====================================
// DESELEZIONA REPARTO
// =====================================

function deselezionaReparto() {
    Dashboard.repartoSelezionato = null;

    console.log("NESSUN REPARTO SELEZIONATO");

    Dashboard.aggiorna();
    renderTabellaDashboard(Prodotti.tutti());
    aggiornaPannelloIntelligence();
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
    aggiornaPannelloIntelligence();

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


document.addEventListener("DOMContentLoaded", () => {
    inserisciLegendaStatoLavorazione();
    inserisciPannelloIntelligence();
});
