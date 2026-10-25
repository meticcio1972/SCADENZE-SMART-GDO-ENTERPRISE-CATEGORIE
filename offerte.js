"use strict";

(() => {
    const $ = (id) => document.getElementById(id);
    let offerteCaricate = [];
    let idProdottoInModifica = null;

    const oggiISO = () => {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        return formattaInputData(oggi);
    };

    function formattaInputData(data) {
        const anno = data.getFullYear();
        const mese = String(data.getMonth() + 1).padStart(2, "0");
        const giorno = String(data.getDate()).padStart(2, "0");
        return `${anno}-${mese}-${giorno}`;
    }

    function aggiungiGiorni(dataISO, quanti) {
        const parti = String(dataISO || oggiISO()).slice(0, 10).split("-").map(Number);
        const data = new Date(parti[0], parti[1] - 1, parti[2]);
        data.setDate(data.getDate() + quanti);
        return formattaInputData(data);
    }

    function dataPerSchermo(valore) {
        if (!valore) return "â€”";
        const testo = String(valore).slice(0, 10);
        const parti = testo.split("-");
        if (parti.length !== 3) return testo;
        return `${parti[2]}/${parti[1]}/${parti[0]}`;
    }

    function escapeHtml(valore) {
        return String(valore ?? "").replace(/[&<>"']/g, (carattere) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[carattere]);
    }

    function prodottoInOfferta(prodotto) {
        return prodotto?.offerta === true || String(prodotto?.stato_lavorazione || "").toUpperCase() === "IN_OFFERTA";
    }

    function renderTabella(lista) {
        const tbody = $("tabellaOfferte");
        if (!tbody) return;

        if (!lista.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="nessuna-offerta">Nessuna offerta trovata. Puoi aggiungerne una con â€œNuova Offertaâ€.</td></tr>';
            return;
        }

        tbody.innerHTML = lista.map((p) => {
            const scaduta = p.data_fine_offerta && String(p.data_fine_offerta).slice(0, 10) < oggiISO();
            return `
                <tr class="${scaduta ? "offerta-scaduta" : ""}">
                    <td>${escapeHtml(p.codice)}</td>
                    <td class="descrizione-prodotto">${escapeHtml(p.descrizione)}</td>
                    <td>${escapeHtml(p.reparto)}</td>
                    <td class="numero">${escapeHtml(p.pezzi_offerta ?? 0)}</td>
                    <td class="numero">${p.prezzo === null || p.prezzo === undefined || p.prezzo === "" ? "â€”" : escapeHtml(p.prezzo)}</td>
                    <td class="data-offerta">${dataPerSchermo(p.data_inizio_offerta)}</td>
                    <td class="data-offerta">${dataPerSchermo(p.data_fine_offerta)}</td>
                    <td class="azioni-tabella">
                        <button type="button" class="azione-modifica" data-azione="modifica" data-id="${escapeHtml(p.id)}" aria-label="Modifica offerta" title="Modifica offerta"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" class="azione-elimina" data-azione="elimina" data-id="${escapeHtml(p.id)}" aria-label="Rimuovi offerta" title="Rimuovi offerta"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                </tr>`;
        }).join("");
    }

    async function caricaOfferte() {
        const tbody = $("tabellaOfferte");
        if (!window.supabaseClient) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="nessuna-offerta">Connessione al database non disponibile. Ricarica la pagina.</td></tr>';
            console.error("supabaseClient non disponibile");
            return;
        }

        // Mostra tutte le referenze marcate come offerta, recuperando anche
        // quelle il cui flag Ã¨ falso ma lo stato Ã¨ rimasto IN_OFFERTA.
        // La pagina non modifica piÃ¹ il database solo perchÃ© viene aperta.
        const { data, error } = await window.supabaseClient
            .from("prodotti")
            .select("*")
            .or("offerta.eq.true,stato_lavorazione.eq.IN_OFFERTA")
            .order("descrizione", { ascending: true });

        if (error) {
            console.error("Errore caricamento offerte:", error);
            if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="nessuna-offerta">Errore nel caricamento delle offerte. Controlla la connessione e riprova.</td></tr>';
            return;
        }

        offerteCaricate = Array.isArray(data) ? data : [];
        window.offerteExcel = offerteCaricate;
        applicaRicerca();
    }

    function applicaRicerca() {
        const termine = String($("ricercaOfferta")?.value || "").trim().toLocaleLowerCase("it");
        const filtrate = !termine ? offerteCaricate : offerteCaricate.filter((p) =>
            [p.codice, p.descrizione, p.reparto].some((v) => String(v ?? "").toLocaleLowerCase("it").includes(termine))
        );
        renderTabella(filtrate);
    }

    function compilaModale(prodotto) {
        idProdottoInModifica = prodotto.id;
        $("codice").value = prodotto.codice ?? "";
        $("descrizione").value = prodotto.descrizione ?? "";
        $("categoria").value = prodotto.reparto ?? "";
        $("prezzo").value = prodotto.prezzo ?? "";
        $("offerta").checked = true;
        $("pezzi_offerta").value = Number(prodotto.pezzi_offerta || 0);

        // Se le date mancano, proponi un periodo iniziale di 7 giorni.
        // La modifica viene registrata soltanto quando l'utente preme Salva.
        const inizio = prodotto.data_inizio_offerta || oggiISO();
        $("data_inizio_offerta").value = String(inizio).slice(0, 10);
        $("data_fine_offerta").value = String(prodotto.data_fine_offerta || aggiungiGiorni(inizio, 7)).slice(0, 10);
        $("productModal").style.display = "flex";
    }

    function chiudiModale() {
        $("productModal").style.display = "none";
        idProdottoInModifica = null;
    }

    async function nuovaOfferta() {
        const codice = window.prompt("Inserisci il codice della referenza da mettere in offerta:");
        if (codice === null || !codice.trim()) return;

        const { data, error } = await window.supabaseClient
            .from("prodotti")
            .select("*")
            .eq("codice", codice.trim())
            .limit(1);

        if (error) {
            console.error("Errore ricerca referenza:", error);
            alert("Non riesco a cercare la referenza. Riprova.");
            return;
        }
        if (!data || !data.length) {
            alert(`La referenza ${codice.trim()} non Ã¨ stata trovata nei prodotti.`);
            return;
        }
        compilaModale(data[0]);
    }

    async function salvaOfferta() {
        if (idProdottoInModifica === null || idProdottoInModifica === undefined) {
            alert("Seleziona prima una referenza.");
            return;
        }

        const attiva = $("offerta").checked;
        let inizio = $("data_inizio_offerta").value;
        let fine = $("data_fine_offerta").value;

        if (attiva) {
            if (!inizio) inizio = oggiISO();
            if (!fine) fine = aggiungiGiorni(inizio, 7);
            if (fine < inizio) {
                alert("La data fine offerta non puÃ² precedere la data inizio.");
                return;
            }
        }

        const prezzo = $("prezzo").value;
        const aggiornamento = {
            prezzo: prezzo === "" ? null : prezzo,
            offerta: attiva,
            pezzi_offerta: attiva ? (parseInt($("pezzi_offerta").value, 10) || 0) : 0,
            data_inizio_offerta: attiva ? inizio : (inizio || null),
            data_fine_offerta: attiva ? fine : (fine || null),
            stato_lavorazione: attiva ? "IN_OFFERTA" : "DA_LAVORARE"
        };

        const { error } = await window.supabaseClient
            .from("prodotti")
            .update(aggiornamento)
            .eq("id", idProdottoInModifica);

        if (error) {
            console.error("Errore salvataggio offerta:", error);
            alert("Errore durante il salvataggio dell'offerta. Le modifiche non sono state confermate.");
            return;
        }

        chiudiModale();
        await caricaOfferte();
    }

    async function eliminaOfferta(id) {
        const prodotto = offerteCaricate.find((p) => String(p.id) === String(id));
        if (!prodotto) return;
        if (!window.confirm(`Rimuovere la referenza ${prodotto.codice} dall'elenco offerte?`)) return;

        const { error } = await window.supabaseClient
            .from("prodotti")
            .update({
                offerta: false,
                pezzi_offerta: 0,
                stato_lavorazione: "DA_LAVORARE"
            })
            .eq("id", id);

        if (error) {
            console.error("Errore rimozione offerta:", error);
            alert("Errore durante la rimozione dell'offerta.");
            return;
        }
        await caricaOfferte();
    }

    function esportaExcel() {
        if (!offerteCaricate.length) {
            alert("Non ci sono offerte da esportare.");
            return;
        }
        if (!window.XLSX) {
            alert("La funzione Excel non Ã¨ disponibile. Ricarica la pagina e riprova.");
            return;
        }
        const righe = offerteCaricate.map((p) => ({
            "Codice": p.codice,
            "Descrizione": p.descrizione,
            "Reparto": p.reparto,
            "Pezzi": p.pezzi_offerta ?? 0,
            "Prezzo": p.prezzo ?? "",
            "Data Inizio": dataPerSchermo(p.data_inizio_offerta),
            "Data Fine": dataPerSchermo(p.data_fine_offerta)
        }));
        const foglio = window.XLSX.utils.json_to_sheet(righe);
        foglio["!cols"] = [{ wch: 14 }, { wch: 36 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 15 }, { wch: 15 }];
        const libro = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(libro, foglio, "Offerte");
        window.XLSX.writeFile(libro, "Offerte.xlsx");
    }

    document.addEventListener("DOMContentLoaded", () => {
        $("ricercaOfferta")?.addEventListener("input", applicaRicerca);
        $("nuovaOfferta")?.addEventListener("click", nuovaOfferta);
        $("stampaOfferte")?.addEventListener("click", () => window.print());
        $("excelOfferte")?.addEventListener("click", esportaExcel);
        $("closeModal")?.addEventListener("click", chiudiModale);
        $("saveOfferta")?.addEventListener("click", salvaOfferta);
        $("offerta")?.addEventListener("change", () => {
            if ($("offerta").checked) {
                if (!$('data_inizio_offerta').value) $('data_inizio_offerta').value = oggiISO();
                if (!$('data_fine_offerta').value) $('data_fine_offerta').value = aggiungiGiorni($('data_inizio_offerta').value, 7);
            }
        });
        $("tabellaOfferte")?.addEventListener("click", (evento) => {
            const pulsante = evento.target.closest("button[data-azione]");
            if (!pulsante) return;
            const id = pulsante.dataset.id;
            if (pulsante.dataset.azione === "modifica") {
                const prodotto = offerteCaricate.find((p) => String(p.id) === String(id));
                if (prodotto) compilaModale(prodotto);
            } else if (pulsante.dataset.azione === "elimina") {
                eliminaOfferta(id);
            }
        });
        caricaOfferte();
    });
})();
