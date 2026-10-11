import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownToLine, ArrowRight, BadgeCheck, Bot, Boxes, Check, ChevronDown,
  CircleAlert, ClipboardCheck, Clock3, FileCheck2, Fingerprint, LayoutDashboard,
  LockKeyhole, Menu, Plus, Search, Shield, ShieldCheck, ShieldX, SlidersHorizontal,
  Sparkles, X,
} from 'lucide-react'
import { initialAgents, resources } from './data/mockData.js'
import { calculateTrustScore, evaluateAccess, getCredentialStatus, getTrustBreakdown } from './utils/trust.js'
import { loadWorkspace, persistWorkspace } from './utils/storage.js'

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agents', label: 'Agent management', icon: Bot },
  { id: 'credentials', label: 'Credential verification', icon: FileCheck2 },
  { id: 'access', label: 'Trust & access checker', icon: ShieldCheck },
  { id: 'audit', label: 'Audit logs', icon: Activity },
]

const pageMeta = {
  dashboard: ['Overview', 'Identity assurance, at a glance'],
  agents: ['Agent management', 'Register and review trusted identities'],
  credentials: ['Credential verification', 'Issuer, expiry, and revocation status'],
  access: ['Trust & access checker', 'Evaluate a request against live policy'],
  audit: ['Audit logs', 'A traceable record of every access decision'],
}

const dateLabel = (date, options = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Intl.DateTimeFormat('en-US', options).format(new Date(date))

function App() {
  const [workspace, setWorkspace] = useState(() => loadWorkspace(initialAgents))
  const [page, setPage] = useState('dashboard')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    persistWorkspace(workspace.agents, workspace.logs)
  }, [workspace])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const agents = workspace.agents
  const logs = workspace.logs

  function addAgent(agent) {
    setWorkspace((current) => ({ ...current, agents: [agent, ...current.agents] }))
    setRegisterOpen(false)
    setToast(`${agent.name} registered successfully`)
  }

  function addLog(log) {
    setWorkspace((current) => ({ ...current, logs: [log, ...current.logs] }))
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-symbol"><Fingerprint size={21} strokeWidth={2.1} /></div>
          <div><span className="brand-name">veritrust<span>AI</span></span><span className="brand-caption">IDENTITY CONTROL PLANE</span></div>
          <button className="icon-button mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-chip"><span className="workspace-dot" />Demo workspace <ChevronDown size={13} /></div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'nav-item-active' : ''}`} onClick={() => { setPage(id); setMobileNavOpen(false) }}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{id === 'audit' && logs.length > 0 && <span className="nav-count">{logs.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="environment-card"><span className="environment-icon"><LockKeyhole size={15} /></span><div><strong>Local environment</strong><span>Mock data · no chain connection</span></div><span className="live-dot" /></div>
          <div className="user-profile"><div className="user-avatar">VT</div><div><strong>Workspace Admin</strong><span>Security operator</span></div><ChevronDown size={15} className="profile-chevron" /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="breadcrumb"><span>VeriTrust AI</span><span className="crumb-slash">/</span><strong>{pageMeta[page][0]}</strong></div>
          <div className="topbar-right"><span className="environment-tag"><span className="live-dot" />DEMO MODE</span><span className="topbar-date">{dateLabel(new Date(), { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
        </header>
        <div className="page-content">
          <div className="page-heading"><div><p className="eyebrow">IDENTITY ASSURANCE <span className="eyebrow-rule" /></p><h1>{pageMeta[page][0]}</h1><p className="page-subtitle">{pageMeta[page][1]}</p></div>
            {page === 'agents' && <button className="button button-primary" onClick={() => setRegisterOpen(true)}><Plus size={16} /> Register agent</button>}
            {page === 'access' && <span className="policy-sync"><span className="live-dot" />Policies active</span>}
          </div>

          {page === 'dashboard' && <Dashboard agents={agents} logs={logs} onNavigate={setPage} />}
          {page === 'agents' && <AgentManagement agents={agents} onRegister={() => setRegisterOpen(true)} />}
          {page === 'credentials' && <CredentialVerification agents={agents} />}
          {page === 'access' && <AccessChecker agents={agents} onDecision={addLog} />}
          {page === 'audit' && <AuditLogs agents={agents} logs={logs} />}

          <footer className="page-footer"><span>VERITRUST AI <span className="footer-sep">/</span> PROTOTYPE</span><span>Local demo data · Prepared for future API integration</span></footer>
        </div>
      </main>

      {registerOpen && <RegisterAgentModal onClose={() => setRegisterOpen(false)} onRegister={addAgent} />}
      {toast && <div className="toast"><span className="toast-check"><Check size={14} /></span>{toast}</div>}
    </div>
  )
}

function Dashboard({ agents, logs, onNavigate }) {
  const validCount = agents.filter((agent) => getCredentialStatus(agent.credential) === 'Valid').length
  const averageTrust = agents.length ? Math.round(agents.reduce((total, agent) => total + calculateTrustScore(agent), 0) / agents.length) : 0
  const allowCount = logs.filter((log) => log.decision === 'Allow').length
  const denyCount = logs.filter((log) => log.decision === 'Deny').length

  return <>
    <div className="metric-grid">
      <MetricCard icon={Bot} label="Registered agents" value={agents.length} detail="Identities in this workspace" tone="blue" />
      <MetricCard icon={BadgeCheck} label="Valid credentials" value={`${validCount} / ${agents.length}`} detail={`${agents.length - validCount} need attention`} tone="teal" />
      <MetricCard icon={Sparkles} label="Average trust score" value={averageTrust} suffix="/ 100" detail="Across registered agents" tone="violet" />
      <MetricCard icon={ClipboardCheck} label="Access decisions" value={logs.length} detail={`${allowCount} allowed · ${denyCount} denied`} tone="amber" />
    </div>

    <div className="dashboard-grid">
      <section className="panel trust-panel">
        <div className="panel-header"><div><h2>Agent trust profile</h2><p>Composite score by registered identity</p></div><button className="text-button" onClick={() => onNavigate('agents')}>All agents <ArrowRight size={14} /></button></div>
        <div className="trust-list">{agents.slice(0, 5).map((agent, index) => <TrustRow key={agent.id} agent={agent} index={index} />)}</div>
        <div className="score-legend"><span><i className="legend-dot legend-high" />80–100 Strong</span><span><i className="legend-dot legend-mid" />60–79 Moderate</span><span><i className="legend-dot legend-low" />0–59 Limited</span></div>
      </section>
      <section className="panel posture-panel">
        <div className="panel-header"><div><h2>Security posture</h2><p>Current identity controls</p></div><div className="posture-icon"><Shield size={18} /></div></div>
        <div className="posture-score"><div className="posture-ring"><span>{agents.length ? Math.round((validCount / agents.length) * 100) : 0}<small>%</small></span></div><div><strong>Credential coverage</strong><span>Valid credentials across agents</span></div></div>
        <div className="posture-divider" />
        <PostureLine label="Identity records" value={`${agents.length} registered`} icon={Fingerprint} />
        <PostureLine label="Policy checks" value="3 active policies" icon={SlidersHorizontal} />
        <PostureLine label="Decision history" value={`${logs.length} recorded`} icon={Clock3} />
        <button className="button button-outline posture-button" onClick={() => onNavigate('access')}><ShieldCheck size={15} /> Run access check</button>
      </section>
    </div>

    <section className="panel recent-panel">
      <div className="panel-header"><div><h2>Recent access decisions</h2><p>Latest policy evaluations in this workspace</p></div><button className="text-button" onClick={() => onNavigate('audit')}>View audit log <ArrowRight size={14} /></button></div>
      {logs.length ? <DecisionTable logs={logs.slice(0, 5)} agents={agents} /> : <EmptyState icon={ClipboardCheck} title="No access decisions yet" text="Run an access check to see decisions recorded here." action="Open access checker" onAction={() => onNavigate('access')} />}
    </section>
  </>
}

function MetricCard({ icon: Icon, label, value, suffix, detail, tone }) {
  return <section className="metric-card"><div className={`metric-icon metric-${tone}`}><Icon size={17} strokeWidth={1.8} /></div><span className="metric-label">{label}</span><div className="metric-value">{value}<small>{suffix}</small></div><span className="metric-detail">{detail}</span></section>
}

function TrustRow({ agent, index }) {
  const score = calculateTrustScore(agent)
  const credentialStatus = getCredentialStatus(agent.credential)
  return <div className="trust-row"><span className="trust-rank">{String(index + 1).padStart(2, '0')}</span><div className={`agent-avatar avatar-${index % 4}`}>{agent.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="trust-agent"><strong>{agent.name}</strong><span>{agent.owner}</span></div><div className="trust-bar"><div className={`trust-fill ${score < 60 ? 'fill-low' : score < 80 ? 'fill-mid' : ''}`} style={{ width: `${score}%` }} /></div><span className={`trust-score ${score < 60 ? 'score-low' : ''}`}>{score}<small>/100</small></span><StatusBadge status={credentialStatus} /></div>
}

function PostureLine({ label, value, icon: Icon }) {
  return <div className="posture-line"><span className="posture-line-icon"><Icon size={15} /></span><span>{label}</span><strong>{value}</strong></div>
}

function AgentManagement({ agents, onRegister }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const filtered = agents.filter((agent) => {
    const status = getCredentialStatus(agent.credential)
    const matchesText = `${agent.name} ${agent.did} ${agent.owner}`.toLowerCase().includes(search.toLowerCase())
    return matchesText && (statusFilter === 'All statuses' || status === statusFilter)
  })
  return <>
    <div className="toolbar"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agents, DIDs, owners" /></label><label className="select-filter"><SlidersHorizontal size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Valid</option><option>Expired</option><option>Revoked</option></select><ChevronDown size={14} /></label><span className="result-count">{filtered.length} {filtered.length === 1 ? 'agent' : 'agents'}</span><button className="button button-primary toolbar-add" onClick={onRegister}><Plus size={16} /> Register agent</button></div>
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>AGENT IDENTITY</th><th>OWNER</th><th>TRUST SCORE</th><th>CREDENTIAL</th><th>REGISTERED</th></tr></thead><tbody>{filtered.map((agent, index) => <tr key={agent.id}><td><div className="table-agent"><div className={`agent-avatar avatar-${index % 4}`}>{agent.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{agent.name}</strong><span className="mono-cell">{agent.did}</span></div></div></td><td>{agent.owner}</td><td><TrustPill score={calculateTrustScore(agent)} /></td><td><StatusBadge status={getCredentialStatus(agent.credential)} /></td><td>{dateLabel(agent.createdAt)}</td></tr>)}</tbody></table>{filtered.length === 0 && <EmptyState icon={Search} title="No matching agents" text="Try a different name, DID, or credential status." />}</div></section>
    <div className="integration-note"><div className="integration-note-icon"><Boxes size={17} /></div><div><strong>Identity records are stored locally</strong><span>Agent DIDs in this prototype are sample identifiers. Connect a DID method and credential issuer when moving to a live environment.</span></div><span className="note-tag">PROTOTYPE</span></div>
  </>
}

function CredentialVerification({ agents }) {
  const [filter, setFilter] = useState('All statuses')
  const [search, setSearch] = useState('')
  const filtered = agents.filter((agent) => {
    const status = getCredentialStatus(agent.credential)
    const matchesSearch = `${agent.name} ${agent.credential.issuer} ${agent.credential.credentialId}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (filter === 'All statuses' || status === filter)
  })
  const counts = ['Valid', 'Expired', 'Revoked'].map((status) => ({ status, count: agents.filter((agent) => getCredentialStatus(agent.credential) === status).length }))
  return <>
    <div className="credential-summary">{counts.map(({ status, count }) => <div className="credential-count" key={status}><StatusBadge status={status} /><strong>{count}</strong><span>{status.toLowerCase()} credential{count === 1 ? '' : 's'}</span></div>)}</div>
    <div className="toolbar"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agent, issuer, or credential ID" /></label><label className="select-filter"><SlidersHorizontal size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All statuses</option><option>Valid</option><option>Expired</option><option>Revoked</option></select><ChevronDown size={14} /></label><span className="result-count">{filtered.length} credentials</span></div>
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>SUBJECT</th><th>CREDENTIAL ISSUER</th><th>CREDENTIAL ID</th><th>EXPIRY DATE</th><th>STATUS</th></tr></thead><tbody>{filtered.map((agent, index) => <tr key={agent.id}><td><div className="table-agent"><div className={`agent-avatar avatar-${index % 4}`}>{agent.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{agent.name}</strong><span className="mono-cell">{agent.did}</span></div></div></td><td>{agent.credential.issuer}</td><td className="mono-cell">{agent.credential.credentialId}</td><td>{dateLabel(agent.credential.expiresAt)}</td><td><StatusBadge status={getCredentialStatus(agent.credential)} /></td></tr>)}</tbody></table>{filtered.length === 0 && <EmptyState icon={Search} title="No credentials found" text="Adjust your search or status filter." />}</div></section>
    <div className="verification-callout"><div className="callout-icon"><CircleAlert size={17} /></div><p><strong>Verification is simulated.</strong> Status is derived from each credential's expiry date and revocation flag. A production verifier should validate issuer signatures and revocation registries.</p></div>
  </>
}

function AccessChecker({ agents, onDecision }) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '')
  const [resourceId, setResourceId] = useState(resources[0].id)
  const [result, setResult] = useState(null)
  const agent = agents.find((item) => item.id === agentId)
  const resource = resources.find((item) => item.id === resourceId)
  const breakdown = agent ? getTrustBreakdown(agent) : []

  function runCheck(event) {
    event.preventDefault()
    if (!agent || !resource) return
    const evaluation = evaluateAccess(agent, resource)
    const log = {
      id: `decision-${Date.now()}`,
      agentId: agent.id,
      resourceId: resource.id,
      resourceName: resource.name,
      decision: evaluation.decision,
      reason: evaluation.reasons.join(' '),
      trustScore: evaluation.trustScore,
      timestamp: new Date().toISOString(),
    }
    setResult({ ...evaluation, agent, resource, timestamp: log.timestamp })
    onDecision(log)
  }

  return <div className="access-layout">
    <div className="access-main">
      <form className="panel access-form" onSubmit={runCheck}>
        <div className="form-panel-heading"><div className="step-number">01</div><div><h2>Configure access request</h2><p>Select an identity and protected resource to evaluate.</p></div></div>
        <label className="field-label" htmlFor="agent-select">AI AGENT IDENTITY</label>
        <div className="field-select-wrap"><Bot size={16} /><select id="agent-select" value={agentId} onChange={(event) => { setAgentId(event.target.value); setResult(null) }}>{agents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></div>
        <label className="field-label field-label-spaced" htmlFor="resource-select">REQUESTED RESOURCE</label>
        <div className="field-select-wrap"><Boxes size={16} /><select id="resource-select" value={resourceId} onChange={(event) => { setResourceId(event.target.value); setResult(null) }}>{resources.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.classification}</option>)}</select><ChevronDown size={15} /></div>
        <div className="request-summary"><div><span>REQUIRED TRUST</span><strong>{resource?.minTrust} <small>/ 100</small></strong></div><div><span>REQUIRED CAPABILITY</span><strong className="capability-code">{resource?.requiredCapability}</strong></div></div>
        <button className="button button-primary evaluate-button" type="submit"><ShieldCheck size={16} /> Evaluate access request <ArrowRight size={15} /></button>
      </form>
      <section className="panel policy-panel"><div className="panel-header"><div><h2>Resource policy</h2><p>Requirements evaluated for this request</p></div><span className="policy-live"><span className="live-dot" />ACTIVE</span></div><div className="policy-details"><div><span>RESOURCE</span><strong>{resource?.name}</strong></div><div><span>CLASSIFICATION</span><strong>{resource?.classification}</strong></div><div><span>POLICY RULE</span><strong>{resource?.policy}</strong></div></div></section>
    </div>
    <div className="access-side">
      {result ? <DecisionResult result={result} /> : <section className="panel decision-placeholder"><div className="placeholder-seal"><ShieldCheck size={25} /></div><p className="eyebrow">DECISION OUTPUT</p><h2>Ready to evaluate</h2><p>Choose an agent and resource, then run the check to see a policy decision with its reasoning.</p><div className="placeholder-steps"><span><i>1</i> Identity credential</span><span><i>2</i> Trust threshold</span><span><i>3</i> Resource policy</span></div></section>}
      {agent && <section className="panel factor-panel"><div className="panel-header"><div><h2>Trust score</h2><p>{agent.name}</p></div><span className={`factor-total ${calculateTrustScore(agent) < 60 ? 'score-low' : ''}`}>{calculateTrustScore(agent)}<small>/100</small></span></div><div className="factor-list">{breakdown.map((factor) => <div className="factor-item" key={factor.label}><div className="factor-label"><span>{factor.label}</span><strong>{factor.score}<small>/{factor.max}</small></strong></div><div className="factor-track"><div style={{ width: `${(factor.score / factor.max) * 100}%` }} /></div></div>)}</div><div className="factor-note"><Sparkles size={14} /> Identity, credential, history &amp; behaviour</div></section>}
    </div>
  </div>
}

function DecisionResult({ result }) {
  const allowed = result.decision === 'Allow'
  const Icon = allowed ? ShieldCheck : ShieldX
  return <section className={`panel decision-result ${allowed ? 'decision-allow' : 'decision-deny'}`}>
    <div className={`decision-icon ${allowed ? 'decision-icon-allow' : 'decision-icon-deny'}`}><Icon size={22} /></div>
    <span className={`decision-kicker ${allowed ? 'kicker-allow' : 'kicker-deny'}`}>ACCESS DECISION</span>
    <h2>{result.decision}</h2>
    <p className="decision-target">{result.agent.name}<ArrowRight size={13} />{result.resource.name}</p>
    <div className="decision-divider" />
    <span className="reason-heading">{allowed ? 'POLICY REQUIREMENTS MET' : 'REASON FOR DENIAL'}</span>
    <ul className="reason-list">{result.reasons.map((reason) => <li key={reason}><span>{allowed ? <Check size={12} /> : <CircleAlert size={12} />}</span>{reason}</li>)}</ul>
    <div className="decision-meta"><span>Trust score<strong>{result.trustScore} / 100</strong></span><span>Credential<strong>{result.credentialStatus}</strong></span></div>
    <span className="logged-indicator"><Check size={12} /> Decision recorded in audit log</span>
  </section>
}

function AuditLogs({ agents, logs }) {
  const [outcome, setOutcome] = useState('All outcomes')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const filtered = logs.filter((log) => {
    const agentName = agents.find((agent) => agent.id === log.agentId)?.name ?? ''
    const matchesOutcome = outcome === 'All outcomes' || log.decision === outcome
    const matchesSearch = `${agentName} ${log.resourceName} ${log.reason}`.toLowerCase().includes(search.toLowerCase())
    const matchesDate = !fromDate || new Date(log.timestamp) >= new Date(`${fromDate}T00:00:00`)
    return matchesOutcome && matchesSearch && matchesDate
  })
  const allowed = logs.filter((log) => log.decision === 'Allow').length
  return <>
    <div className="audit-summary"><div><span className="audit-summary-icon"><Activity size={16} /></span><span>Total decisions</span><strong>{logs.length}</strong></div><div><span className="audit-summary-icon audit-allow-icon"><Check size={16} /></span><span>Allowed</span><strong>{allowed}</strong></div><div><span className="audit-summary-icon audit-deny-icon"><ShieldX size={16} /></span><span>Denied</span><strong>{logs.length - allowed}</strong></div><div><span className="audit-summary-icon audit-retention-icon"><Clock3 size={16} /></span><span>Storage</span><strong className="audit-storage">Local only</strong></div></div>
    <div className="toolbar"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agent, resource, or reason" /></label><label className="select-filter"><SlidersHorizontal size={15} /><select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option>All outcomes</option><option>Allow</option><option>Deny</option></select><ChevronDown size={14} /></label><label className="date-filter"><span>FROM</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><span className="result-count">{filtered.length} events</span></div>
    <section className="panel table-panel audit-table-panel"><div className="table-scroll"><table><thead><tr><th>DECISION</th><th>AGENT</th><th>RESOURCE</th><th>TRUST</th><th>REASON</th><th>TIMESTAMP</th></tr></thead><tbody>{filtered.map((log) => { const agent = agents.find((item) => item.id === log.agentId); return <tr key={log.id}><td><DecisionBadge decision={log.decision} /></td><td><strong className="audit-agent-name">{agent?.name ?? 'Removed agent'}</strong></td><td>{log.resourceName}</td><td><TrustPill score={log.trustScore} /></td><td className="reason-cell" title={log.reason}>{log.reason}</td><td><span className="audit-date">{dateLabel(log.timestamp, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></td></tr> })}</tbody></table>{filtered.length === 0 && <EmptyState icon={ClipboardCheck} title={logs.length ? 'No matching decisions' : 'Audit log is empty'} text={logs.length ? 'Adjust the filters to view other decisions.' : 'Access checks will be recorded here automatically.'} />}</div></section>
    <div className="audit-footnote"><LockKeyhole size={14} /> Audit records are kept in this browser's local storage and can be cleared by resetting site data.</div>
  </>
}

function DecisionTable({ logs, agents }) {
  return <div className="table-scroll"><table><thead><tr><th>OUTCOME</th><th>AGENT</th><th>RESOURCE</th><th>TRUST SCORE</th><th>TIME</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td><DecisionBadge decision={log.decision} /></td><td><strong className="audit-agent-name">{agents.find((agent) => agent.id === log.agentId)?.name ?? 'Removed agent'}</strong></td><td>{log.resourceName}</td><td><TrustPill score={log.trustScore} /></td><td>{dateLabel(log.timestamp, { hour: 'numeric', minute: '2-digit' })}</td></tr>)}</tbody></table></div>
}

function RegisterAgentModal({ onClose, onRegister }) {
  const [form, setForm] = useState({ name: '', owner: '', purpose: '', issuer: '', expiresAt: '' })
  const [error, setError] = useState('')
  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); setError('') }
  function submit(event) {
    event.preventDefault()
    if (new Date(`${form.expiresAt}T23:59:59`) < new Date()) { setError('Choose a future credential expiry date.'); return }
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 14) || 'agent'
    const suffix = Math.random().toString(36).slice(2, 5)
    const id = `agent-${Date.now()}`
    onRegister({
      id,
      name: form.name.trim(),
      did: `did:web:veritrust.dev:agents:${slug}-${suffix}`,
      owner: form.owner.trim(),
      purpose: form.purpose.trim(),
      capabilities: ['knowledge.read'],
      credential: { issuer: form.issuer.trim(), expiresAt: form.expiresAt, revoked: false, credentialId: `VC-DEMO-${Date.now().toString().slice(-6)}` },
      factors: { identity: 24, history: 12, behavior: 14 },
      createdAt: new Date().toISOString(),
    })
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="register-modal" role="dialog" aria-modal="true" aria-labelledby="register-title"><div className="modal-header"><div><span className="eyebrow">IDENTITY REGISTRY</span><h2 id="register-title">Register AI agent</h2><p>Create a demo identity and credential record.</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div><form onSubmit={submit}>
    <label className="modal-field"><span>AGENT NAME</span><input autoFocus required maxLength={60} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Research Assistant" /></label>
    <label className="modal-field"><span>OWNER / ORGANIZATION</span><input required maxLength={80} value={form.owner} onChange={(event) => update('owner', event.target.value)} placeholder="e.g. Northstar Labs" /></label>
    <label className="modal-field"><span>INTENDED PURPOSE</span><input required maxLength={100} value={form.purpose} onChange={(event) => update('purpose', event.target.value)} placeholder="What will this agent do?" /></label>
    <div className="modal-fields-row"><label className="modal-field"><span>CREDENTIAL ISSUER</span><input required maxLength={80} value={form.issuer} onChange={(event) => update('issuer', event.target.value)} placeholder="e.g. Organization Trust" /></label><label className="modal-field"><span>EXPIRY DATE</span><input required type="date" value={form.expiresAt} onChange={(event) => update('expiresAt', event.target.value)} /></label></div>
    {error && <p className="form-error"><CircleAlert size={14} />{error}</p>}
    <div className="did-preview"><Fingerprint size={15} /><span>A sample DID will be assigned on registration</span></div>
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary"><Plus size={15} /> Register agent</button></div>
  </form></section></div>
}

function StatusBadge({ status }) {
  const className = status === 'Valid' ? 'status-valid' : status === 'Expired' ? 'status-expired' : 'status-revoked'
  return <span className={`status-badge ${className}`}><i />{status}</span>
}

function DecisionBadge({ decision }) {
  const allowed = decision === 'Allow'
  return <span className={`decision-badge ${allowed ? 'decision-badge-allow' : 'decision-badge-deny'}`}>{allowed ? <Check size={12} /> : <ShieldX size={12} />}{decision}</span>
}

function TrustPill({ score }) {
  return <span className={`trust-pill ${score < 60 ? 'trust-pill-low' : score < 80 ? 'trust-pill-mid' : ''}`}><i />{score}</span>
}

function EmptyState({ icon: Icon, title, text, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={19} /></span><strong>{title}</strong><p>{text}</p>{action && <button className="text-button" onClick={onAction}>{action} <ArrowRight size={14} /></button>}</div>
}

export default App