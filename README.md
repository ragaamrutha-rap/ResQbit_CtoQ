# ⚛️ ResQbit – Quantum Learning Platform

> An AI-based interactive quantum algorithm learning platform, built for **SIH25140**.

Learn quantum computing by *doing*: drag gates onto a circuit, get the Qiskit code generated live, simulate it on Qiskit Aer, and explore the results as histograms, Bloch spheres and circuit diagrams. Read the lessons, ask the AI tutor, and test yourself with a quiz.

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=black)
![Flask](https://img.shields.io/badge/Backend-Flask-000000?logo=flask&logoColor=white)
![Qiskit](https://img.shields.io/badge/Simulator-Qiskit%20Aer-6929C4)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white)

---

## 📑 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
- [Project Structure](#-project-structure)
- [Current Limitations & Roadmap](#-current-limitations--roadmap)
- [Contributing](#-contributing)

---

## ✨ Features

The app is organised into six tabs:

| # | Module | What it does |
|---|---|---|
| 1 | **Learning Content** | Short lessons on qubits, superposition, entanglement, Grover's and Deutsch-Jozsa, plus the **AI Tutor** chat box (Google Gemini) |
| 2 | **Circuit Designer** | Drag-and-drop builder for **1, 2 or 3 qubits** (6 time steps) with **H, X, Z, CNOT** gates and **auto-generated, syntax-highlighted Qiskit code** |
| 3 | **Simulation Engine** | Preset demos: **Grover's Algorithm**, **Deutsch-Jozsa (constant)** and **Deutsch-Jozsa (balanced)**, with raw JSON results from Qiskit Aer |
| 4 | **Visualization** | **Measurement histogram** (Recharts), **Bloch sphere** view (X-Z plane) and an SVG **circuit diagram** |
| 5 | **Assessment** | 5-question quiz with instant right/wrong feedback, explanations and a final score |
| 6 | **Platform** | Overview of the tech stack and deployment status |

---

## 📸 Screenshots

### 2. Quantum Circuit Designer
Choose 1–3 qubits, drag **H / X / Z / CNOT** onto the grid, and the matching Qiskit code appears below. This example applies `H` on q0, `X` on q1, then a `CNOT` (control q0, target q1). Click a placed gate to remove it.

<img width="700" height="594" alt="Screenshot 2026-09-26 215637" src="https://github.com/user-attachments/assets/32119589-490d-4967-a0a9-50790b7e0196" />

### 3. Multi-Framework Simulation Engine
Run the preset algorithm demos and inspect the raw output from the Flask/Qiskit Aer backend. Here, the circuit gives roughly 50/50 counts for `10` and `01` over 1000 shots.

<img width="800" height="546" alt="Screenshot 2026-09-29 103152" src="https://github.com/user-attachments/assets/28c83e29-15a8-4f8f-a5ee-2178648b40ad" />

### 4. Quantum State & Result Visualization
Measurement outcomes are plotted as a histogram, next to the Bloch sphere view.

<img width="500" height="630" alt="Screenshot 2026-09-29 103132" src="https://github.com/user-attachments/assets/cc59f624-d465-499c-8704-774e4fb0d486" />

### Bloch Spheres & Circuit Diagram
Each qubit's state is drawn in the X-Z plane, with the circuit rendered as an SVG diagram underneath.

<img width="600" height="592" alt="Screenshot 2026-09-29 103116" src="https://github.com/user-attachments/assets/91edeef7-c989-4dcb-8758-9f6fa3f96d54" />

> **Why are both Bloch vectors at the centre (`x: 0, y: 0, z: 0`)?** After the `CNOT`, the two qubits are entangled. Each qubit on its own is then in a *maximally mixed* state, which sits at the centre of the Bloch sphere. This is the correct result, not a bug.

---

## 🔄 How It Works

### User journey

```mermaid
flowchart LR
    A(["👤 Learner"]) --> B["📚 1. Learning Content<br/>+ AI Tutor"]
    B --> C["🧩 2. Circuit Designer<br/>drag and drop gates"]
    C --> D["🐍 Live Qiskit code"]
    C --> E["▶️ Run Simulation /<br/>Show Bloch Spheres"]
    B --> F["⚙️ 3. Preset demos<br/>Grover / Deutsch-Jozsa"]
    E --> G["📊 4. Visualization<br/>histogram, Bloch, diagram"]
    F --> G
    G --> H["📝 5. Quiz"]
    H --> A
```

### From the drag-and-drop grid to a simulation

The designer stores gates in a grid keyed by `qubit-column`. When you run a circuit, the grid is scanned column by column and flattened into a gate list that the backend rebuilds into a Qiskit circuit.

```mermaid
flowchart TD
    A["Grid state<br/>key = qubit-column"] --> B["buildGatesList()<br/>scan columns left to right"]
    B --> C["JSON payload<br/>num_qubits + gates"]
    C -->|"POST /simulate"| D["build_circuit_from_gates()"]
    D --> E["Statevector.from_instruction<br/>exact probabilities"]
    D --> F["Add measurements<br/>AerSimulator, 1000 shots"]
    E --> G["JSON response"]
    F --> G
    G --> H["Histogram in Visualization tab"]
```

### Simulation request lifecycle

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React Frontend
    participant BE as Flask Backend
    participant QA as Qiskit

    U->>FE: Drag gates onto the circuit
    FE->>FE: Generate Qiskit code preview
    U->>FE: Click "Run Simulation"
    FE->>BE: POST /simulate {num_qubits, gates}
    BE->>QA: Statevector (before measurement)
    QA-->>BE: probabilities
    BE->>QA: AerSimulator.run(shots=1000)
    QA-->>BE: counts
    BE-->>FE: {probabilities, counts}
    FE-->>U: Raw JSON + histogram

    U->>FE: Click "Show Bloch Spheres"
    FE->>BE: POST /bloch {num_qubits, gates}
    BE->>QA: partial_trace per qubit
    QA-->>BE: reduced density matrix
    BE-->>FE: {bloch_vectors: [{qubit, x, y, z}]}
    FE-->>U: Bloch sphere per qubit
```

### Bloch vector calculation

```mermaid
flowchart LR
    A["Circuit statevector"] --> B["For each qubit q:<br/>partial_trace over the others"]
    B --> C["Reduced density matrix ρ"]
    C --> D["x = 2·Re(ρ01)"]
    C --> E["y = −2·Im(ρ01)"]
    C --> F["z = Re(ρ00 − ρ11)"]
    D --> G["Vector length 1 = pure state<br/>Length 0 = maximally entangled"]
    E --> G
    F --> G
```

### AI tutor and quiz

```mermaid
flowchart LR
    subgraph Tutor["🤖 AI Tutor (Learning Content tab)"]
        direction LR
        T1["User types a question"] -->|"POST /chat"| T2["Flask adds tutor prompt<br/>'quantum tutor for a beginner'"]
        T2 --> T3["Google Gemini"]
        T3 --> T4["Reply shown in chat box"]
    end

    subgraph Quiz["📝 Quiz (Assessment tab)"]
        direction LR
        Q1["Show question"] --> Q2["User picks an option"]
        Q2 --> Q3["Green = correct, red = wrong<br/>+ explanation"]
        Q3 --> Q4{"More questions?"}
        Q4 -->|Yes| Q1
        Q4 -->|No| Q5["Final score X / 5"]
    end
```

---

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph Client["🖥️ Frontend: React (localhost:3000)"]
        L["Learning + AI Tutor"]
        CD["Circuit Designer<br/>HTML5 drag and drop"]
        SE["Simulation Engine"]
        VZ["Visualization<br/>Recharts + custom SVG"]
        QZ["Quiz"]
        SH["react-syntax-highlighter"]
    end

    subgraph Server["⚙️ Backend: Flask + CORS (127.0.0.1:5000)"]
        R1["/simulate"]
        R2["/bloch"]
        R3["/grover-simple"]
        R4["/deutsch-jozsa"]
        R5["/chat"]
        R6["/health"]
    end

    subgraph Engines["🔬 Engines and services"]
        AER[("Qiskit Aer<br/>+ quantum_info")]
        GEM["Google Gemini API"]
    end

    CD --> SH
    CD --> R1
    CD --> R2
    SE --> R3
    SE --> R4
    L --> R5
    R1 --> AER
    R2 --> AER
    R3 --> AER
    R4 --> AER
    R5 --> GEM
    R1 -.-> VZ
    R2 -.-> VZ
```

---

## 🔌 API Reference

Base URL: `http://127.0.0.1:5000`

| Method | Endpoint | Request body | Response |
|---|---|---|---|
| `GET` | `/health` | none | `{"status": "ok"}` |
| `POST` | `/simulate` | `{"num_qubits": 2, "gates": [...]}` | `{"probabilities": {...}, "counts": {...}}` |
| `POST` | `/bloch` | `{"num_qubits": 2, "gates": [...]}` | `{"bloch_vectors": [{"qubit", "x", "y", "z"}]}` |
| `POST` | `/grover-simple` | `{"target": "11"}` | `{"counts": {...}, "target": "11"}` |
| `POST` | `/deutsch-jozsa` | `{"is_constant": true}` | `{"counts": {...}, "oracle_type": "constant"}` |
| `POST` | `/chat` | `{"message": "What is superposition?"}` | `{"reply": "..."}` |

**Gate format** used by `/simulate` and `/bloch`:

```json
{
  "num_qubits": 2,
  "gates": [
    { "gate": "h",  "qubit": 0 },
    { "gate": "x",  "qubit": 1 },
    { "gate": "cx", "control": 0, "target": 1 }
  ]
}
```

Supported gate names: `h`, `x`, `z`, `cx`.

**Try it from the terminal:**

```bash
curl -X POST http://127.0.0.1:5000/simulate \
  -H "Content-Type: application/json" \
  -d '{"num_qubits":2,"gates":[{"gate":"h","qubit":0},{"gate":"cx","control":0,"target":1}]}'
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (Create React App), Recharts, react-syntax-highlighter |
| Backend | Flask, Flask-CORS, python-dotenv |
| Quantum | Qiskit, Qiskit Aer (`AerSimulator`, `Statevector`, `partial_trace`) |
| AI | Google Gemini API (`google-genai`) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+ and npm
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone the repository

```bash
git clone https://github.com/ragaamrutha-rap/ResQbit_CtoQ.git
cd ResQbit_CtoQ
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install flask flask-cors qiskit qiskit-aer google-genai python-dotenv
```

Create a file named `.env` inside `backend/` (it is already git-ignored):

```env
GEMINI_API_KEY=your-api-key-here
```

Start the server:

```bash
python app.py
```

The API runs on **http://127.0.0.1:5000**. Check it with `curl http://127.0.0.1:5000/health`.

> Optional: `python test.py` runs a quick Qiskit Aer sanity check (a Bell-state circuit) without starting the server.

### 3. Set up the frontend

In a second terminal:

```bash
cd frontend
npm install
npm start
```

Open **http://localhost:3000**.

> The frontend calls the backend at `http://127.0.0.1:5000`, so start the backend first.

---

## 📖 Usage Guide

1. **Learn:** read the concepts in tab 1 and ask the AI tutor anything (for example, "What is superposition?").
2. **Design:** in tab 2, pick 1, 2 or 3 qubits and drag **H**, **X**, **Z** or **CNOT** onto the grid. For CNOT, the cell you drop on is the *control*; you'll be asked for the *target* qubit number.
3. **Edit:** click a placed gate to remove it, or use **Clear Circuit**.
4. **Simulate:** click **Run Simulation** and/or **Show Bloch Spheres**. Or open tab 3 and run a preset algorithm.
5. **Visualize:** open tab 4 to see the histogram, Bloch spheres and circuit diagram.
6. **Test yourself:** take the quiz in tab 5.

### Example circuit from the screenshots

```python
from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.x(1)
qc.cx(0, 1)
qc.measure(range(2), range(2))
```

Qiskit prints bitstrings with qubit 0 on the right, so the two outcomes are `01` and `10`, each with probability 0.5 (for example 503 / 497 over 1000 shots).

### Preset algorithms

| Demo | Circuit | Expected result |
|---|---|---|
| **Grover's (2 qubits)** | Superposition → oracle → diffusion | The marked state `11` dominates the counts |
| **Deutsch-Jozsa (constant)** | Oracle without CNOT | Qubit 0 measures `0` every time |
| **Deutsch-Jozsa (balanced)** | Oracle with CNOT | Qubit 0 measures `1` every time |

---

## 📂 Project Structure

```
ResQbit_CtoQ/
├── backend/
│   ├── app.py            # Flask API: simulation, Bloch vectors, presets, Gemini chat
│   └── test.py           # Standalone Qiskit Aer Bell-state sanity check
├── frontend/
│   ├── public/           # CRA static assets
│   ├── src/
│   │   ├── App.js        # All six modules, circuit designer, charts, quiz
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── docs/
│   └── screenshots/      # Images used in this README
├── .gitignore
└── README.md
```

---

## 🗺️ Current Limitations & Roadmap

This is a **local development prototype**. Known limitations, and where it could go next:

- [ ] **Multi-framework backends:** only Qiskit Aer is implemented today; PennyLane, Cirq and qBraid are planned
- [ ] **User authentication and progress tracking:** quiz scores are not saved between sessions
- [ ] **Cloud deployment:** containerise Flask (Render, Railway) and host the built React app (Vercel, Netlify)
- [ ] **Configurable API URL:** the frontend currently hard-codes `http://127.0.0.1:5000`
- [ ] **More gates:** currently H, X, Z and CNOT only, on up to 3 qubits and 6 time steps
- [ ] **Generalised Grover:** the demo is a fixed 2-qubit circuit that searches for `11`
- [ ] **Full 3D Bloch sphere:** the view shows the X-Z projection only
- [ ] **Error handling:** show friendly messages when the backend or Gemini API is unreachable

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m "Add my feature"`
4. Push and open a Pull Request

---

## 📄 License

No license has been specified yet. Consider adding one (for example MIT).

---

<p align="center">Built for <b>SIH25140</b> · Quantum learning made interactive ⚛️</p>
