"use strict";

document.addEventListener("DOMContentLoaded", avvia);

async function avvia() {

    const params = new URLSearchParams(window.location.search);
    const tipo = params.get("tipo") || "totale";

    const { data, error } = await window.supabaseClient
        .from("prodotti")
        .select("*")
        .order("giorni", { ascending: true });
    if (error) {
        console.error(error);
        return;
    }
const oggi = new Date();
oggi.setHours(0, 0, 0, 0);

const prodottiAggiornati = data.map(p => {

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

console.log("===== CONTROLLO DATE STORICO =====");
console.log("OGGI JAVASCRIPT:", oggi);
console.log("PRIMI 10 PRODOTTI:", prodottiAggiornati.slice(0, 10).map(p => ({
    id: p.id,
    scadenza: p.scadenza,
    giorni: p.giorni
})));
console.log(
    "REFERENZE 0-15 GIORNI:",
    prodottiAggiornati.filter(p => p.giorni >= 0 && p.giorni <= 15).length
);

console.log(
    "PRODOTTI CON SCADENZA DAL 29 AGOSTO:",
    prodottiAggiornati.filter(p => p.scadenza >= "2026-08-29" && p.scadenza <= "2026-09-13")
);   
    
console.log(
    "REFERENZE SCADUTE:",
    prodottiAggiornati.filter(p => p.giorni < 0).length
);    

Prodotti.carica(prodottiAggiornati);
let lista = prodottiAggiornati;
    const reparto = params.get("reparto");

if (reparto) {
    lista = lista.filter(p => p.reparto === reparto);
}

    switch (tipo) {

        case "scaduti":
            document.getElementById("titoloPagina").textContent = "Prodotti Scaduti";
            lista = lista.filter(p => p.giorni < 0);
            break;

        case "entro3":
            document.getElementById("titoloPagina").textContent = "Entro 3 giorni";
            lista = lista.filter(p => p.giorni >= 0 && p.giorni <= 3);
            break;

        case "entro7":
            document.getElementById("titoloPagina").textContent = "Entro 7 giorni";
            lista = lista.filter(p => p.giorni >= 4 && p.giorni <= 7);
            break;

        case "entro10":
            document.getElementById("titoloPagina").textContent = "Entro 10 giorni";
            lista = lista.filter(p => p.giorni >= 8 && p.giorni <= 10);
            break;

        case "entro15":
            document.getElementById("titoloPagina").textContent = "Entro 15 giorni";
            lista = lista.filter(p => p.giorni >= 11 && p.giorni <= 15);
            break;

        default:
            document.getElementById("titoloPagina").textContent = "Tutte le Referenze";
    }

    disegnaTabella(lista, tipo);

    document.getElementById("ricerca").addEventListener("input", e => {

        const testo = e.target.value.toLowerCase();

        const filtrati = lista.filter(p =>
            p.codice.toLowerCase().includes(testo) ||
            p.descrizione.toLowerCase().includes(testo) ||
            p.reparto.toLowerCase().includes(testo)
        );

        disegnaTabella(filtrati, tipo);

    });

}

function disegnaTabella(lista, tipo) {

    const tbody = document.getElementById("tabellaScadenze");

    tbody.innerHTML = "";

    lista.forEach((p) => {

        

        tbody.innerHTML += `
        <tr>
            <td>${p.codice}</td>
            <td>${p.descrizione}</td>
            <td>${p.reparto}</td>
            <td>${p.scadenza}</td>
            <td>${p.giorni}</td>

            <td>

    ${
        ["entro3", "entro7", "entro10", "entro15"].includes(tipo)
        ? `
            <button class="btn-offerta" onclick="mettiInOfferta(${p.id})">
                <i class="fa-solid fa-tag"></i>
            </button>
          `
        : ""
    }

    <button class="btn-edit" onclick="modificaProdotto(${p.id})">
        <i class="fa-solid fa-pen-to-square"></i>
    </button>

</td>
        </tr>
        `;

    });

}
