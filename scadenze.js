'use strict';

let prodottiPagina = [];
let listaVisibile = [];
let storicoVenditeCache = new Map();

/*
======================================================
VENDITE MEDIE SETTIMANALI
======================================================

Lo storico vendite disponibile è un totale del periodo:
01/01/2026 - 31/08/2026 = 243 giorni.

Formula:
totale venduto nel periodo / 243 * 7

La media viene calcolata localmente, senza AI.
Se una referenza non ha storico: N/D.
*/

const PERIODO_STORICO_VENDITE = {
    inizio: new Date(2026, 0, 1),
    fine: new Date(2026, 7, 31),
    giorni: 243
};

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
        oggi.setHours(0, 0, 0, 0);

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
                listaVisibile = listaVisibile.filter(
                    p => p.giorni >= 0 && p.giorni <= 3
                );
                break;

            case "entro7":
                titolo("Entro 7 giorni");
                listaVisibile = listaVisibile.filter(
                    p => p.giorni >= 4 && p.giorni <= 7
                );
                break;

            case "entro10":
                titolo("Entro 10 giorni");
                listaVisibile = listaVisibile.filter(
                    p => p.giorni >= 8 && p.giorni <= 10
                );
                break;

            case "entro15":
                titolo("Entro 15 giorni");
                listaVisibile = listaVisibile.filter(
                    p => p.giorni >= 11 && p.giorni <= 15
                );
                break;

            default:
                titolo(reparto ? String(reparto) : "Tutte le Referenze");
        }

        disegnaTabella(listaVisibile, tipo);

        const ricerca = document.getElementById("ricerca");

        if (ricerca) {
            ricerca.addEventListener("input", () => {
                const testo = ricerca.value.toLowerCase().trim();

                const filtrati = listaVisibile.filter(p =>
                    String(p.codice || "").toLowerCase().includes(testo) ||
                    String(p.descrizione || "").toLowerCase().includes(testo) ||
                    String(p.reparto || "").toLowerCase().includes(testo)
                );

                disegnaTabella(filtrati, tipo);
            });
        }

        const bottone = document.getElementById("btnVenditeMedie");

        if (bottone) {
            bottone.addEventListener("click", () => {
                aggiornaVenditeMedie(listaVisibile);
            });
        }

        /*
         * CALCOLO AUTOMATICO
         * Appena si apre la lista, vengono calcolate le vendite medie
         * soltanto per le referenze presenti nella lista visualizzata.
         */
        await aggiornaVenditeMedie(listaVisibile);

    } catch (errore) {
        console.error("Errore caricamento scadenze:", errore);

        const tbody = document.getElementById("tabellaScadenze");

        if (tbody) {
            tbody.innerHTML =
                `<tr><td colspan="8">Errore caricamento: ${escapeHtml(errore.message)}</td></tr>`;
        }
    }
}

function titolo(testo) {
    const el = document.getElementById("titoloPagina");

    if (el) {
        el.textContent = String(testo ?? "");
    }
}

function calcolaGiorni(valore, oggi) {
    if (!valore) return "";

    const s = String(valore).trim();
    let d = null;

    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (m) {
        d = new Date(
            Number(m[1]),
            Number(m[2]) - 1,
            Number(m[3])
        );
    } else {
        m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);

        if (m) {
            d = new Date(
                Number(m[3]),
                Number(m[2]) - 1,
                Number(m[1])
            );
        } else {
            d = new Date(s);
        }
    }

    if (!d || Number.isNaN(d.getTime())) return "";

    d.setHours(0, 0, 0, 0);

    return Math.ceil((d - oggi) / 86400000);
}

/*
 * Normalizzazione del codice usata sia per i prodotti
 * sia per lo storico.
 *
 * Gestisce:
 * - spazi accidentali
 * - .0 derivato da importazioni numeriche
 * - zeri iniziali persi quando il codice è stato trattato come numero
 */
function normalizzaCodice(codice) {
    let valore = String(codice ?? "").trim();

    if (!valore) return "";

    valore = valore.replace(/\s+/g, "");

    if (/^\d+\.0+$/.test(valore)) {
        valore = valore.replace(/\.0+$/, "");
    }

    if (/^\d+$/.test(valore)) {
        valore = valore.replace(/^0+(?=\d)/, "");
    }

    return valore;
}

function disegnaTabella(lista, tipo) {
    const tbody = document.getElementById("tabellaScadenze");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML =
            `<tr><td colspan="8">Nessuna referenza trovata.</td></tr>`;
        return;
    }

    lista.forEach(p => {
        const codice = normalizzaCodice(p.codice);
        const media = storicoVenditeCache.get(codice);

        let mediaTesto = "Calcolo...";

        if (media === null) {
            mediaTesto = "N/D";
        } else if (typeof media === "number") {
            mediaTesto = `${media.toFixed(1)} pz/settimana`;
        }

        const quantita =
            p.quantita === null ||
            p.quantita === undefined ||
            String(p.quantita).trim() === ""
                ? "-"
                : p.quantita;

        const azioni =
            ["entro3", "entro7", "entro10", "entro15"].includes(tipo)
                ? `<button class="btn-offerta"
                           onclick="mettiInOfferta(${Number(p.id)})"
                           title="Metti in offerta">
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
                    <button class="btn-edit"
                            onclick="modificaProdotto(${Number(p.id)})"
                            title="Modifica">
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
        if (stato) {
            stato.textContent = "Nessuna referenza nella lista.";
        }
        return;
    }

    const codiciOriginali = [
        ...new Set(
            lista
                .map(p => String(p.codice ?? "").trim())
                .filter(Boolean)
        )
    ];

    const codiciNormalizzati = [
        ...new Set(
            codiciOriginali
                .map(normalizzaCodice)
                .filter(Boolean)
        )
    ];

    if (bottone) bottone.disabled = true;

    if (stato) {
        stato.textContent =
            `Calcolo vendite medie: 0 / ${codiciNormalizzati.length} referenze...`;
    }

    try {
        storicoVenditeCache = new Map();

        /*
         * Cerchiamo SOLO i codici presenti nella lista corrente.
         * Le richieste sono divise in blocchi per non superare
         * i limiti della query Supabase.
         *
         * Per aumentare la compatibilità, cerchiamo sia il codice
         * originale sia la versione normalizzata.
         */
        const valoriQuery = [
            ...new Set([
                ...codiciOriginali,
                ...codiciNormalizzati
            ])
        ];

        const righe = [];
        const batch = 100;

        for (let i = 0; i < valoriQuery.length; i += batch) {
            const gruppo = valoriQuery.slice(i, i + batch);

            const { data, error } = await window.supabaseClient
                .from("storico_vendite")
                .select("codice,descrizione,quantita,periodo")
                .in("codice", gruppo);

            if (error) {
                throw new Error(error.message);
            }

            righe.push(...(data || []));

            if (stato) {
                stato.textContent =
                    `Calcolo vendite medie: ${Math.min(
                        i + batch,
                        valoriQuery.length
                    )} / ${valoriQuery.length} codici verificati...`;
            }
        }

        /*
         * Somma tutte le righe storiche appartenenti allo stesso codice.
         * Se ci sono duplicati nello storico, vengono quindi sommati.
         */
        const venditePerCodice = new Map();

        for (const riga of righe) {
            const codice = normalizzaCodice(riga.codice);

            if (!codice) continue;

            const quantita = Number(riga.quantita);

            if (Number.isNaN(quantita)) continue;

            venditePerCodice.set(
                codice,
                (venditePerCodice.get(codice) || 0) + quantita
            );
        }

        /*
         * Costruiamo la media per ogni referenza della lista.
         *
         * Formula:
         * totale storico / 243 giorni * 7
         */
        for (const codice of codiciNormalizzati) {
            if (!venditePerCodice.has(codice)) {
                storicoVenditeCache.set(codice, null);
                continue;
            }

            const totale = venditePerCodice.get(codice) || 0;

            const mediaSettimanale =
                (totale / PERIODO_STORICO_VENDITE.giorni) * 7;

            storicoVenditeCache.set(
                codice,
                Math.round(mediaSettimanale * 10) / 10
            );
        }

        disegnaTabella(
            lista,
            new URLSearchParams(window.location.search).get("tipo") || "totale"
        );

        const conDati = codiciNormalizzati.filter(
            codice => storicoVenditeCache.get(codice) !== null
        ).length;

        const senzaDati =
            codiciNormalizzati.length - conDati;

        if (stato) {
            stato.textContent =
                `${conDati} referenze con storico · ${senzaDati} N/D · ` +
                `periodo 01/01/2026 - 31/08/2026 (243 giorni).`;
        }

        console.log("VENDITE MEDIE SETTIMANALI");
        console.log("Referenze lista:", codiciNormalizzati.length);
        console.log("Con storico:", conDati);
        console.log("Senza storico:", senzaDati);
        console.log("Periodo:", "01/01/2026 - 31/08/2026");
        console.log("Giorni:", 243);

    } catch (errore) {
        console.error("Errore vendite medie:", errore);

        if (stato) {
            stato.textContent =
                "Errore vendite medie: " + errore.message;
        }
    } finally {
        if (bottone) bottone.disabled = false;
    }
}

function escapeHtml(valore) {
    return String(valore ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/*
 * Manteniamo i pulsanti della pagina compatibili con il resto
 * dell'applicazione.
 */
window.modificaProdotto =
    window.modificaProdotto ||
    function(id) {
        alert("Funzione modifica prodotto non disponibile in questa pagina.");
    };

window.mettiInOfferta =
    window.mettiInOfferta ||
    function(id) {
        alert("Funzione offerta non disponibile in questa pagina.");
    };
