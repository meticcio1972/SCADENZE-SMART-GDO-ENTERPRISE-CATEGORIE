export async function GET() {

    return new Response(
        JSON.stringify({
            ok: true,
            risposta: "COLLEGAMENTO AI GDO RIUSCITO"
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
}


export async function POST(request) {

    try {

        const body = await request.json();

        const messaggio = body.messaggio || "";

        if (!messaggio) {
            return new Response(
                JSON.stringify({
                    error: "Messaggio AI mancante"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }


        const rispostaOpenAI = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-5.6-luna",
                    input: messaggio
                })
            }
        );


        const dati = await rispostaOpenAI.json();


        if (!rispostaOpenAI.ok) {

            console.error("Errore OpenAI:", dati);

            return new Response(
                JSON.stringify({
                    error: dati.error?.message || "Errore OpenAI"
                }),
                {
                    status: rispostaOpenAI.status,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }


        let testo = "";


        if (dati.output) {

            for (const elemento of dati.output) {

                if (elemento.content) {

                    for (const contenuto of elemento.content) {

                        if (contenuto.text) {
                            testo += contenuto.text;
                        }

                    }

                }

            }

        }


        return new Response(
            JSON.stringify({
                ok: true,
                risposta: testo
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );


    } catch (errore) {

        console.error("Errore AI GDO:", errore);

        return new Response(
            JSON.stringify({
                error: "Errore interno AI GDO"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
}
