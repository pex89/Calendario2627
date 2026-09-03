import asyncio
import json
import os
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup
from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

# --- CONFIGURAZIONE VARIABILI ---
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

FILE_PRODOTTI = "prodotti.json"
FILE_INVIATI = "inviati.json"

PAROLA_CHIAVE, PREZZO_MAX, SCONTO_MIN = range(3)


# --- GESTIONE DATABASE LOCALE ---
def carica_json(file_path, default):
    if not os.path.exists(file_path):
        return default
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def salva_json(file_path, dati):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(dati, f, indent=4, ensure_ascii=False)


# --- MOTORE DI SCRAPING AMAZON ---
def cerca_offerte_amazon(parola_chiave, prezzo_max, sconto_min):
    url = f"https://www.amazon.it/s?k={urllib.parse.quote(parola_chiave)}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return []

        soup = BeautifulSoup(response.content, "html.parser")
        risultati = []

        for item in soup.select("div[data-component-type='s-search-result']"):
            titolo_el = item.select_one("h2 a span")
            link_el = item.select_one("h2 a")
            prezzo_el = item.select_one(".a-price .a-offscreen")
            prezzo_vecchio_el = item.select_one(".a-price.a-text-price .a-offscreen")

            if not (titolo_el and link_el and prezzo_el):
                continue

            titolo = titolo_el.text.strip()
            link = "https://www.amazon.it" + link_el["href"].split("?")[0]

            # Estrazione prezzo attuale
            prezzo_str = (
                prezzo_el.text.replace("€", "")
                .replace(" ", "")
                .replace(",", ".")
            )
            try:
                prezzo_attuale = float(re.findall(r"\d+\.\d+|\d+", prezzo_str)[0])
            except IndexError:
                continue

            # Filtro sul prezzo massimo
            if prezzo_attuale > prezzo_max:
                continue

            # Calcolo dello sconto (se è presente un prezzo di listino barrato)
            percentuale_sconto = 0.0
            if prezzo_vecchio_el:
                p_vecchio_str = (
                    prezzo_vecchio_el.text.replace("€", "")
                    .replace(" ", "")
                    .replace(",", ".")
                )
                try:
                    prezzo_vecchio = float(
                        re.findall(r"\d+\.\d+|\d+", p_vecchio_str)[0]
                    )
                    if prezzo_vecchio > prezzo_attuale:
                        percentuale_sconto = (
                            (prezzo_vecchio - prezzo_attuale) / prezzo_vecchio
                        ) * 100
                except IndexError:
                    pass

            # Filtro sullo sconto minimo
            if percentuale_sconto >= sconto_min:
                risultati.append(
                    {
                        "titolo": titolo,
                        "prezzo": prezzo_attuale,
                        "sconto": round(percentuale_sconto, 1),
                        "link": link,
                    }
                )

        return risultati
    except Exception as e:
        print(f"Errore durante lo scraping di '{parola_chiave}': {e}")
        return []


# --- CONTROLLO PERIODICO AUTOMATICO ---
async def controllo_automatico_offerte(context: ContextTypes.DEFAULT_TYPE):
    prodotti = carica_json(FILE_PRODOTTI, [])
    inviati = carica_json(FILE_INVIATI, [])

    if not prodotti:
        return

    nuovi_inviati = list(inviati)

    for item in prodotti:
        offerte = cerca_offerte_amazon(
            item["parola_chiave"], item["prezzo_max"], item["sconto_min"]
        )

        for offerta in offerte:
            # Evita di inviare due volte lo stesso link
            if offerta["link"] in nuovi_inviati:
                continue

            messaggio = (
                f"🚨 **OFFERTA TROVATA!**\n\n"
                f"📦 **{offerta['titolo']}**\n"
                f"💰 Prezzo: **{offerta['prezzo']:.2f} €**\n"
                f"📉 Sconto: **-{offerta['sconto']}%**\n\n"
                f"🔗 [Apri su Amazon]({offerta['link']})"
            )

            await context.bot.send_message(
                chat_id=CHAT_ID,
                text=messaggio,
                parse_mode="Markdown",
                disable_web_page_preview=False,
            )

            nuovi_inviati.append(offerta["link"])

    # Mantiene lo storico degli ultimi 200 prodotti inviati per risparmiare memoria
    salva_json(FILE_INVIATI, nuovi_inviati[-200:])


# --- COMANDI TELEGRAM (/aggiungi) ---
async def inizia_aggiunta(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📝 **Aggiunta Prodotto**\n\n"
        "Quale parola chiave vuoi monitorare? (es. 'detersivo lavatrice')\n"
        "Invia /annulla per fermare la procedura."
    )
    return PAROLA_CHIAVE


async def ricevi_parola(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["parola_chiave"] = update.message.text.strip()
    await update.message.reply_text(
        f"Impostato: **{context.user_data['parola_chiave']}**.\n\n"
        "Qual è il **prezzo massimo** in € che vuoi spendere? (es. 15.00)"
    )
    return PREZZO_MAX


async def ricevi_prezzo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        prezzo = float(update.message.text.replace(",", ".").strip())
        context.user_data["prezzo_max"] = prezzo
        await update.message.reply_text(
            f"Prezzo max: **{prezzo:.2f} €**.\n\n"
            "Qual è la **percentuale minima di sconto** desiderata? (es. 20 per 20%)"
        )
        return SCONTO_MIN
    except ValueError:
        await update.message.reply_text("⚠️ Inserisci un numero valido per il prezzo.")
        return PREZZO_MAX


async def ricevi_sconto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        sconto = float(update.message.text.replace("%", "").strip())
        prodotti = carica_json(FILE_PRODOTTI, [])

        nuovo = {
            "parola_chiave": context.user_data["parola_chiave"],
            "prezzo_max": context.user_data["prezzo_max"],
            "sconto_min": sconto,
        }
        prodotti.append(nuovo)
        salva_json(FILE_PRODOTTI, prodotti)

        await update.message.reply_text(
            f"✅ **Prodotto Salvato!**\n\n"
            f"📌 **Cerca:** {nuovo['parola_chiave']}\n"
            f"💰 **Prezzo Max:** {nuovo['prezzo_max']:.2f} €\n"
            f"📉 **Sconto Min:** {nuovo['sconto_min']}%"
        )
        context.user_data.clear()
        return ConversationHandler.END
    except ValueError:
        await update.message.reply_text("⚠️ Inserisci un numero valido per lo sconto.")
        return SCONTO_MIN


async def annulla(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await update.message.reply_text("❌ Operazione annullata.")
    return ConversationHandler.END


# --- COMANDI UTILITY (/lista e /rimuovi) ---
async def mostra_lista(update: Update, context: ContextTypes.DEFAULT_TYPE):
    prodotti = carica_json(FILE_PRODOTTI, [])
    if not prodotti:
        await update.message.reply_text("📭 Nessun prodotto in monitoraggio.")
        return

    msg = "📋 **Prodotti Monitorati:**\n\n"
    for i, p in enumerate(prodotti, start=1):
        msg += f"**{i}. {p['parola_chiave'].title()}** | Max: {p['prezzo_max']:.2f}€ | Sconto: {p['sconto_min']}%\n"
    await update.message.reply_text(msg, parse_mode="Markdown")


async def rimuovi_prodotto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "⚠️ Specifica il numero del prodotto da eliminare. Es: `/rimuovi 1`",
            parse_mode="Markdown",
        )
        return

    try:
        idx = int(context.args[0]) - 1
        prodotti = carica_json(FILE_PRODOTTI, [])

        if 0 <= idx < len(prodotti):
            rimosso = prodotti.pop(idx)
            salva_json(FILE_PRODOTTI, prodotti)
            await update.message.reply_text(
                f"🗑️ Rimosso: **{rimosso['parola_chiave']}**"
            )
        else:
            await update.message.reply_text("⚠️ Numero non valido.")
    except ValueError:
        await update.message.reply_text("⚠️ Inserisci un numero valido.")


# --- MAIN ENGINE ---
if __name__ == "__main__":
    if not BOT_TOKEN or not CHAT_ID:
        raise ValueError(
            "Variabili d'ambiente TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID mancanti!"
        )

    app = ApplicationBuilder().token(BOT_TOKEN).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("aggiungi", inizia_aggiunta)],
        states={
            PAROLA_CHIAVE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, ricevi_parola)
            ],
            PREZZO_MAX: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, ricevi_prezzo)
            ],
            SCONTO_MIN: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, ricevi_sconto)
            ],
        },
        fallbacks=[CommandHandler("annulla", annulla)],
    )

    app.add_handler(conv_handler)
    app.add_handler(CommandHandler("lista", mostra_lista))
    app.add_handler(CommandHandler("rimuovi", rimuovi_prodotto))

    # Esegue il controllo automatico delle offerte ogni 4 ore (14400 secondi)
    app.job_queue.run_repeating(
        controllo_automatico_offerte, interval=14400, first=10
    )

    print("Bot in ascolto e pianificatore attivo...")
    app.run_polling()