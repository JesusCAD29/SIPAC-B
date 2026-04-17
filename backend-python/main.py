import os
import time
from pymongo import MongoClient
from dotenv import load_dotenv
from nlp_processor import ProcesadorNLP

# Buscamos el archivo .env que está en la carpeta de Node
load_dotenv(dotenv_path="../backend-node/.env")
MONGO_URI = os.getenv("MONGO_URI")

def iniciar_worker():
    print("🔌 Conectando a la base de datos de SIPAC-B...")
    
    # Conectamos a MongoDB
    cliente = MongoClient(MONGO_URI)
    
    # CORRECCIÓN: Le decimos explícitamente qué base usar.
    # Usamos un bloque try-except por si en el futuro sí le pones nombre a tu URI.
    try:
        db = cliente.get_default_database()
    except:
        db = cliente['test'] # 'test' es el nombre por defecto que usa Node.js
    coleccion_propuestas = db['propuestas']
    
    # Encendemos a la bestia (el modelo de IA)
    procesador = ProcesadorNLP()

    print("👁️ Worker de IA iniciado. Escuchando nuevas propuestas...")
    
    while True:
        # Buscamos UNA propuesta que Node.js haya guardado pero que la IA aún no procese
        propuesta = coleccion_propuestas.find_one({"procesado": False})
        
        if propuesta:
            texto = propuesta.get("texto", "")
            print(f"\n📝 Nueva propuesta detectada: '{texto}'")
            
            # Pasamos el texto por nuestra Red Neuronal
            categoria, confianza = procesador.categorizar_propuesta(texto)
            print(f"🤖 Veredicto IA: {categoria} (Precisión: {confianza}%)")
            
            # Actualizamos el documento en MongoDB con el análisis
            coleccion_propuestas.update_one(
                {"_id": propuesta["_id"]},
                {"$set": {
                    "categoriaIA": categoria,
                    "confianzaIA": confianza,
                    "procesado": True
                }}
            )
        else:
            # Si no hay propuestas nuevas, la IA duerme 5 segundos para no quemar tu CPU
            time.sleep(5)

if __name__ == "__main__":
    iniciar_worker()