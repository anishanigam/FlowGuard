
import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL;

const initialForm = {
  name: "Rahul",
  age: 25,
  monthlyIncome: 60000,
  creditScore: 780,
  loanAmount: 300000
};

function App() {
  const [form, setForm] = useState(initialForm);
  const [requestId, setRequestId] = useState(
    () => `LOAN-${Date.now()}`
  );
  const [executions, setExecutions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadExecutions() {
  try {
    const response = await fetch(`${API}/workflows`);
    const result = await response.json();

    if (result.success) {
      setExecutions(result.data);

      // Automatically display the latest execution
      setSelected(previous =>
        previous || result.data[0] || null
      );
    }
  } catch {
    setError("Cannot connect to the backend. Is it running?");
  }
}

  useEffect(() => {
    loadExecutions();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm(previous => ({
      ...previous,
      [name]:
        name === "name" ? value : Number(value)
    }));
  }

  async function submitApplication(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/workflows/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requestId,
          ...form
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Workflow execution failed"
        );
      }

      setSelected(result.data);

      setNotice(
        result.idempotentReplay
          ? "Duplicate request detected. Existing execution returned."
          : "Application processed successfully."
      );

      await loadExecutions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startNewRequest() {
    setForm(initialForm);
    setRequestId(`LOAN-${Date.now()}`);
    setSelected(null);
    setError("");
    setNotice("");
  }

  function statusClass(status) {
    if (status === "APPROVED") return "approved";
    if (status === "REJECTED") return "rejected";
    if (status === "MANUAL_REVIEW") return "review";
    return "pending";
  }

  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">F</div>
          <div>
            <h2>FlowGuard</h2>
            <span>Decision Platform</span>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>
        <div className="nav-item active">◈ Dashboard</div>
        <div className="nav-item">▤ Workflow Executions</div>

        <div className="sidebar-bottom">
          <div className="online-dot" />
          Backend connection
          <strong>API configured</strong>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">WORKFLOW MANAGEMENT</div>
            <h1>Decision Dashboard</h1>
            <p>Configure, execute and monitor business decisions.</p>
          </div>
          <button className="secondary-btn" onClick={startNewRequest}>
            + New application
          </button>
        </header>

        <section className="stats">
          <div className="stat-card">
            <span>Total executions</span>
            <strong>{executions.length}</strong>
          </div>
          <div className="stat-card">
            <span>Approved</span>
            <strong>
              {executions.filter(x => x.status === "APPROVED").length}
            </strong>
          </div>
          <div className="stat-card">
            <span>Rejected</span>
            <strong>
              {executions.filter(x => x.status === "REJECTED").length}
            </strong>
          </div>
          <div className="stat-card">
            <span>Manual review</span>
            <strong>
              {executions.filter(x => x.status === "MANUAL_REVIEW").length}
            </strong>
          </div>
        </section>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        <section className="content-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Loan application</h2>
                <p>Enter applicant details to execute the workflow.</p>
              </div>
              <span className="version-tag">WORKFLOW V1</span>
            </div>

            <form onSubmit={submitApplication}>
              <label>Request ID</label>
              <input
                value={requestId}
                onChange={e => setRequestId(e.target.value)}
                required
                minLength={8}
              />

              <label>Applicant name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                minLength={2}
              />

              <div className="form-row">
                <div>
                  <label>Age</label>
                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label>Credit score</label>
                  <input
                    type="number"
                    name="creditScore"
                    value={form.creditScore}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <label>Monthly income (₹)</label>
              <input
                type="number"
                name="monthlyIncome"
                value={form.monthlyIncome}
                onChange={handleChange}
                required
              />

              <label>Loan amount (₹)</label>
              <input
                type="number"
                name="loanAmount"
                value={form.loanAmount}
                onChange={handleChange}
                required
              />

              <button
                className="primary-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? "Processing..." : "Execute workflow →"}
              </button>
            </form>
          </div>

          <div className="panel result-panel">
            <div className="panel-heading">
              <div>
                <h2>Decision result</h2>
                <p>Workflow evaluation and explanation.</p>
              </div>
            </div>

            {!selected ? (
              <div className="empty-state">
                <div className="empty-icon">◎</div>
                <h3>No execution selected</h3>
                <p>Submit an application to view its decision and audit trail.</p>
              </div>
            ) : (
              <>
                <div className="decision-box">
                  <span>FINAL DECISION</span>
                  <h2 className={statusClass(selected.status)}>
                    {selected.status?.replace("_", " ")}
                  </h2>
                  <p>Request ID: {selected.requestId}</p>
                </div>

                <div className="result-metrics">
                  <div>
                    <span>Retries</span>
                    <strong>{selected.retryCount}</strong>
                  </div>
                  <div>
                    <span>Rule checks</span>
                    <strong>{selected.ruleTrace?.length || 0}</strong>
                  </div>
                </div>

                <h3 className="subheading">Rule evaluation</h3>

                {selected.ruleTrace?.length ? (
                  selected.ruleTrace.map(rule => (
                    <div className="rule-row" key={rule.ruleId}>
                      <div>
                        <strong>{rule.ruleName}</strong>
                        <p>
                          Actual: {String(rule.actualValue ?? "N/A")}
                          {" · "}
                          Expected: {String(rule.expectedValue ?? "N/A")}
                          {" · "}
                          {rule.operator}
                        </p>
                        <small>{rule.reason}</small>
                      </div>
                      <span className={rule.passed ? "pass-tag" : "fail-tag"}>
                        {rule.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted">No rule trace available.</p>
                )}

                <h3 className="subheading">Execution history</h3>

                <div className="timeline">
                  {selected.history?.map((item, index) => (
                    <div className="timeline-item" key={index}>
                      <div className="timeline-dot" />
                      <div>
                        <strong>{item.event}</strong>
                        <p>{formatDate(item.timestamp)}</p>
                        {item.details?.reason && (
                          <small>{item.details.reason}</small>
                        )}
                        {item.details?.error && (
                          <small>{item.details.error}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="panel executions-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent executions</h2>
              <p>Latest workflow requests stored in MongoDB.</p>
            </div>
            <button className="text-btn" onClick={loadExecutions}>
              Refresh ↻
            </button>
          </div>

          {executions.length === 0 ? (
            <p className="muted">No executions yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Applicant</th>
                    <th>Decision</th>
                    <th>Retries</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map(item => (
                    <tr key={item._id}>
                      <td>{item.requestId}</td>
                      <td>{item.input?.name}</td>
                      <td>
                        <span className={`status-tag ${statusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.retryCount}</td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        <button
                          className="text-btn"
                          onClick={() => setSelected(item)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer>FlowGuard · Configurable Workflow Decision Platform</footer>
      </main>
    </div>
  );
}

export default App;
