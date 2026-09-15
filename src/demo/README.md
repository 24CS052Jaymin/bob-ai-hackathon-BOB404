# Demo CSV Files

These four CSV files are ready to upload to your ReguLens website to test that everything is working end-to-end.

## How to Upload

1. Start the backend: `uvicorn src.backend.mode1.main:app --reload` (from `src/`)
2. Start the frontend: `npm run dev` (from `src/frontend/mode1/`)
3. Open `http://localhost:5173` in your browser
4. Go to **New Analysis** page
5. Click **Upload CSV** and pick any file below

---

## File Reference

| File | Theme | Drugs | Key signals you'll see |
|------|-------|-------|------------------------|
| `faers_demo_1_cardio.csv` | Cardiovascular | warfarin, clopidogrel, amlodipine, lisinopril, aspirin, metoprolol, digoxin, furosemide, simvastatin, ramipril, atorvastatin, ibuprofen | haemorrhage · angioedema · thrombocytopenia · myopathy · peripheral oedema |
| `faers_demo_2_metabolic.csv` | Metabolic / Endocrine | metformin, glibenclamide, insulin glargine, sitagliptin, empagliflozin, levothyroxine, prednisone, allopurinol, colchicine, methotrexate | lactic acidosis · hypoglycaemia · pancreatitis · urinary tract infection · steven-johnson syndrome |
| `faers_demo_3_antimicrobial.csv` | Antimicrobial | amoxicillin, ciprofloxacin, vancomycin, fluconazole, trimethoprim, azithromycin, clindamycin, nitrofurantoin, doxycycline, rifampicin | anaphylaxis · tendon rupture · red man syndrome · QT prolongation · C. difficile infection |
| `faers_demo_4_neuro_psych.csv` | Neurology / Psychiatry | fluoxetine, clozapine, haloperidol, lithium, valproate, carbamazepine, olanzapine, sertraline, donepezil | agranulocytosis · tardive dyskinesia · suicidal ideation · hepatotoxicity · steven-johnson syndrome |

> **Demo 4** also contains a few intentionally dirty rows (blank drug, blank reaction, multi-reaction row with 5 events) to verify that the cleaner handles edge-cases correctly. Those rows will be silently dropped — the signal counts will still be valid.

---

## Expected PRR Results

Each file is designed so the following pairs will always pass **PRR ≥ 2.0** and **report_count ≥ 3**:

### Demo 1 — Cardiovascular
- warfarin → haemorrhage  
- lisinopril → angioedema  
- clopidogrel → thrombocytopenia  
- simvastatin → myopathy  
- atorvastatin → myalgia / rhabdomyolysis  

### Demo 2 — Metabolic
- metformin → lactic acidosis  
- glibenclamide → hypoglycaemia  
- sitagliptin → pancreatitis  
- empagliflozin → urinary tract infection / diabetic ketoacidosis  
- allopurinol → steven-johnson syndrome  

### Demo 3 — Antimicrobial
- amoxicillin → anaphylaxis  
- ciprofloxacin → tendon rupture  
- vancomycin → red man syndrome / nephrotoxicity  
- azithromycin → QT prolongation  
- clindamycin → clostridioides difficile infection  

### Demo 4 — Neuro/Psych
- clozapine → agranulocytosis  
- haloperidol → tardive dyskinesia  
- valproate → hepatotoxicity  
- carbamazepine → steven-johnson syndrome  
- olanzapine → metabolic syndrome  

---

## Credentials

All API endpoints are protected with HTTP Basic Auth.  
Default credentials (set in `src/.env`):

```
Username: admin
Password: regulens2024
```

The frontend sends these automatically. To change them, update `API_USERNAME` / `API_PASSWORD` in `src/.env` **and** `VITE_API_USERNAME` / `VITE_API_PASSWORD` in `src/frontend/mode1/.env.local`.

---

## Column Format

All four files use exactly the columns the backend requires:

```
report_id  — unique integer per report
suspect_drug — drug name (will be lowercased by cleaner)
reactions  — one or more events separated by "; " (semicolon + space)
```
