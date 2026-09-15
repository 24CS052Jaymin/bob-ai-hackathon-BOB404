from __future__ import annotations

from functools import cached_property

import numpy as np


class Embedder:
    """Single-model embedding gateway; validates the fixed Atlas vector dimension."""
    dimensions = 384

    def __init__(self, model_name: str):
        self.model_name = model_name

    @cached_property
    def _model(self):
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(self.model_name)

    def encode(self, texts: list[str]) -> list[list[float]]:
        vectors = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        array = np.asarray(vectors, dtype=np.float32)
        if array.ndim != 2 or array.shape[1] != self.dimensions or not np.isfinite(array).all():
            raise ValueError(f"Expected finite {self.dimensions}-dimension embeddings; got {array.shape}.")
        return array.tolist()
