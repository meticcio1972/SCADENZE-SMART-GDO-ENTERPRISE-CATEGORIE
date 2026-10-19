"use strict";

/*
 * Registro ritiri — Scadenze Smart GDO Enterprise
 * Nuovo modulo separato: non modifica la tabella prodotti né lo storico esistente.
 */

(() => {
    const TABLE_RITIRI = "registro_ritiri";
    const PAGE_SIZE_PRODUCTS = 1000;
    const CANDIDATES_PER_PAGE = 40;
    const STORE_STORAGE_KEY = "registro_ritiri_punto_vendita";
    const STATUS_LABELS = {
        DA_CONTROLLARE: "Da controllare",
        DA_RITIRARE: "Da ritirare",
        RITIRATO: "Ritirato"
    };

    let products = [];
    let records = [];
    let candidatesPage = 1;
    let registryTableAvailable = true;

    const $ = (id) => document.getElementById(id);
    const client = () => window.supabaseClient;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function normalized(value) {
        return String(value ?? "")
            .trim()
            .toLocaleLowerCase("it-IT")
            .replace(/\s+/g, " ");
    }

    function normalizedCode(value) {
        return String(value ?? "").trim().replace(/\s+/g, "").replace(/\.0$/, "");
    }

    function todayIso() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function calcDays(dateValue) {
        if (!dateValue) return null;
        const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        const due = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        const now = new Date();
        const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.round((due - today) / 86400000);
    }

    function fmtDate(value) {
        if (!value) return "—";
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return escapeHtml(value);
        return `${match[3]}/${match[2]}/${match[1]}`;
    }

    function setMessage(id, text = "", isError = false) {
        const el = $(id);
        if (!el) return;
        el.textContent = text;
        el.classList.toggle("error", Boolean(isError));
    }

    function currentStore() {
        return $("rr-store")?.value || "Casilina";
    }

    function getStoreDefault() {
        const possible = [
            localStorage.getItem(STORE_STORAGE_KEY),
            localStorage.getItem("scadenzeSmart_puntoVenditaSelezionato")
        ].filter(Boolean);
        return possible.find(v => ["Casilina", "Ciliegie"].includes(v)) || "Casilina";
    }

    async function loadAllProducts() {
        const all = [];
        for (let from = 0; from < 50000; from += PAGE_SIZE_PRODUCTS) {
            const to = from + PAGE_SIZE_PRODUCTS - 1;
            const { data, error } = await client()
                .from("prodotti")
                .select("id,codice,descrizione,reparto,scadenza,giorni,supermercato")
                .order("id", { ascending: true })
                .range(from, to);
            if (error) throw new Error(`Caricamento referenze: ${error.message}`);
            const batch = data || [];
            all.push(...batch);
            if (batch.length < PAGE_SIZE_PRODUCTS) break;
        }
        products = all.filter(p => p.codice != null && p.descrizione != null && p.scadenza);
        populateCategoryFilter();
        renderCandidates();
        setMessage("rr-candidate-message", `${products.length.toLocaleString("it-IT")} referenze disponibili per l'analisi. Seleziona quelle da inserire nel registro.`);
    }

    async function loadRegistry() {
        setMessage("rr-record-message", "Caricamento registro…");
        try {
            const { data, error } = await client()
                .from(TABLE_RITIRI)
                .select("*")
                .eq("punto_vendita", currentStore())
                .order("created_at", { ascending: false });
            if (error) throw error;
            records = data || [];
            registryTableAvailable = true;
            setMessage("rr-record-message", "");
            populateSupplierFilter();
            renderRegistry();
            renderCandidates();
        } catch (error) {
            registryTableAvailable = false;
            records = [];
            renderRegistry();
            renderCandidates();
            const detail = error?.message || String(error);
            const missing = /registro_ritiri|schema cache|does not exist|not find the table|42P01/i.test(detail);
            setMessage(
                "rr-record-message",
                missing
                    ? "La tabella registro_ritiri non è ancora disponibile. In Supabase → SQL Editor esegui il file registro-ritiri.sql incluso nel pacchetto, poi premi Aggiorna."
                    : `Errore caricamento registro: ${detail}`,
                true
            );
            console.error("Errore caricamento registro ritiri:", error);
        }
        updateSummary();
    }

    function populateCategoryFilter() {
        const select = $("rr-candidate-category");
        if (!select) return;
        const previous = select.value;
        const categories = [...new Set(products.map(p => String(p.reparto || "").trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "it"));
        select.innerHTML = '<option value="">Tutte le categorie</option>' +
            categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
        if (categories.includes(previous)) select.value = previous;
    }

    function supplierDefaultsByCode() {
        const mapping = new Map();
        // records arriva ordinato dal più recente; conserviamo l'ultimo fornitore registrato per codice.
        for (const record of records) {
            const code = normalizedCode(record.codice);
            const supplier = String(record.fornitore || "").trim();
            if (code && supplier && !mapping.has(code)) mapping.set(code, supplier);
        }
        return mapping;
    }

    function filteredCandidates() {
        const q = normalized($("rr-candidate-search")?.value);
        const category = $("rr-candidate-category")?.value || "";
        const horizon = $("rr-candidate-days")?.value || "15";
        return products
            .map(p => ({ ...p, _days: calcDays(p.scadenza) }))
            .filter(p => {
                if (category && String(p.reparto || "") !== category) return false;
                const haystack = normalized(`${p.codice} ${p.descrizione} ${p.reparto}`);
                if (q && !haystack.includes(q)) return false;
                if (p._days === null) return horizon === "all";
                if (horizon === "expired") return p._days < 0;
                if (horizon === "all") return true;
                const max = Number(horizon);
                if (horizon === "15") return p._days < 0 || p._days <= max;
                return p._days >= 0 && p._days <= max;
            })
            .sort((a, b) => (a._days ?? 99999) - (b._days ?? 99999));
    }

    function daysLabel(days) {
        if (days === null) return "—";
        if (days < 0) return `Scaduto da ${Math.abs(days)} gg`;
        if (days === 0) return "Scade oggi";
        return `${days} gg`;
    }

    function renderCandidates() {
        const tbody = $("rr-candidates");
        if (!tbody) return;
        const list = filteredCandidates();
        const pages = Math.max(1, Math.ceil(list.length / CANDIDATES_PER_PAGE));
        candidatesPage = Math.min(Math.max(1, candidatesPage), pages);
        const start = (candidatesPage - 1) * CANDIDATES_PER_PAGE;
        const pageRows = list.slice(start, start + CANDIDATES_PER_PAGE);
        const supplierDefaults = supplierDefaultsByCode();

        if (!pageRows.length) {
            tbody.innerHTML = '<tr><td class="rr-empty" colspan="8">Nessuna referenza corrisponde ai filtri selezionati.</td></tr>';
        } else {
            tbody.innerHTML = pageRows.map(p => {
                const id = String(p.id ?? `${p.codice}-${p.scadenza}`);
                const supplierDefault = supplierDefaults.get(normalizedCode(p.codice)) || "";
                return `<tr data-candidate-row="${escapeHtml(id)}">
                    <td>${escapeHtml(p.codice)}</td>
                    <td>${escapeHtml(p.descrizione)}</td>
                    <td>${escapeHtml(p.reparto || "—")}</td>
                    <td>${fmtDate(p.scadenza)}</td>
                    <td>${escapeHtml(daysLabel(p._days))}</td>
                    <td><input class="rr-edit" data-field="candidate-supplier" type="text" value="${escapeHtml(supplierDefault)}" placeholder="Nome fornitore" aria-label="Fornitore per ${escapeHtml(p.codice)}" required></td>
                    <td><input class="rr-edit" data-field="candidate-quantity" type="number" min="1" step="1" value="1" aria-label="Quantità per ${escapeHtml(p.codice)}" required></td>
                    <td><button class="rr-btn small" type="button" data-register-product="${escapeHtml(id)}" ${registryTableAvailable ? "" : "disabled"}><i class="fa-solid fa-plus"></i> Registra</button></td>
                </tr>`;
            }).join("");
        }
        $("rr-candidate-page-label").textContent = `Pagina ${candidatesPage} di ${pages} · ${list.length.toLocaleString("it-IT")} referenze`;
        $("rr-candidate-prev").disabled = candidatesPage <= 1;
        $("rr-candidate-next").disabled = candidatesPage >= pages;
    }

    function populateSupplierFilter() {
        const select = $("rr-supplier-filter");
        if (!select) return;
        const previous = select.value;
        const suppliers = [...new Set(records.map(r => String(r.fornitore || "").trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "it"));
        select.innerHTML = '<option value="">Tutti i fornitori</option>' +
            suppliers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
        if (suppliers.includes(previous)) select.value = previous;
    }

    function filteredRecords() {
        const q = normalized($("rr-record-search")?.value);
        const supplier = $("rr-supplier-filter")?.value || "";
        const state = $("rr-status-filter")?.value || "";
        return records.filter(r => {
            if (supplier && String(r.fornitore || "") !== supplier) return false;
            if (state && r.stato !== state) return false;
            const haystack = normalized(`${r.codice} ${r.descrizione} ${r.reparto} ${r.fornitore} ${r.note} ${r.punto_vendita}`);
            return !q || haystack.includes(q);
        });
    }

    function statusOptions(value) {
        return Object.entries(STATUS_LABELS).map(([key, label]) =>
            `<option value="${key}" ${value === key ? "selected" : ""}>${label}</option>`
        ).join("");
    }

    function renderRegistry() {
        const tbody = $("rr-records");
        if (!tbody) return;
        const list = filteredRecords();
        if (!list.length) {
            tbody.innerHTML = `<tr><td class="rr-empty" colspan="11">${registryTableAvailable ? "Nessuna registrazione per questo punto vendita e per i filtri scelti." : "Prima esegui lo script SQL indicato sopra per attivare l'archivio."}</td></tr>`;
        } else {
            tbody.innerHTML = list.map(r => `
                <tr data-record-row="${escapeHtml(r.id)}">
                    <td>${fmtDate(String(r.created_at || "").slice(0, 10))}</td>
                    <td>${escapeHtml(r.codice)}</td>
                    <td>${escapeHtml(r.descrizione)}</td>
                    <td>${escapeHtml(r.reparto || "—")}</td>
                    <td>${fmtDate(r.data_scadenza)}</td>
                    <td><input class="rr-edit" data-field="fornitore" type="text" value="${escapeHtml(r.fornitore || "")}" aria-label="Fornitore" required></td>
                    <td><input class="rr-edit" data-field="quantita" type="number" min="0" step="1" value="${escapeHtml(r.quantita ?? 1)}" aria-label="Quantità"></td>
                    <td><select class="rr-edit" data-field="stato" aria-label="Stato">${statusOptions(r.stato)}</select><div style="margin-top:5px"><span class="rr-status ${escapeHtml(r.stato)}">${escapeHtml(STATUS_LABELS[r.stato] || r.stato)}</span></div></td>
                    <td>${fmtDate(r.data_ritiro)}</td>
                    <td><input class="rr-edit" data-field="note" type="text" value="${escapeHtml(r.note || "")}" placeholder="Note" aria-label="Note"></td>
                    <td><button class="rr-btn small" type="button" data-save-record="${escapeHtml(r.id)}"><i class="fa-solid fa-floppy-disk"></i> Salva</button></td>
                </tr>`).join("");
        }
        $("rr-record-count").textContent = `${list.length.toLocaleString("it-IT")} registrazioni visualizzate su ${records.length.toLocaleString("it-IT")}`;
        updateSummary();
    }

    function updateSummary() {
        $("rr-count-check").textContent = records.filter(r => r.stato === "DA_CONTROLLARE").length.toLocaleString("it-IT");
        $("rr-count-pickup").textContent = records.filter(r => r.stato === "DA_RITIRARE").length.toLocaleString("it-IT");
        $("rr-count-done").textContent = records.filter(r => r.stato === "RITIRATO").length.toLocaleString("it-IT");
    }

    async function addProductToRegistry(button) {
        if (!registryTableAvailable) {
            setMessage("rr-global-message", "Il registro non è ancora installato in Supabase. Esegui prima registro-ritiri.sql nell'SQL Editor di Supabase.", true);
            return;
        }
        const id = button.dataset.registerProduct;
        const product = products.find(p => String(p.id ?? `${p.codice}-${p.scadenza}`) === id);
        const row = button.closest("tr");
        if (!product || !row) return;
        const supplier = row.querySelector('[data-field="candidate-supplier"]')?.value.trim() || "";
        const quantity = Number(row.querySelector('[data-field="candidate-quantity"]')?.value);
        if (!supplier) {
            setMessage("rr-candidate-message", `Inserisci il fornitore per la referenza ${product.codice} prima di registrarla.`, true);
            row.querySelector('[data-field="candidate-supplier"]')?.focus();
            return;
        }
        if (!Number.isFinite(quantity) || quantity < 1) {
            setMessage("rr-candidate-message", "La quantità deve essere almeno 1 pezzo.", true);
            row.querySelector('[data-field="candidate-quantity"]')?.focus();
            return;
        }
        const code = normalizedCode(product.codice);
        const date = product.scadenza || null;
        const duplicate = records.find(r =>
            normalizedCode(r.codice) === code &&
            String(r.data_scadenza || "") === String(date || "") &&
            r.stato !== "RITIRATO"
        );
        if (duplicate) {
            setMessage("rr-candidate-message", `${product.codice} è già nel registro con stato “${STATUS_LABELS[duplicate.stato] || duplicate.stato}”. Apri l'archivio per aggiornare la registrazione invece di crearne un duplicato.`, true);
            return;
        }

        button.disabled = true;
        button.textContent = "Salvataggio…";
        try {
            const payload = {
                punto_vendita: currentStore(),
                prodotto_id: product.id == null ? null : String(product.id),
                codice: String(product.codice),
                descrizione: String(product.descrizione),
                reparto: String(product.reparto || ""),
                fornitore: supplier,
                data_scadenza: date,
                giorni_scadenza: calcDays(date),
                quantita: quantity,
                stato: "DA_CONTROLLARE",
                data_ritiro: null,
                note: ""
            };
            const { data, error } = await client().from(TABLE_RITIRI).insert(payload).select("*").single();
            if (error) throw error;
            records.unshift(data);
            populateSupplierFilter();
            renderRegistry();
            renderCandidates();
            setMessage("rr-global-message", `Referenza ${product.codice} aggiunta al registro per ${supplier}. Stato iniziale: Da controllare.`);
            setMessage("rr-candidate-message", "");
        } catch (error) {
            console.error("Errore registrazione ritiro:", error);
            setMessage("rr-global-message", `Non è stato possibile salvare la registrazione: ${error.message || error}. Verifica che la tabella registro_ritiri sia stata creata e che le policy RLS siano attive.`, true);
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fa-solid fa-plus"></i> Registra';
        }
    }

    async function saveRecord(button) {
        const id = button.dataset.saveRecord;
        const row = button.closest("tr");
        const old = records.find(r => String(r.id) === String(id));
        if (!row || !old) return;
        const supplier = row.querySelector('[data-field="fornitore"]')?.value.trim() || "";
        const quantity = Number(row.querySelector('[data-field="quantita"]')?.value);
        const status = row.querySelector('[data-field="stato"]')?.value;
        const note = row.querySelector('[data-field="note"]')?.value.trim() || "";

        if (!supplier) {
            setMessage("rr-record-message", `Il fornitore non può essere vuoto per la referenza ${old.codice}.`, true);
            row.querySelector('[data-field="fornitore"]')?.focus();
            return;
        }
        if (!Number.isFinite(quantity) || quantity < 0) {
            setMessage("rr-record-message", "La quantità deve essere zero o un numero positivo.", true);
            row.querySelector('[data-field="quantita"]')?.focus();
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(STATUS_LABELS, status)) {
            setMessage("rr-record-message", "Stato non valido.", true);
            return;
        }

        const dataRitiro = status === "RITIRATO"
            ? (old.stato === "RITIRATO" && old.data_ritiro ? old.data_ritiro : todayIso())
            : null;
        const payload = {
            fornitore: supplier,
            quantita: quantity,
            stato: status,
            data_ritiro: dataRitiro,
            note,
            updated_at: new Date().toISOString()
        };
        button.disabled = true;
        button.textContent = "Salvataggio…";
        try {
            const { data, error } = await client()
                .from(TABLE_RITIRI)
                .update(payload)
                .eq("id", id)
                .eq("punto_vendita", currentStore())
                .select("*")
                .single();
            if (error) throw error;
            records = records.map(r => String(r.id) === String(id) ? data : r);
            populateSupplierFilter();
            renderRegistry();
            renderCandidates();
            setMessage("rr-record-message", `Registrazione ${old.codice} salvata. Stato: ${STATUS_LABELS[status]}.`);
        } catch (error) {
            console.error("Errore aggiornamento registro ritiro:", error);
            setMessage("rr-record-message", `Salvataggio non riuscito: ${error.message || error}`, true);
            button.disabled = false;
            button.textContent = "Salva";
        }
    }

    function downloadCsv(rows, filename) {
        const columns = ["Punto vendita", "Data inserimento", "Codice", "Referenza", "Reparto", "Fornitore", "Scadenza", "Giorni alla scadenza", "Quantità (pz)", "Stato", "Data ritiro", "Note"];
        const values = rows.map(r => [
            r.punto_vendita, String(r.created_at || "").slice(0, 10), r.codice, r.descrizione,
            r.reparto, r.fornitore, r.data_scadenza, r.giorni_scadenza,
            r.quantita, STATUS_LABELS[r.stato] || r.stato, r.data_ritiro, r.note
        ]);
        const cell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
        const csv = "\uFEFF" + [columns, ...values].map(row => row.map(cell).join(";")).join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename.replace(/\.xlsx$/i, ".csv");
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }

    function exportFilteredRecords() {
        const rows = filteredRecords();
        if (!rows.length) {
            setMessage("rr-record-message", "Non ci sono registrazioni da esportare con i filtri attuali.", true);
            return;
        }
        const day = todayIso();
        const supplier = $("rr-supplier-filter").value;
        const safeStore = currentStore().replace(/[^a-zA-Z0-9_-]/g, "_");
        const safeSupplier = supplier ? "_" + supplier.replace(/[^a-zA-Z0-9_-]/g, "_") : "_Tutti_i_fornitori";
        const filename = `Registro_Ritiri_${safeStore}${safeSupplier}_${day}.xlsx`;
        const exportRows = rows.map(r => ({
            "Punto vendita": r.punto_vendita,
            "Data inserimento": String(r.created_at || "").slice(0, 10),
            "Codice": r.codice,
            "Referenza": r.descrizione,
            "Reparto": r.reparto,
            "Fornitore": r.fornitore,
            "Scadenza": r.data_scadenza,
            "Giorni alla scadenza al momento del salvataggio": r.giorni_scadenza,
            "Quantità (pz)": Number(r.quantita || 0),
            "Stato": STATUS_LABELS[r.stato] || r.stato,
            "Data ritiro": r.data_ritiro,
            "Note": r.note || ""
        }));
        if (window.XLSX?.utils) {
            const worksheet = window.XLSX.utils.json_to_sheet(exportRows);
            worksheet["!cols"] = [
                { wch: 16 }, { wch: 15 }, { wch: 14 }, { wch: 42 }, { wch: 24 },
                { wch: 25 }, { wch: 14 }, { wch: 34 }, { wch: 15 }, { wch: 20 }, { wch: 14 }, { wch: 38 }
            ];
            const workbook = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(workbook, worksheet, "Registro ritiri");
            window.XLSX.writeFile(workbook, filename);
        } else {
            downloadCsv(rows, filename);
            setMessage("rr-global-message", "Libreria XLSX non disponibile: è stato esportato un CSV compatibile con Excel.");
        }
        setMessage("rr-record-message", `Esportate ${rows.length} registrazioni con i filtri attuali.`);
    }

    function wireEvents() {
        ["rr-candidate-search", "rr-candidate-category", "rr-candidate-days"].forEach(id => {
            $(id).addEventListener("input", () => { candidatesPage = 1; renderCandidates(); });
            $(id).addEventListener("change", () => { candidatesPage = 1; renderCandidates(); });
        });
        ["rr-record-search", "rr-supplier-filter", "rr-status-filter"].forEach(id => {
            $(id).addEventListener("input", renderRegistry);
            $(id).addEventListener("change", renderRegistry);
        });
        $("rr-candidate-prev").addEventListener("click", () => { candidatesPage--; renderCandidates(); });
        $("rr-candidate-next").addEventListener("click", () => { candidatesPage++; renderCandidates(); });
        $("rr-candidates").addEventListener("click", event => {
            const button = event.target.closest("[data-register-product]");
            if (button) addProductToRegistry(button);
        });
        $("rr-records").addEventListener("click", event => {
            const button = event.target.closest("[data-save-record]");
            if (button) saveRecord(button);
        });
        $("rr-export").addEventListener("click", exportFilteredRecords);
        $("rr-refresh").addEventListener("click", async () => {
            $("rr-refresh").disabled = true;
            setMessage("rr-global-message", "Aggiornamento in corso…");
            await Promise.allSettled([loadAllProducts(), loadRegistry()]);
            setMessage("rr-global-message", "Dati aggiornati.");
            $("rr-refresh").disabled = false;
        });
        $("rr-store").addEventListener("change", async () => {
            localStorage.setItem(STORE_STORAGE_KEY, currentStore());
            candidatesPage = 1;
            records = [];
            renderRegistry();
            await loadRegistry();
        });
    }

    async function init() {
        if (!client()) {
            setMessage("rr-global-message", "Supabase non è disponibile. Controlla il caricamento di supabase.js.", true);
            return;
        }
        $("rr-store").value = getStoreDefault();
        localStorage.setItem(STORE_STORAGE_KEY, currentStore());
        wireEvents();
        try {
            await Promise.all([loadAllProducts(), loadRegistry()]);
            if (!registryTableAvailable) {
                setMessage("rr-global-message", "Le referenze sono caricate. Per attivare il salvataggio permanente del registro, esegui il file registro-ritiri.sql nell'SQL Editor di Supabase.", true);
            } else {
                setMessage("rr-global-message", "Registro pronto. Le referenze aggiunte resteranno salvate anche dopo la chiusura della pagina.");
            }
        } catch (error) {
            console.error("Errore inizializzazione registro ritiri:", error);
            setMessage("rr-global-message", error.message || String(error), true);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
