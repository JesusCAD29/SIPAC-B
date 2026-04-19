"""
nlp_processor.py — Motor de clasificación NLP para propuestas ciudadanas.

Utiliza el modelo multilingüe MoritzLaurer/mDeBERTa-v3-base-mnli-xnli
con la técnica zero-shot classification, que permite categorizar texto
en etiquetas predefinidas sin necesidad de entrenamiento adicional.

Clase:
  ProcesadorNLP — Carga el modelo en el constructor y expone
                  categorizar_propuesta() para uso síncrono.

Nota: El modelo (~500 MB) se descarga automáticamente de Hugging Face
      la primera vez que se instancia la clase.
"""

from transformers import pipeline


class ProcesadorNLP:
    def __init__(self):
        print("⏳ Cargando modelo de Inteligencia Artificial...")
        print("(Esto descargará ~500MB la primera vez. Ten paciencia)...")

        # Pipeline de zero-shot: no requiere fine-tuning; compara texto vs etiquetas.
        self.clasificador = pipeline(
            "zero-shot-classification",
            model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
        )

        # Categorías de política pública que la IA debe reconocer en las propuestas.
        self.categorias = [
            "Seguridad Pública",
            "Infraestructura y Obras",
            "Salud y Bienestar",
            "Educación",
            "Medio Ambiente",
            "Economía y Empleo"
        ]
        print("✅ Motor NLP cargado y listo para analizar propuestas.")

    def categorizar_propuesta(self, texto: str) -> tuple[str, float]:
        """
        Clasifica un texto libre en una de las categorías definidas.

        Args:
            texto: Propuesta ciudadana en lenguaje natural.

        Returns:
            Tupla (categoria_top, confianza) donde:
              - categoria_top: Etiqueta con mayor puntuación de similitud.
              - confianza:     Porcentaje de certeza del modelo (0.0–100.0).
        """
        resultado = self.clasificador(texto, self.categorias, multi_label=False)

        categoria_top = resultado['labels'][0]
        confianza     = resultado['scores'][0] * 100

        return categoria_top, round(confianza, 2)