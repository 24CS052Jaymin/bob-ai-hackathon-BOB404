from __future__ import annotations

import hashlib
import math
import os
from typing import Sequence


def _login_hf() -> None:
    """Authenticate with Hugging Face Hub if HF_TOKEN is set, suppressing the unauthenticated warning."""
    token = os.getenv("HF_TOKEN", "").strip()
    if not token:
        return
    try:
        from huggingface_hub import login  # type: ignore

        login(token=token, add_to_git_credential=False)
    except Exception:  # noqa: BLE001 — HF login is best-effort
        pass


class EmbeddingProvider:
    def __init__(self, model_name: str, dimensions: int, allow_deterministic: bool = False) -> None:
        self.model_name = model_name
        self.dimensions = dimensions
        self._model = None
        _login_hf()
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            self._model = SentenceTransformer(model_name)
        except Exception as error:
            if not allow_deterministic:
                raise RuntimeError(
                    "Sentence Transformers could not initialize. "
                    "Use a compatible Python environment and install backend requirements. "
                    f"Original error: {error}"
                ) from error

    def __call__(self, texts: Sequence[str]) -> list[list[float]]:
        if self._model is not None:
            vectors = self._model.encode(list(texts), normalize_embeddings=True)
            return [list(map(float, vector)) for vector in vectors]
        return [self._deterministic(text) for text in texts]

    def _deterministic(self, text: str) -> list[float]:
        values: list[float] = []
        seed = text.encode("utf-8")
        for index in range(self.dimensions):
            digest = hashlib.sha256(seed + index.to_bytes(4, "big")).digest()
            values.append((int.from_bytes(digest[:4], "big") / 2**31) - 1.0)
        norm = math.sqrt(sum(value * value for value in values)) or 1.0
        return [value / norm for value in values]
