from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector, partial_trace, DensityMatrix
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def build_circuit_from_gates(num_qubits, gates):
    qc = QuantumCircuit(num_qubits, num_qubits)
    for g in gates:
        if g['gate'] == 'h':
            qc.h(g['qubit'])
        elif g['gate'] == 'x':
            qc.x(g['qubit'])
        elif g['gate'] == 'z':
            qc.z(g['qubit'])
        elif g['gate'] == 'cx':
            qc.cx(g['control'], g['target'])
    return qc

@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json
    num_qubits = data['num_qubits']
    gates = data['gates']
    qc = build_circuit_from_gates(num_qubits, gates)
    sv = Statevector.from_instruction(qc)
    probabilities = sv.probabilities_dict()
    qc.measure(range(num_qubits), range(num_qubits))
    sim = AerSimulator()
    result = sim.run(qc, shots=1000).result()
    counts = result.get_counts()
    return jsonify({'probabilities': probabilities, 'counts': counts})

@app.route('/bloch', methods=['POST'])
def bloch():
    data = request.json
    num_qubits = data['num_qubits']
    gates = data['gates']
    qc = build_circuit_from_gates(num_qubits, gates)
    sv = Statevector.from_instruction(qc)
    bloch_vectors = []
    for q in range(num_qubits):
        other_qubits = [i for i in range(num_qubits) if i != q]
        if other_qubits:
            reduced = partial_trace(sv, other_qubits)
        else:
            reduced = DensityMatrix(sv)
        rho = reduced.data
        x = float(2 * rho[0, 1].real)
        y = float(-2 * rho[0, 1].imag)
        z = float((rho[0, 0] - rho[1, 1]).real)
        bloch_vectors.append({'qubit': q, 'x': x, 'y': y, 'z': z})
    return jsonify({'bloch_vectors': bloch_vectors})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/grover-simple', methods=['POST'])
def grover_simple():
    data = request.json
    target = data.get('target', '11')
    qc = QuantumCircuit(2, 2)
    qc.h([0, 1])
    qc.cz(0, 1)
    qc.h([0, 1])
    qc.x([0, 1])
    qc.h(1)
    qc.cx(0, 1)
    qc.h(1)
    qc.x([0, 1])
    qc.h([0, 1])
    qc.measure([0, 1], [0, 1])
    sim = AerSimulator()
    result = sim.run(qc, shots=1000).result()
    counts = result.get_counts()
    return jsonify({'counts': counts, 'target': target})

@app.route('/deutsch-jozsa', methods=['POST'])
def deutsch_jozsa():
    data = request.json
    is_constant = data.get('is_constant', True)
    qc = QuantumCircuit(2, 1)
    qc.x(1)
    qc.h([0, 1])
    if not is_constant:
        qc.cx(0, 1)
    qc.h(0)
    qc.measure(0, 0)
    sim = AerSimulator()
    result = sim.run(qc, shots=1000).result()
    counts = result.get_counts()
    return jsonify({'counts': counts, 'oracle_type': 'constant' if is_constant else 'balanced'})

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data['message']
    response = gemini_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=f"You are a quantum computing tutor for a beginner. Answer simply and clearly: {user_message}"
    )
    return jsonify({'reply': response.text})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
