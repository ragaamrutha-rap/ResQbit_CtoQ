import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import './App.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

const NUM_COLUMNS = 6;

const gateChipStyle = {
  width: '50px', height: '50px', backgroundColor: '#333', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 'bold', fontSize: '1.1rem', borderRadius: '6px', cursor: 'grab'
};

const modules = [
  { id: 'learning', label: '1. Learning Content' },
  { id: 'designer', label: '2. Circuit Designer' },
  { id: 'simulation', label: '3. Simulation Engine' },
  { id: 'visualization', label: '4. Visualization' },
  { id: 'assessment', label: '5. Assessment' },
  { id: 'platform', label: '6. Platform' }
];

const quizQuestions = [
  {
    question: "What is a qubit?",
    options: ["A classical bit that is always 0", "A quantum bit that can be in a superposition of 0 and 1", "A type of quantum gate", "A measurement device"],
    correct: 1,
    explanation: "A qubit is the basic unit of quantum information. Unlike a classical bit, it can exist in a superposition of both 0 and 1 simultaneously."
  },
  {
    question: "What does the Hadamard (H) gate do to a qubit in state |0⟩?",
    options: ["Flips it to |1⟩", "Puts it into an equal superposition of |0⟩ and |1⟩", "Measures it", "Does nothing"],
    correct: 1,
    explanation: "The H gate creates an equal superposition, so measuring afterward gives 0 or 1 with 50% probability each."
  },
  {
    question: "What is entanglement?",
    options: ["Two qubits that are physically touching", "A correlation between qubits such that measuring one instantly affects the other's outcome", "A type of classical bit error", "A way to delete a qubit's state"],
    correct: 1,
    explanation: "Entanglement is a uniquely quantum correlation between qubits, used heavily in quantum algorithms and communication."
  },
  {
    question: "What does Grover's algorithm do?",
    options: ["Encrypts classical data", "Searches an unsorted database quadratically faster than classical methods", "Factors large numbers", "Simulates chemical reactions"],
    correct: 1,
    explanation: "Grover's algorithm provides a quadratic speedup for searching unsorted data compared to classical algorithms."
  },
  {
    question: "What does the Deutsch-Jozsa algorithm determine?",
    options: ["Whether a function is constant or balanced, in a single query", "The prime factors of a number", "The shortest path in a graph", "The energy state of a molecule"],
    correct: 0,
    explanation: "Deutsch-Jozsa determines with 100% certainty in one query whether a function is constant or balanced — a task requiring multiple queries classically."
  }
];

function App() {
  const [activeModule, setActiveModule] = useState('learning');

  const [numQubits, setNumQubits] = useState(2);
  const [grid, setGrid] = useState({});
  const [result, setResult] = useState(null);
  const [blochData, setBlochData] = useState(null);

  const [chatInput, setChatInput] = useState('');
  const [chatReply, setChatReply] = useState('');

  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizDone, setQuizDone] = useState(false);

  const cellKey = (q, c) => `${q}-${c}`;

  const changeNumQubits = (n) => {
    setNumQubits(n);
    setGrid({});
    setResult(null);
    setBlochData(null);
  };

  const handleDragStart = (e, gateType) => {
    e.dataTransfer.setData('gateType', gateType);
  };

  const handleDrop = (e, q, c) => {
    e.preventDefault();
    const gateType = e.dataTransfer.getData('gateType');
    if (!gateType) return;

    if (gateType === 'cnot') {
      if (numQubits < 2) {
        alert('CNOT needs at least 2 qubits. Select 2 or 3 qubits first.');
        return;
      }
      let targetInput = window.prompt(`CNOT control is qubit ${q}. Enter target qubit number (0 to ${numQubits - 1}, not ${q}):`);
      const target = parseInt(targetInput, 10);
      if (isNaN(target) || target === q || target < 0 || target >= numQubits) {
        alert('Invalid target qubit.');
        return;
      }
      const newGrid = { ...grid };
      newGrid[cellKey(q, c)] = { type: 'cnot', role: 'control', pair: target };
      newGrid[cellKey(target, c)] = { type: 'cnot', role: 'target', pair: q };
      setGrid(newGrid);
    } else {
      const newGrid = { ...grid };
      newGrid[cellKey(q, c)] = { type: gateType };
      setGrid(newGrid);
    }
  };

  const handleCellClick = (q, c) => {
    const cell = grid[cellKey(q, c)];
    if (!cell) return;
    const newGrid = { ...grid };
    if (cell.type === 'cnot') {
      delete newGrid[cellKey(q, c)];
      delete newGrid[cellKey(cell.pair, c)];
    } else {
      delete newGrid[cellKey(q, c)];
    }
    setGrid(newGrid);
  };

  const clearCircuit = () => {
    setGrid({});
    setResult(null);
    setBlochData(null);
  };

  const gateSymbol = (cell) => {
    if (!cell) return '';
    if (cell.type === 'h') return 'H';
    if (cell.type === 'x') return 'X';
    if (cell.type === 'z') return 'Z';
    if (cell.type === 'cnot' && cell.role === 'control') return '●';
    if (cell.type === 'cnot' && cell.role === 'target') return '⊕';
    return '';
  };

  const buildGatesList = () => {
    const gates = [];
    for (let c = 0; c < NUM_COLUMNS; c++) {
      for (let q = 0; q < numQubits; q++) {
        const cell = grid[cellKey(q, c)];
        if (!cell) continue;
        if (cell.type === 'h' || cell.type === 'x' || cell.type === 'z') {
          gates.push({ gate: cell.type, qubit: q });
        } else if (cell.type === 'cnot' && cell.role === 'control') {
          gates.push({ gate: 'cx', control: q, target: cell.pair });
        }
      }
    }
    return gates;
  };

  const buildQiskitCode = () => {
    let code = `from qiskit import QuantumCircuit\n\nqc = QuantumCircuit(${numQubits}, ${numQubits})\n`;
    for (let c = 0; c < NUM_COLUMNS; c++) {
      for (let q = 0; q < numQubits; q++) {
        const cell = grid[cellKey(q, c)];
        if (!cell) continue;
        if (cell.type === 'h') code += `qc.h(${q})\n`;
        else if (cell.type === 'x') code += `qc.x(${q})\n`;
        else if (cell.type === 'z') code += `qc.z(${q})\n`;
        else if (cell.type === 'cnot' && cell.role === 'control') code += `qc.cx(${q}, ${cell.pair})\n`;
      }
    }
    code += `qc.measure(range(${numQubits}), range(${numQubits}))\n`;
    return code;
  };

  const renderCircuitDiagram = () => {
    const colWidth = 60;
    const rowHeight = 60;
    const leftMargin = 50;
    const topMargin = 20;
    const width = leftMargin + NUM_COLUMNS * colWidth + 20;
    const height = topMargin + numQubits * rowHeight + 20;
    const elements = [];

    for (let q = 0; q < numQubits; q++) {
      const y = topMargin + q * rowHeight + rowHeight / 2;
      elements.push(<text key={`label-${q}`} x={10} y={y + 5} fontSize="14" fontWeight="bold">q{q}</text>);
      elements.push(<line key={`line-${q}`} x1={leftMargin} y1={y} x2={width - 20} y2={y} stroke="#333" strokeWidth="2" />);
    }

    for (let c = 0; c < NUM_COLUMNS; c++) {
      const x = leftMargin + c * colWidth + colWidth / 2;
      let cnotControlQ = null, cnotTargetQ = null;
      for (let q = 0; q < numQubits; q++) {
        const cell = grid[cellKey(q, c)];
        if (cell && cell.type === 'cnot') {
          if (cell.role === 'control') cnotControlQ = q;
          else cnotTargetQ = q;
        }
      }
      if (cnotControlQ !== null && cnotTargetQ !== null) {
        const y1 = topMargin + cnotControlQ * rowHeight + rowHeight / 2;
        const y2 = topMargin + cnotTargetQ * rowHeight + rowHeight / 2;
        elements.push(<line key={`cnotline-${c}`} x1={x} y1={y1} x2={x} y2={y2} stroke="#8884d8" strokeWidth="2" />);
      }
      for (let q = 0; q < numQubits; q++) {
        const cell = grid[cellKey(q, c)];
        if (!cell) continue;
        const y = topMargin + q * rowHeight + rowHeight / 2;
        if (cell.type === 'cnot' && cell.role === 'control') {
          elements.push(<circle key={`g-${q}-${c}`} cx={x} cy={y} r="6" fill="#8884d8" />);
        } else if (cell.type === 'cnot' && cell.role === 'target') {
          elements.push(
            <g key={`g-${q}-${c}`}>
              <circle cx={x} cy={y} r="12" fill="#fff" stroke="#8884d8" strokeWidth="2" />
              <line x1={x - 8} y1={y} x2={x + 8} y2={y} stroke="#8884d8" strokeWidth="2" />
              <line x1={x} y1={y - 8} x2={x} y2={y + 8} stroke="#8884d8" strokeWidth="2" />
            </g>
          );
        } else {
          elements.push(
            <g key={`g-${q}-${c}`}>
              <rect x={x - 15} y={y - 15} width="30" height="30" fill="#8884d8" stroke="#333" />
              <text x={x} y={y + 5} fontSize="14" fill="#fff" textAnchor="middle" fontWeight="bold">{gateSymbol(cell)}</text>
            </g>
          );
        }
      }
    }
    return <svg width={width} height={height}>{elements}</svg>;
  };
  const runCircuit = async () => {
    const gates = buildGatesList();
    const res = await fetch('http://127.0.0.1:5000/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_qubits: numQubits, gates })
    });
    const data = await res.json();
    setResult(data);
  };

  const runBloch = async () => {
    const gates = buildGatesList();
    const res = await fetch('http://127.0.0.1:5000/bloch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_qubits: numQubits, gates })
    });
    const data = await res.json();
    setBlochData(data.bloch_vectors);
  };

  const runGrover = async () => {
    const res = await fetch('http://127.0.0.1:5000/grover-simple', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: '11' })
    });
    setResult(await res.json());
  };

  const runDeutschJozsa = async (isConstant) => {
    const res = await fetch('http://127.0.0.1:5000/deutsch-jozsa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_constant: isConstant })
    });
    setResult(await res.json());
  };

  const sendChat = async () => {
    const res = await fetch('http://127.0.0.1:5000/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: chatInput })
    });
    const data = await res.json();
    setChatReply(data.reply);
  };

  const submitAnswer = (optionIndex) => {
    if (quizAnswered) return;
    setSelectedOption(optionIndex);
    setQuizAnswered(true);
    if (optionIndex === quizQuestions[quizIndex].correct) {
      setQuizScore(quizScore + 1);
    }
  };

  const nextQuestion = () => {
    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex(quizIndex + 1);
      setSelectedOption(null);
      setQuizAnswered(false);
    } else {
      setQuizDone(true);
    }
  };

  const restartQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedOption(null);
    setQuizAnswered(false);
    setQuizDone(false);
  };

  const navButtonStyle = (id) => ({
    padding: '0.6rem 1rem',
    marginRight: '0.4rem',
    marginBottom: '0.4rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    backgroundColor: activeModule === id ? '#8884d8' : '#f5f5f5',
    color: activeModule === id ? '#fff' : '#000',
    fontWeight: activeModule === id ? 'bold' : 'normal',
    cursor: 'pointer'
  });

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial', maxWidth: '900px' }}>
      <h1>AI-Based Interactive Quantum Algorithm Learning Platform</h1>

      <div style={{ marginBottom: '1.5rem' }}>
        {modules.map((m) => (
          <button key={m.id} style={navButtonStyle(m.id)} onClick={() => setActiveModule(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {activeModule === 'learning' && (
        <div>
          <h2>1. Learning Content & Curriculum Module</h2>
          <p><strong>Qubits:</strong> The basic unit of quantum information. Unlike a classical bit (0 or 1), a qubit can exist in a superposition of both states at once.</p>
          <p><strong>Superposition:</strong> Created using gates like Hadamard (H). A qubit in superposition has some probability of measuring 0 and some probability of measuring 1.</p>
          <p><strong>Entanglement:</strong> Created using gates like CNOT combined with H. Entangled qubits are correlated such that measuring one instantly determines the outcome of the other.</p>
          <p><strong>Grover's Algorithm:</strong> Searches an unsorted list quadratically faster than any classical algorithm, by amplifying the probability of the correct answer.</p>
          <p><strong>Deutsch-Jozsa Algorithm:</strong> Determines whether a function is constant or balanced using a single quantum query, versus multiple queries classically.</p>

          <div style={{ marginTop: '1.5rem', border: '1px solid #ccc', padding: '1rem', maxWidth: '500px' }}>
            <h3>Ask the AI Tutor</h3>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{ width: '300px', padding: '0.4rem' }}
              placeholder="e.g. What is superposition?"
            />
            <button onClick={sendChat} style={{ marginLeft: '0.5rem' }}>Ask</button>
            {chatReply && <p style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{chatReply}</p>}
          </div>
        </div>
      )}

      {activeModule === 'designer' && (
        <div>
          <h2>2. Quantum Circuit Designer</h2>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Number of Qubits: </strong>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => changeNumQubits(n)}
                style={{
                  marginRight: '0.5rem',
                  fontWeight: numQubits === n ? 'bold' : 'normal',
                  backgroundColor: numQubits === n ? '#8884d8' : '#eee'
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Drag a gate onto the circuit below:</strong>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div draggable onDragStart={(e) => handleDragStart(e, 'h')} style={gateChipStyle}>H</div>
              <div draggable onDragStart={(e) => handleDragStart(e, 'x')} style={gateChipStyle}>X</div>
              <div draggable onDragStart={(e) => handleDragStart(e, 'z')} style={gateChipStyle}>Z</div>
              <div draggable onDragStart={(e) => handleDragStart(e, 'cnot')} style={gateChipStyle}>CNOT</div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            {Array.from({ length: numQubits }).map((_, q) => (
              <div key={q} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ width: '40px', fontWeight: 'bold' }}>q{q}:</div>
                <div style={{ display: 'flex', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: 0, right: 0, height: '2px',
                    backgroundColor: '#333', zIndex: 0
                  }} />
                  {Array.from({ length: NUM_COLUMNS }).map((_, c) => {
                    const cell = grid[cellKey(q, c)];
                    return (
                      <div
                        key={c}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, q, c)}
                        onClick={() => handleCellClick(q, c)}
                        style={{
                          width: '50px', height: '50px', border: '1px solid #ccc',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: cell ? '#8884d8' : '#fff', color: cell ? '#fff' : '#000',
                          fontWeight: 'bold', fontSize: '1.2rem', cursor: cell ? 'pointer' : 'default',
                          zIndex: 1, marginRight: '2px'
                        }}
                        title={cell ? 'Click to remove' : 'Drop a gate here'}
                      >
                        {gateSymbol(cell)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button onClick={clearCircuit} style={{ marginRight: '0.5rem' }}>Clear Circuit</button>
          <button onClick={runCircuit} style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}>Run Simulation</button>
          <button onClick={runBloch} style={{ padding: '0.5rem 1rem' }}>Show Bloch Spheres</button>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            View results in the "Simulation Engine" and "Visualization" modules.
          </p>

          <div style={{ marginTop: '1.5rem' }}>
            <h3>Generated Qiskit Code</h3>
            <SyntaxHighlighter language="python" style={vs}>
              {buildQiskitCode()}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {activeModule === 'simulation' && (
        <div>
          <h2>3. Multi-Framework Simulation Engine</h2>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Backend: Qiskit Aer simulator (prototype scope; architecture supports adding PennyLane/Cirq/qBraid backends).</p>

          <h3>Preset Algorithm Demos</h3>
          <button onClick={runGrover} style={{ marginRight: '0.5rem' }}>Run Grover's Algorithm</button>
          <button onClick={() => runDeutschJozsa(true)} style={{ marginRight: '0.5rem' }}>Run Deutsch-Jozsa (Constant)</button>
          <button onClick={() => runDeutschJozsa(false)}>Run Deutsch-Jozsa (Balanced)</button>

          {result && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Execution Result (raw counts):</h3>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {activeModule === 'visualization' && (
        <div>
          <h2>4. Quantum State & Result Visualization</h2>

          {result && result.counts && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Measurement Histogram:</h3>
              <BarChart width={400} height={300} data={Object.entries(result.counts).map(([k, v]) => ({ state: k, count: v }))}>
                <XAxis dataKey="state" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </div>
          )}

          {blochData && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Bloch Sphere View (X-Z plane):</h3>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {blochData.map((bv) => {
                  const size = 160;
                  const center = size / 2;
                  const radius = size / 2 - 10;
                  const px = center + bv.x * radius;
                  const pz = center - bv.z * radius;
                  return (
                    <div key={bv.qubit} style={{ textAlign: 'center' }}>
                      <svg width={size} height={size}>
                        <circle cx={center} cy={center} r={radius} fill="none" stroke="#999" strokeWidth="1" />
                        <line x1={center} y1={10} x2={center} y2={size - 10} stroke="#ccc" strokeWidth="1" />
                        <line x1={10} y1={center} x2={size - 10} y2={center} stroke="#ccc" strokeWidth="1" />
                        <text x={center} y={5} fontSize="10" textAnchor="middle">|0⟩</text>
                        <text x={center} y={size - 2} fontSize="10" textAnchor="middle">|1⟩</text>
                        <line x1={center} y1={center} x2={px} y2={pz} stroke="#8884d8" strokeWidth="2" markerEnd="url(#arrowhead)" />
                        <circle cx={px} cy={pz} r="4" fill="#8884d8" />
                        <defs>
                          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <polygon points="0 0, 6 3, 0 6" fill="#8884d8" />
                          </marker>
                        </defs>
                      </svg>
                      <div><strong>Qubit {bv.qubit}</strong></div>
                      <div style={{ fontSize: '0.85rem' }}>
                        x: {bv.x.toFixed(2)}, y: {bv.y.toFixed(2)}, z: {bv.z.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

                   <div style={{ marginTop: '1rem' }}>
            <h3>Circuit Diagram:</h3>
            {renderCircuitDiagram()}
          </div>

          {!result && !blochData && (
            <p style={{ color: '#666' }}>Run a simulation or show Bloch spheres from the Circuit Designer or Simulation Engine modules to see results here.</p>
          )}
        </div>
      )}

      {activeModule === 'assessment' && (
        <div>
          <h2>5. Assessment & Progress Tracking</h2>
          <div style={{ border: '1px solid #ccc', padding: '1rem', maxWidth: '500px' }}>
            <h3>Quantum Concepts Quiz</h3>
            {!quizDone ? (
              <div>
                <p><strong>Question {quizIndex + 1} of {quizQuestions.length}</strong></p>
                <p>{quizQuestions[quizIndex].question}</p>
                {quizQuestions[quizIndex].options.map((opt, i) => {
                  let bgColor = '#fff';
                  if (quizAnswered) {
                    if (i === quizQuestions[quizIndex].correct) bgColor = '#c8f7c5';
                    else if (i === selectedOption) bgColor = '#f7c5c5';
                  }
                  return (
                    <div
                      key={i}
                      onClick={() => submitAnswer(i)}
                      style={{
                        padding: '0.5rem', margin: '0.3rem 0', border: '1px solid #ccc',
                        borderRadius: '4px', cursor: quizAnswered ? 'default' : 'pointer',
                        backgroundColor: bgColor
                      }}
                    >
                      {opt}
                    </div>
                  );
                })}
                {quizAnswered && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>{quizQuestions[quizIndex].explanation}</p>
                    <button onClick={nextQuestion}>
                      {quizIndex + 1 < quizQuestions.length ? 'Next Question' : 'See Score'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p><strong>Quiz complete! Score: {quizScore} / {quizQuestions.length}</strong></p>
                <button onClick={restartQuiz}>Retake Quiz</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeModule === 'platform' && (
        <div>
          <h2>6. Software Platform (Web Application)</h2>
          <p><strong>Frontend:</strong> React (drag-and-drop circuit designer, data visualization via Recharts and custom SVG)</p>
          <p><strong>Backend:</strong> Flask (Python), Qiskit Aer for quantum circuit simulation</p>
          <p><strong>AI Integration:</strong> Google Gemini API for the AI tutor chatbot</p>
          <p><strong>Deployment status:</strong> Local development prototype. Architecture is deployment-ready — Flask backend can be containerized and hosted (e.g., Render, Railway), React frontend can be built and served statically (e.g., Vercel, Netlify).</p>
          <p><strong>Not yet implemented:</strong> User authentication, cloud deployment, multi-framework backend support beyond Qiskit.</p>
        </div>
      )}
    </div>
  );
}

export default App;