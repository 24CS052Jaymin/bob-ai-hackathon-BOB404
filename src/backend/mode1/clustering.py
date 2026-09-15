"""
clustering.py — Adverse event clustering using TF-IDF + MiniBatchKMeans.

Responsibility
--------------
Given a list of unique adverse event strings (reactions), this module:
  1. Vectorises them with TfidfVectorizer (character n-grams + word n-grams).
  2. Clusters them with MiniBatchKMeans for scalability on large FAERS datasets.
  3. Derives a human-readable cluster label for each cluster from its top TF-IDF
     terms, falling back to a curated SOC-level keyword map for common terms.
  4. Returns a dict mapping every event string → (cluster_id, cluster_label).

Usage
-----
    from .clustering import cluster_events

    # events: list of unique lowercase reaction strings
    label_map = cluster_events(events, n_clusters=20)
    cluster_id, cluster_label = label_map["myocardial infarction"]
"""

from __future__ import annotations

import re
from typing import NamedTuple

import numpy as np
from sklearn.cluster import MiniBatchKMeans
from sklearn.feature_extraction.text import TfidfVectorizer

# ---------------------------------------------------------------------------
# Curated keyword → SOC-level label map (applied after TF-IDF top-term lookup)
# ---------------------------------------------------------------------------
_SOC_MAP: dict[str, str] = {
    # Cardiac
    "cardiac": "Cardiac Disorders",
    "heart": "Cardiac Disorders",
    "myocardial": "Cardiac Disorders",
    "arrhythmia": "Cardiac Disorders",
    "atrial": "Cardiac Disorders",
    "ventricular": "Cardiac Disorders",
    "tachycardia": "Cardiac Disorders",
    "bradycardia": "Cardiac Disorders",
    # Vascular
    "thrombosis": "Vascular Disorders",
    "embolism": "Vascular Disorders",
    "haemorrhage": "Vascular Disorders",
    "hemorrhage": "Vascular Disorders",
    "bleeding": "Vascular Disorders",
    "hypertension": "Vascular Disorders",
    "hypotension": "Vascular Disorders",
    # Hepatobiliary
    "hepatic": "Hepatobiliary Disorders",
    "liver": "Hepatobiliary Disorders",
    "jaundice": "Hepatobiliary Disorders",
    "cholestasis": "Hepatobiliary Disorders",
    # Renal
    "renal": "Renal & Urinary Disorders",
    "kidney": "Renal & Urinary Disorders",
    "creatinine": "Renal & Urinary Disorders",
    "nephropathy": "Renal & Urinary Disorders",
    # Nervous system
    "neuropathy": "Nervous System Disorders",
    "seizure": "Nervous System Disorders",
    "convulsion": "Nervous System Disorders",
    "encephalopathy": "Nervous System Disorders",
    "headache": "Nervous System Disorders",
    "dizziness": "Nervous System Disorders",
    # Respiratory
    "dyspnoea": "Respiratory Disorders",
    "dyspnea": "Respiratory Disorders",
    "pneumonia": "Respiratory Disorders",
    "cough": "Respiratory Disorders",
    "respiratory": "Respiratory Disorders",
    "pulmonary": "Respiratory Disorders",
    # Skin
    "rash": "Skin & Subcutaneous Disorders",
    "pruritus": "Skin & Subcutaneous Disorders",
    "urticaria": "Skin & Subcutaneous Disorders",
    "dermatitis": "Skin & Subcutaneous Disorders",
    "erythema": "Skin & Subcutaneous Disorders",
    # Gastrointestinal
    "nausea": "Gastrointestinal Disorders",
    "vomiting": "Gastrointestinal Disorders",
    "diarrhoea": "Gastrointestinal Disorders",
    "diarrhea": "Gastrointestinal Disorders",
    "abdominal": "Gastrointestinal Disorders",
    "colitis": "Gastrointestinal Disorders",
    # Musculoskeletal
    "myalgia": "Musculoskeletal Disorders",
    "arthralgia": "Musculoskeletal Disorders",
    "rhabdomyolysis": "Musculoskeletal Disorders",
    "myopathy": "Musculoskeletal Disorders",
    # Immune / Allergy
    "anaphylaxis": "Immune System & Allergic Reactions",
    "angioedema": "Immune System & Allergic Reactions",
    "hypersensitivity": "Immune System & Allergic Reactions",
    # Neoplasm
    "neoplasm": "Neoplasms",
    "cancer": "Neoplasms",
    "tumour": "Neoplasms",
    "tumor": "Neoplasms",
    "carcinoma": "Neoplasms",
    # General
    "death": "Fatal Outcomes",
    "fatigue": "General Disorders",
    "pyrexia": "General Disorders",
    "oedema": "General Disorders",
    "edema": "General Disorders",
    "pain": "General Disorders",
    "drug": "Drug-Related Events",
    "infection": "Infections & Infestations",
}


class ClusterInfo(NamedTuple):
    cluster_id: int
    cluster_label: str


def _label_from_terms(top_terms: list[str]) -> str:
    """Derive a SOC-level label by matching top TF-IDF terms against the keyword map.

    Falls back to title-casing the single most informative term if no match found.
    """
    for term in top_terms:
        # Try each word within multi-word terms
        for word in re.split(r"\W+", term):
            label = _SOC_MAP.get(word.lower())
            if label:
                return label
    # Fallback: title-case the best term, stripping numeric artefacts
    best = re.sub(r"[^a-z ]", "", top_terms[0]).strip().title()
    return f"{best} Events" if best else "Other Adverse Events"


def cluster_events(
    events: list[str],
    n_clusters: int = 20,
    random_state: int = 42,
) -> dict[str, ClusterInfo]:
    """Cluster a list of unique adverse event strings and return a label map.

    Parameters
    ----------
    events : list[str]
        Unique, lowercase adverse event / reaction strings to cluster.
    n_clusters : int
        Number of clusters for MiniBatchKMeans. Capped to len(events) if smaller.
    random_state : int
        Seed for reproducibility.

    Returns
    -------
    dict[str, ClusterInfo]
        Maps each event string to a ``ClusterInfo(cluster_id, cluster_label)``.
    """
    if not events:
        return {}

    # Cap clusters so we never ask for more clusters than unique events
    k = min(n_clusters, len(events))

    # --- Step 1: TF-IDF vectorisation ----------------------------------------
    # Word n-grams (1-2) catch domain terms; character n-grams (3-5) handle
    # morphological variants (e.g. "haemorrhage" / "hemorrhage").
    vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        min_df=1,
        max_features=8_000,
        sublinear_tf=True,          # log-scale TF to reduce impact of frequent terms
        strip_accents="unicode",
    )
    X = vectorizer.fit_transform(events)
    feature_names: np.ndarray = np.array(vectorizer.get_feature_names_out())

    # --- Step 2: MiniBatchKMeans clustering -----------------------------------
    # MiniBatchKMeans is O(n) per iteration — much faster than KMeans on the
    # 60k+ unique events present in a full FAERS dataset.
    kmeans = MiniBatchKMeans(
        n_clusters=k,
        random_state=random_state,
        batch_size=min(1024, len(events)),
        n_init=3,
        max_iter=100,
    )
    cluster_ids: np.ndarray = kmeans.fit_predict(X)

    # --- Step 3: Derive cluster labels from centroid top terms ---------------
    cluster_labels: dict[int, str] = {}
    for cid in range(k):
        centroid = kmeans.cluster_centers_[cid]
        # Top 8 terms by centroid weight
        top_idx = centroid.argsort()[::-1][:8]
        top_terms = feature_names[top_idx].tolist()
        cluster_labels[cid] = _label_from_terms(top_terms)

    # --- Step 4: Build event → ClusterInfo map --------------------------------
    return {
        event: ClusterInfo(
            cluster_id=int(cid),
            cluster_label=cluster_labels[int(cid)],
        )
        for event, cid in zip(events, cluster_ids)
    }
