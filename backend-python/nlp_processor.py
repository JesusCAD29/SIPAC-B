from transformers import pipeline

class ProcesadorNLP:
    def __init__(self):
        print("⏳ Cargando modelo de Inteligencia Artificial...")
        print("(Esto descargará ~500MB la primera vez. Ten paciencia)...")
        
        # Utilizamos un modelo avanzado multilingüe optimizado para inferencia lógica
        self.clasificador = pipeline("zero-shot-classification", model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli")
        
        # Aquí definimos las categorías de gobierno que la IA debe detectar
        self.categorias = [
            "Seguridad Pública", 
            "Infraestructura y Obras", 
            "Salud y Bienestar", 
            "Educación", 
            "Medio Ambiente", 
            "Economía y Empleo"
        ]
        print("✅ Motor NLP cargado y listo para analizar propuestas.")

    def categorizar_propuesta(self, texto):
        # La IA analiza el texto y lo compara con nuestras categorías
        resultado = self.clasificador(texto, self.categorias, multi_label=False)
        
        # Extraemos la categoría ganadora y su nivel de confianza
        categoria_top = resultado['labels'][0]
        confianza = resultado['scores'][0] * 100
        
        return categoria_top, round(confianza, 2)