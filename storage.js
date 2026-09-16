"use strict";

/*
=====================================
STORAGE
Scadenze Smart GDO Enterprise
=====================================
*/

const Storage = {

    CHIAVE: "SSGDO_ENTERPRISE",

    salva(dati) {

        localStorage.setItem(
            this.CHIAVE,
            JSON.stringify(dati)
        );

    },

    carica() {

        const dati = localStorage.getItem(this.CHIAVE);

        if (!dati) return [];

        try {

            return JSON.parse(dati);

        } catch (errore) {

            console.error("Errore Storage", errore);

            return [];

        }

    },

    cancella() {

        localStorage.removeItem(this.CHIAVE);

    }

};
