/* Gestione Offerte - Scadenze Smart GDO Enterprise */
(() => {
    const $ = (id) => document.getElementById(id);
    const statoAttivo = "IN_OFFERTA";
    let offerteCaricate = [];
    let prodottoInModifica = null;

    function dataLocaleISO(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function formattaData(value) {
        if (!value) return "—";
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
    }

    function formattaPrezzo(value) {
        if (value === null || value === undefined || value === "") return "—";
        const n = Number(value);
        if (!Number.isFinite(n)) return "—";
        return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[c]);
    }

    function messaggio(testo, errore = false) {
        const nodo = $("messaggioOfferte");
        if (!nodo) return;
        nodo.textContent = testo || "";
        nodo.classList.toggle("errore", !!errore);
    }

    function mostraModal() {
        $("productModal").style.display = "flex";
        $("productModal").setAttribute("aria-hidden", "false");
    }

    function chiudiModal() {
        $("productModal").style.display = "none";
        $("productModal").setAttribute("aria-hidden", "true");
        prodottoInModifica = null;
    }

    function popolaReparto(reparto) {
        const select = $("categoria");
        const value = String(reparto || "");
        if (value && !Array.from(select.options).some(o => o.value === value)) {
            select.add(new Option(value, value));
        }
        select.value = value;
    }

    function apriModifica(p, nuova = false) {
        prodottoInModifica = p;
        $("titoloModalOfferta").textContent = nuova ? "Nuova Offerta" : "Modifica Offerta";
        $("codice").value = p.codice ?? "";
        $("descrizione").value = p.descrizione ?? "";
        popolaReparto(p.reparto);
        $("prezzo").value = p.prezzo ?? "";
        $("prezzo_offerta").value = p.prezzo_offerta ?? "";
        $("offerta").checked = true;
        $("pezzi_offerta").value = p.pezzi_offerta ?? 0;
        $("data_inizio_offerta").value = p.data_inizio_offerta || (nuova ? dataLocaleISO() : "");
        $("data_fine_offerta").value = p.data_fine_offerta || "";
        mostraModal();
    }

    async function archiviaOfferteScadute() {
        const oggiISO = dataLocaleISO();
        // Comprende sia il flag offerta sia lo stato, perché in alcuni record possono non essere allineati.
        const { data: scadute, error } = await window.supabaseClient
            .from("prodotti")
            .select("*")
            .or("offerta.eq.true,stato_lavorazione.eq.IN_OFFERTA")
            .not("data_fine_offerta", "is", null)
            .lt("data_fine_offerta", oggiISO);

        if (error) throw new Error("Non riesco a verificare le offerte scadute: " + error.message);
        if (!scadute || scadute.length === 0) return;

        for (const p of scadute) {
            const inizio = p.data_inizio_offerta || "non specificata";
            const fine = p.data_fine_offerta || "non specificata";
            const intervento = `Fine offerta ${inizio} - ${fine}`;

            // La chiave codice + intervento rende l'archiviazione ripetibile senza creare doppioni.
            const { data: giaPresente, error: verificaErrore } = await window.supabaseClient
                .from("storico_scadenze")
                .select("codice")
                .eq("codice", String(p.codice ?? ""))
                .eq("intervento", intervento)
                .limit(1);

            if (verificaErrore) {
                throw new Error("Impossibile verificare lo Storico Scadenze. L'offerta scaduta è stata lasciata attiva per sicurezza: " + verificaErrore.message);
            }

            if (!giaPresente || giaPresente.length === 0) {
                const { error: insertErrore } = await window.supabaseClient
                    .from("storico_scadenze")
                    .insert([{
                        prodotto_id: String(p.id),
                        codice: String(p.codice ?? ""),
                        descrizione: p.descrizione ?? "",
                        reparto: p.reparto ?? "",
                        scadenza: p.scadenza || p.data_fine_offerta,
                        giorni: Number(p.giorni || 0),
                        stato: "offerta_scaduta",
                        intervento,
                        pezzi_offerta: Number(p.pezzi_offerta || 0)
                    }]);

                if (insertErrore) {
                    throw new Error(`Non è stato possibile registrare ${p.codice} nello Storico Scadenze. L'offerta è stata lasciata attiva: ${insertErrore.message}`);
                }
            }

            const aggiornamento = { offerta: false, pezzi_offerta: 0 };
            if (String(p.stato_lavorazione || "").toUpperCase() === statoAttivo) {
                aggiornamento.stato_lavorazione = "DA_LAVORARE";
            }
            const { error: updateErrore } = await window.supabaseClient
                .from("prodotti")
                .update(aggiornamento)
                .eq("id", p.id);

            if (updateErrore) {
                throw new Error(`L'offerta ${p.codice} è stata storicizzata, ma non è stato possibile disattivarla: ${updateErrore.message}`);
            }
        }
        messaggio(`Archiviate ${scadute.length} offerte scadute nello Storico Scadenze.`);
    }

    async function caricaOfferte() {
        const tbody = $("tabellaOfferte");
        tbody.innerHTML = '<tr><td colspan="8" class="table-message">Caricamento offerte…</td></tr>';
        messaggio("");

        try {
            await archiviaOfferteScadute();
        } catch (e) {
            console.error(e);
            messaggio(e.message || "Errore nell'archiviazione delle offerte scadute.", true);
            // Se l'archiviazione non è verificabile, non carichiamo e non tocchiamo ulteriormente i record.
        }

        const { data, error } = await window.supabaseClient
            .from("prodotti")
            .select("*")
            .or("offerta.eq.true,stato_lavorazione.eq.IN_OFFERTA")
            .order("descrizione", { ascending: true });

        if (error) {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="8" class="table-message">Errore nel caricamento delle offerte.</td></tr>';
            messaggio("Errore nel caricamento: " + error.message, true);
            return;
        }

        offerteCaricate = data || [];
        // Sincronizza il flag quando lo stato indica già IN_OFFERTA, senza modificare le date o i prezzi.
        for (const p of offerteCaricate) {
            if (p.offerta !== true && String(p.stato_lavorazione || "").toUpperCase() === statoAttivo) {
                const { error: syncError } = await window.supabaseClient
                    .from("prodotti")
                    .update({ offerta: true })
                    .eq("id", p.id);
                if (!syncError) p.offerta = true;
                else console.warn("Flag offerta non sincronizzato per", p.codice, syncError);
            }
        }
        renderOfferte();
    }

    function renderOfferte() {
        const tbody = $("tabellaOfferte");
        const q = String($("ricercaOfferta").value || "").trim().toLocaleLowerCase("it-IT");
        const filtrate = offerteCaricate.filter(p => [p.codice, p.descrizione, p.reparto]
            .some(v => String(v ?? "").toLocaleLowerCase("it-IT").includes(q)));

        if (filtrate.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="table-message">Nessuna offerta trovata.</td></tr>';
            return;
        }

        tbody.innerHTML = filtrate.map(p => `
            <tr>
                <td>${escapeHTML(p.codice)}</td>
                <td>${escapeHTML(p.descrizione)}</td>
                <td>${escapeHTML(p.reparto)}</td>
                <td class="numero">${escapeHTML(Number(p.pezzi_offerta || 0))}</td>
                <td class="prezzo-offerta">${escapeHTML(formattaPrezzo(p.prezzo_offerta))}</td>
                <td>${escapeHTML(formattaData(p.data_inizio_offerta))}</td>
                <td>${escapeHTML(formattaData(p.data_fine_offerta))}</td>
                <td class="azioni">
                    <button type="button" class="azione-modifica" data-modifica="${escapeHTML(p.id)}" aria-label="Modifica offerta ${escapeHTML(p.codice)}" title="Modifica"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button type="button" class="azione-elimina" data-elimina="${escapeHTML(p.id)}" aria-label="Rimuovi offerta ${escapeHTML(p.codice)}" title="Rimuovi"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>`).join("");

        tbody.querySelectorAll("[data-modifica]").forEach(btn => {
            btn.addEventListener("click", () => {
                const p = offerteCaricate.find(item => String(item.id) === btn.dataset.modifica);
                if (p) apriModifica(p);
            });
        });
        tbody.querySelectorAll("[data-elimina]").forEach(btn => {
            btn.addEventListener("click", () => rimuoviOfferta(btn.dataset.elimina));
        });
    }

    async function salvaOfferta() {
        if (!prodottoInModifica) return;
        const attiva = $("offerta").checked;
        const dataInizio = $("data_inizio_offerta").value || null;
        const dataFine = $("data_fine_offerta").value || null;
        const prezzoOffertaRaw = $("prezzo_offerta").value.trim();
        const prezzoOfferta = prezzoOffertaRaw === "" ? null : Number(prezzoOffertaRaw);

        if (attiva) {
            if (!dataInizio || !dataFine) {
                alert("Inserisci sia la data di inizio sia la data di fine dell'offerta.");
                return;
            }
            if (dataFine < dataInizio) {
                alert("La data di fine non può essere precedente alla data di inizio.");
                return;
            }
            if (prezzoOfferta === null || !Number.isFinite(prezzoOfferta) || prezzoOfferta < 0) {
                alert("Inserisci un Prezzo Offerta valido.");
                return;
            }
        }
        if (prezzoOfferta !== null && (!Number.isFinite(prezzoOfferta) || prezzoOfferta < 0)) {
            alert("Il Prezzo Offerta deve essere un numero valido e non negativo.");
            return;
        }

        const update = {
            prezzo: $("prezzo").value === "" ? null : Number($("prezzo").value),
            prezzo_offerta: prezzoOfferta,
            offerta: attiva,
            pezzi_offerta: attiva ? (parseInt($("pezzi_offerta").value, 10) || 0) : 0,
            data_inizio_offerta: dataInizio,
            data_fine_offerta: dataFine,
            stato_lavorazione: attiva ? statoAttivo : (String(prodottoInModifica.stato_lavorazione || "").toUpperCase() === statoAttivo ? "DA_LAVORARE" : (prodottoInModifica.stato_lavorazione || "DA_LAVORARE"))
        };

        const saveBtn = $("saveOfferta");
        saveBtn.disabled = true;
        saveBtn.textContent = "Salvataggio…";
        const { error } = await window.supabaseClient
            .from("prodotti")
            .update(update)
            .eq("id", prodottoInModifica.id);
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 Salva";

        if (error) {
            console.error(error);
            if (/prezzo_offerta/i.test(error.message || "")) {
                alert("Manca la colonna prezzo_offerta in Supabase. Esegui prima il file SQL incluso nel pacchetto e poi riprova.");
            } else {
                alert("Errore durante il salvataggio: " + error.message);
            }
            return;
        }
        chiudiModal();
        await caricaOfferte();
        messaggio("Offerta salvata correttamente.");
    }

    async function rimuoviOfferta(id) {
        const p = offerteCaricate.find(item => String(item.id) === String(id));
        if (!p || !confirm(`Rimuovere ${p.codice} dall'elenco delle offerte?`)) return;
        const update = { offerta: false, pezzi_offerta: 0 };
        if (String(p.stato_lavorazione || "").toUpperCase() === statoAttivo) update.stato_lavorazione = "DA_LAVORARE";
        const { error } = await window.supabaseClient.from("prodotti").update(update).eq("id", p.id);
        if (error) {
            alert("Errore durante la rimozione dell'offerta: " + error.message);
            return;
        }
        await caricaOfferte();
        messaggio("Offerta rimossa dall'elenco attivo.");
    }

    async function nuovaOfferta() {
        const codice = prompt("Inserisci il codice della referenza da mettere in offerta:");
        if (codice === null || !codice.trim()) return;
        const { data, error } = await window.supabaseClient
            .from("prodotti")
            .select("*")
            .eq("codice", codice.trim())
            .limit(1);
        if (error) {
            alert("Errore nella ricerca della referenza: " + error.message);
            return;
        }
        const p = data && data[0];
        if (!p) {
            alert(`La referenza ${codice.trim()} non è stata trovata. Prima crea il prodotto dalla Dashboard.`);
            return;
        }
        apriModifica(p, true);
    }

    function esportaExcel() {
        const q = String($("ricercaOfferta").value || "").trim().toLocaleLowerCase("it-IT");
        const lista = offerteCaricate.filter(p => [p.codice, p.descrizione, p.reparto]
            .some(v => String(v ?? "").toLocaleLowerCase("it-IT").includes(q)));
        if (!lista.length) {
            alert("Non ci sono offerte da esportare con la ricerca corrente.");
            return;
        }
        if (!window.XLSX) {
            alert("La libreria Excel non è stata caricata. Ricarica la pagina e riprova.");
            return;
        }
        const righe = lista.map(p => ({
            "Codice": p.codice,
            "Descrizione": p.descrizione,
            "Reparto": p.reparto,
            "Pezzi": Number(p.pezzi_offerta || 0),
            "Prezzo Offerta": p.prezzo_offerta ?? "",
            "Data Inizio": p.data_inizio_offerta || "",
            "Data Fine": p.data_fine_offerta || ""
        }));
        const foglio = XLSX.utils.json_to_sheet(righe);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, foglio, "Offerte");
        XLSX.writeFile(libro, "Offerte.xlsx");
    }

    document.addEventListener("DOMContentLoaded", () => {
        $("ricercaOfferta").addEventListener("input", renderOfferte);
        $("nuovaOfferta").addEventListener("click", nuovaOfferta);
        $("stampaOfferte").addEventListener("click", () => window.print());
        $("excelOfferte").addEventListener("click", esportaExcel);
        $("saveOfferta").addEventListener("click", salvaOfferta);
        $("closeModal").addEventListener("click", chiudiModal);
        $("productModal").addEventListener("click", (e) => {
            if (e.target === $("productModal")) chiudiModal();
        });
        caricaOfferte();
    });
})();
