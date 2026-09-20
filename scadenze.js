use strict';

let prodottiPagina = [];
let listaVisibile = [];
let storicoVenditeCache = new Map();
let periodoStoricoVendite = null;

document.addEventListener("DOMContentLoaded", avvia);

async function avvia() {
    try {
        const params = new URLSearchParams(window.location.search);
        const tipo = params.get("tipo") || "totale";
        const reparto = params.get("reparto");

        const { data, error } = await window.supabaseClient
            .from("prodotti")
            .select("*")
            .order("id", { ascending: true });

        if (error) throw new Error(error.message);

        const oggi = new Date();
        oggi.setHours(0,0,0,0);

        prodottiPagina = (data || []).map(p => ({
            ...p,
            giorni: calcolaGiorni(p.scadenza, oggi)
        }));

        if (typeof Prodotti !== "undefined" && Prodotti.carica) {
            Prodotti.carica(prodottiPagina);
        }

        listaVisibile = prodottiPagina.slice();

        if (reparto) {
            listaVisibile = listaVisibile.filter(p =>
                String(p.reparto || "").trim() === String(reparto).trim()
            );
        }

        switch (tipo) {
            case "scaduti":
                titolo("Prodotti Scaduti");
                listaVisibile = listaVisibile.filter(p => p.giorni < 0);
                break;
            case "entro3":
                titolo("Entro 3 giorni");
                listaVisibile = listaVisibile.filter(p => p.giorni >= 0 && p.giorni <= 3);
                break;
            case "entro7":
                titolo("Entro 7 giorni");
                listaVisibile = listaVisibile.filter(p => p.giorni >= 4 && p.giorni <= 7);
                break;
            case "entro10":
                titolo("Entro 10 giorni");
                listaVisibile = listaVisibile.filter(p => p.giorni >= 8 && p.giorni <= 10);
                break;
            case "entro15":
                titolo("Entro 15 giorni");
                listaVisibile = listaVisibile.filter(p => p.giorni >= 11 && p.giorni <= 15);
                break;
            default:
                titolo(reparto ? String(reparto) : "Tutte le Referenze");
        }

        disegnaTabella(listaVisibile, tipo);

        const ricerca = document.getElementById("ricerca");
        ricerca.addEventListener("input", () => {
            const testo = ricerca.value.toLowerCase().trim();

            const filtrati = listaVisibile.filter(p =>
                String(p.codice || "").toLowerCase().includes(testo) ||
                String(p.descrizione || "").toLowerCase().includes(testo) ||
                String(p.reparto || "").toLowerCase().includes(testo)
            );

            disegnaTabella(filtrati, tipo);
        });

        document.getElementById("btnVenditeMedie").addEventListener("click", () => {
            aggiornaVenditeMedie(listaVisibile);
        });

    } catch (errore) {
        console.error("Errore caricamento scadenze:", errore);
        document.getElementById("tabellaScadenze").innerHTML =
            `<tr><td colspan="8">Errore caricamento: ${escapeHtml(errore.message)}</td></tr>`;
    }
}

function titolo(testo) {
    const el = document.getElementById("titoloPagina");
    if (el) el.textContent = textoSeguro(testo);
}

function textoSeguro(v) {
    return String(v ?? "");
}

function calcolaGiorni(valore, oggi) {
    if (!valore) return "";

    const s = String(valore).trim();
    let d = null;
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (m) {
        d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
    } else {
        m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
        if (m) {
            d = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
        } else {
            d = new Date(s);
        }
    }

    if (!d || Number.isNaN(d.getTime())) return "";
    d.setHours(0,0,0,0);

    return Math.ceil((d - oggi) / 86400000);
}

function normalizzaCodice(codice) {
    return String(codice ?? "").trim();
}

function disegnaTabella(lista, tipo) {
    const tbody = document.getElementById("tabellaScadenze");
    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="8">Nessuna referenza trovata.</td></tr>`;
        return;
    }

    lista.forEach(p => {
        const codice = normalizzaCodice(p.codice);
        const media = storicoVenditeCache.get(codice);

        let mediaTesto = "Premi Vendite medie";
        if (media === null) mediaTesto = "N/D";
        if (typeof media === "number") mediaTesto = `${media.toFixed(1)} pz/settimana`;

        const quantita =
            p.quantita === null ||
            p.quantita === undefined ||
            String(p.quantita).trim() === ""
                ? "-"
                : p.quantita;

        const azioni = ["entro3","entro7","entro10","entro15"].includes(tipo)
            ? `<button class="btn-offerta" onclick="mettiInOfferta(${Number(p.id)})" title="Metti in offerta">
                   <i class="fa-solid fa-tag"></i>
               </button>`
            : "";

        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(codice)}</td>
                <td>${escapeHtml(p.descrizione)}</td>
                <td>${escapeHtml(p.reparto)}</td>
                <td>${escapeHtml(p.scadenza)}</td>
                <td>${escapeHtml(p.giorni)}</td>
                <td>${escapeHtml(quantita)}</td>
                <td class="media-settimanale">${escapeHtml(mediaTesto)}</td>
                <td>
                    ${azioni}
                    <button class="btn-edit" onclick="modificaProdotto(${Number(p.id)})" title="Modifica">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

async function aggiornaVenditeMedie(lista) {
    const bottone = document.getElementById("btnVenditeMedie");
    const stato = document.getElementById("statoVenditeMedie");

    if (!lista.length) {
        stato.textContent = "Nessuna referenza nella lista.";
        return;
    }

    const codici = [...new Set(
        lista.map(p => normalizzaCodice(p.codice)).filter(Boolean)
    )];

    bottone.disabled = true;
    stato.textContent = "Calcolo vendite medie...";

    try {
        storicoVenditeCache = new Map();
        periodoStoricoVendite = null;

        const righe = [];
        const batch = 100;

        for (let i = 0; i < codici.length; i += batch) {
            const gruppo = codici.slice(i, i + batch);

            const { data, error } = await window.supabaseClient
                .from("storico_vendite")
                .select("codice,descrizione,quantita,periodo")
                .in("codice", gruppo);

            if (error) throw new Error(error.message);
            righe.push(...(data || []));
        }

        const venditePerCodice = new Map();

        for (const riga of righe) {
            const codice = normalizzaCodice(riga.codice);
            if (!codice) continue;

            const quantita = Number(riga.quantita);
            if (!Number.isNaN(quantita)) {
                venditePerCodice.set(
                    codice,
                    (venditePerCodice.get(codice) || 0) + quantita
                );
            }

            const intervallo = estraiIntervalloPeriodo(riga.periodo);
            aggiornaPeriodoGlobale(intervallo);
        }

        const giorniPeriodo = calcolaGiorniPeriodo(periodoStoricoVendite);

        if (!giorniPeriodo) {
            throw new Error("Non riesco a determinare il periodo dello storico vendite.");
        }

        for (const codice of codici) {
            if (!venditePerCodice.has(codice)) {
                storicoVenditeCache.set(codice, null);
                continue;
            }

            const totale = venditePerCodice.get(codice) || 0;
            const mediaSettimanale = (totale / giorniPeriodo) * 7;

            storicoVenditeCache.set(
                codice,
                Math.round(mediaSettimanale * 10) / 10
            );
        }

        const tipo = new URLSearchParams(window.location.search).get("tipo") || "totale";
        disegnaTabella(lista, tipo);

        const conDati = [...storicoVenditeCache.values()]
            .filter(v => v !== null).length;

        const periodoTesto = periodoStoricoVendite
            ? `${formattaData(periodoStoricoVendite.inizio)} - ${formattaData(periodoStoricoVendite.fine)}`
            : "";

        stato.textContent =
            `${conDati} referenze aggiornate. Periodo storico: ${periodoTesto} (${giorniPeriodo} giorni).`;

    } catch (errore) {
        console.error("Errore vendite medie:", errore);
        stato.textContent = "Errore: " + errore.message;
    } finally {
        bottone.disabled = false;
    }
}

function estraiIntervalloPeriodo(valore) {
    if (!valore) return null;

    const s = String(valore);

    const iso = [...s.matchAll(/(\d{4}-\d{1,2}-\d{1,2})/g)]
        .map(m => parseDataStorico(m[1]))
        .filter(Boolean);

    if (iso.length >= 2) {
        return { inizio: iso[0], fine: iso[1] };
    }

    const it = [...s.matchAll(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/g)]
        .map(m => parseDataStorico(m[1]))
        .filter(Boolean);

    if (it.length >= 2) {
        return { inizio: it[0], fine: it[1] };
    }

    return null;
}

function parseDataStorico(valore) {
    if (!valore) return null;

    const s = String(valore).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (m) {
        const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
        if (!Number.isNaN(d.getTime())) return d;
    }

    m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);

    if (m) {
        const d = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
        if (!Number.isNaN(d.getTime())) return d;
    }

    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function aggiornaPeriodoGlobale(periodo) {
    if (!periodo) return;

    if (!periodoStoricoVendite) {
        periodoStoricoVendite = {
            inizio: new Date(periodo.inizio),
            fine: new Date(periodo.fine)
        };
        return;
    }

    if (periodo.inizio < periodoStoricoVendite.inizio) {
        periodoStoricoVendite.inizio = new Date(periodo.inizio);
    }

    if (periodo.fine > periodoStoricoVendite.fine) {
        periodoStoricoVendite.fine = new Date(periodo.fine);
    }
}

function calcolaGiorniPeriodo(periodo) {
    if (!periodo?.inizio || !periodo?.fine) return null;

    const inizio = new Date(periodo.inizio);
    const fine = new Date(periodo.fine);

    inizio.setHours(0,0,0,0);
    fine.setHours(0,0,0,0);

    const giorni = Math.floor((fine - inizio) / 86400000) + 1;
    return giorni > 0 ? giorni : null;
}

function formattaData(d) {
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function escapeHtml(valore) {
    return String(valore ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

/*
 * Queste funzioni possono essere gia presenti in app.js/dashboard.js.
 * Se non esistono, i pulsanti di modifica/offerta restano semplicemente senza azione.
 */
window.modificaProdotto = window.modificaProdotto || function(id) {
    alert("Funzione modifica prodotto non disponibile in questa pagina.");
};

window.mettiInOfferta = window.mettiInOfferta || function(id) {
    alert("Funzione offerta non disponibile in questa pagina.");
};
