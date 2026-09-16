"use strict";

/*
=====================================
PRODOTTI
Scadenze Smart GDO Enterprise
=====================================
*/

const Prodotti = {

    lista: [],

    carica(dati = []) {

        if (!Array.isArray(dati)) {

            this.lista = [];

            return;

        }

        this.lista = [...dati];

    },

    tutti() {

        return this.lista;

    },

    aggiungi(prodotto) {

        this.lista.push(prodotto);

        Storage.salva(this.lista);

    },

    elimina(codice) {

        this.lista = this.lista.filter(p => p.codice !== codice);

        Storage.salva(this.lista);

    },

    trova(codice) {

        return this.lista.find(p => p.codice === codice);

    }

};
