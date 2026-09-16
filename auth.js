"use strict";

const LOGIN_PAGE = "login.html"; 
const HOME_PAGE = "index.html";

async function controllaAccesso() {
    const pagina =
        window.location.pathname.split("/").pop() || HOME_PAGE;

    const { data, error } =
        await window.supabaseClient.auth.getSession();

    if (pagina === LOGIN_PAGE) {
        if (data?.session) {
            window.location.replace(HOME_PAGE);
        }
        return;
    }

    if (error || !data?.session) {
        window.location.replace(LOGIN_PAGE);
        return;
    }

    window.utenteAutenticato = data.session.user;
}

async function eseguiLogin(email, password) {
    const { data, error } =
        await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        throw error;
    }

    return data;
}

async function eseguiLogout() {
    const { error } =
        await window.supabaseClient.auth.signOut();

    if (error) {
        console.error("Errore logout:", error);
        return;
    }

    window.location.replace(LOGIN_PAGE);
}

document.addEventListener("DOMContentLoaded", async () => {

    const pagina =
        window.location.pathname.split("/").pop() || HOME_PAGE;

    await controllaAccesso();

    if (pagina !== LOGIN_PAGE) {
        return;
    }

    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const button = document.getElementById("loginButton");
    const errore = document.getElementById("errore");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        errore.style.display = "none";
        button.disabled = true;
        button.textContent = "Accesso...";

        try {

            await eseguiLogin(
                emailInput.value.trim(),
                passwordInput.value
            );

            window.location.replace(HOME_PAGE);

        } catch (error) {

            console.error("Errore login:", error);

            errore.textContent =
                "Email o password non corrette.";

            errore.style.display = "block";

            button.disabled = false;
            button.textContent = "Accedi";
        }
    });
});
