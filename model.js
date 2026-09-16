class Modal {

    static apri() {
        document.getElementById("productModal").style.display = "flex";
    }

    static chiudi() {
        document.getElementById("productModal").style.display = "none";
    }

}

window.Modal = Modal;
