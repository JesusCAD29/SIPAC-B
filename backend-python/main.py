"""
main.py — Worker de procesamiento NLP para propuestas ciudadanas.

Este proceso corre de forma independiente al backend Node.js.
Su ciclo de vida:
1. Se conecta a la misma instancia MongoDB que usa Node.
2. Carga el modelo NLP (ProcesadorNLP) desde nlp_processor.py.
3. En un bucle infinito, busca propuestas con procesado=False,
    las clasifica con la IA y actualiza el documento en Mongo.
4. Si no hay propuestas pendientes, duerme 5 segundos antes de volver a revisar.

Dependencias: pymongo, python-dotenv, transformers (ver requirements.txt).
Uso: python main.py
"""

import os
import time
from pymongo import MongoClient
from dotenv import load_dotenv
from nlp_processor import ProcesadorNLP

# Reutiliza las variables de entorno del backend Node (MONGO_URI, etc.)
load_dotenv(dotenv_path="../backend-node/.env")
MONGO_URI = os.getenv("MONGO_URI")


def iniciar_worker():
    print("🔌 Conectando a la base de datos de SIPAC-B...")

    cliente = MongoClient(MONGO_URI)

    # get_default_database() lee el nombre de la BD desde la URI.
    # Si la URI no lo especifica, cae al nombre 'test' (default de Node.js/Mongoose).
    try:
        db = cliente.get_default_database()
    except Exception:
        db = cliente['test']

    coleccion_propuestas = db['propuestas']

    # Carga el modelo de IA (puede tardar ~30s la primera vez)
    procesador = ProcesadorNLP()

    print("👁️ Worker de IA iniciado. Escuchando nuevas propuestas...")

    while True:
        # Toma UNA propuesta no procesada (FIFO implícito de MongoDB)
        propuesta = coleccion_propuestas.find_one({"procesado": False})

        if propuesta:
            texto = propuesta.get("texto", "")
            print(f"\n📝 Nueva propuesta detectada: '{texto}'")

            categoria, confianza = procesador.categorizar_propuesta(texto)
            print(f"🤖 Veredicto IA: {categoria} (Precisión: {confianza}%)")

            # Escribe el resultado de la IA en el mismo documento
            coleccion_propuestas.update_one(
                {"_id": propuesta["_id"]},
                {"$set": {
                    "categoriaIA": categoria,
                    "confianzaIA": confianza,
                    "procesado": True
                }}
            )
        else:
            # Espera activa: evita saturar la CPU cuando no hay trabajo
            time.sleep(5)


if __name__ == "__main__":
    iniciar_worker()