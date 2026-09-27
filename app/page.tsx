'use client';

import { useEffect, useRef, useState } from 'react';
import { Archive, Bell, BriefcaseBusiness, Check, ChevronDown, Clock3, ExternalLink, LayoutDashboard, Plus, Settings2, Sparkles, Trash2, X } from 'lucide-react';

type Status = 'NOT_REQUESTED' | 'REQUESTED' | 'RECEIVED';
type Job = {
  id: string;
  title: string;
  company: string;
  companyLinkedinUrl?: string;
  companyLogoUrl?: string;
  source: string;
  location: string;
  url: string;
  linkedinUrl?: string;
  createdAt: string;
  jobDate: string;
  status: Status;
  requestedAt?: string;
  receivedAt?: string;
  nextFollowUpAt?: string;
  applyDirectAt?: string;
  applySentAt?: string;
};

type Settings = { followUpHours: number; applyDirectHours: number; timezone?: string };
type AuthUser = { id: string; email: string; name: string; timezone?: string };



const today = (timezone?: string) => {
  const timeZone = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const year = parts.find(part => part.type === 'year')?.value ?? '2024';
  const month = parts.find(part => part.type === 'month')?.value ?? '01';
  const day = parts.find(part => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
};
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const formatTime = (value?: string, timezone?: string) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone }) : '';
const formatDate = (value: string) => new Date(`${value}T12:00:00.000Z`).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const formatWeekday = (value: string) => new Date(`${value}T12:00:00.000Z`).toLocaleDateString([], { weekday: 'long', timeZone: 'UTC' });
const isDue = (job: Job) => job.status === 'REQUESTED' && !!job.nextFollowUpAt && new Date(job.nextFollowUpAt) <= new Date();
function mapApiJob(record: any): Job { return { id: record.id, title: record.title, company: record.company?.name ?? record.company, companyLinkedinUrl: record.company?.linkedinUrl, companyLogoUrl: record.company?.logoUrl, source: record.source, location: record.location ?? '', url: record.jobUrl, linkedinUrl: record.company?.linkedinUrl, createdAt: record.createdAt, jobDate: typeof record.jobDate === 'string' ? record.jobDate.slice(0, 10) : new Date(record.jobDate).toISOString().slice(0, 10), status: record.referralStatus, requestedAt: record.referralRequestedAt, receivedAt: record.referralReceivedAt, nextFollowUpAt: record.nextFollowUpAt, applyDirectAt: record.applyDirectNotificationAt, applySentAt: record.applyDirectNotificationSentAt }; }

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<Settings>({ followUpHours: 3, applyDirectHours: 6 });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeView, setActiveView] = useState<'today' | 'archive'>('today');
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notice, setNotice] = useState('');
  const browserNotificationIds = useRef(new Set<string>());

  useEffect(() => { const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; fetch(`${API_URL}/auth/me`, { credentials: 'include', headers: { 'X-Timezone': timezone } }).then(response => response.ok ? response.json() : null).then(user => { setAuthUser(user); setAuthChecked(true); }).catch(() => setAuthChecked(true)); }, []);
  useEffect(() => {
    if (!authUser) return;
    const loadJobs = async () => {
      try {
        const [todayResponse, archiveResponse, settingsResponse] = await Promise.all([fetch(`${API_URL}/jobs?view=today`, { credentials: 'include' }), fetch(`${API_URL}/jobs?view=archive`, { credentials: 'include' }), fetch(`${API_URL}/settings`, { credentials: 'include' })]);
        if (!todayResponse.ok || !archiveResponse.ok || !settingsResponse.ok) throw new Error('API unavailable');
        const [todayRecords, archiveRecords, backendSettings] = await Promise.all([todayResponse.json(), archiveResponse.json(), settingsResponse.json()]);
          setJobs([...todayRecords, ...archiveRecords].map(mapApiJob));
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setSettings({ ...backendSettings, timezone: authUser.timezone ?? backendSettings?.timezone ?? browserTimezone });
      } catch { setNotice('Backend unavailable. Start the API with npm run dev:api.'); }
    };
    loadJobs();
    window.addEventListener('focus', loadJobs);
    return () => window.removeEventListener('focus', loadJobs);
  }, [authUser]);
  useEffect(() => { if (!authUser) return; const pollNotifications = async () => { const response = await fetch(`${API_URL}/notifications`, { credentials: 'include' }); if (!response.ok) return; const notifications = await response.json(); if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return; const now = Date.now(); notifications.filter((item: { id: string; scheduledAt: string; sentAt?: string; status: string }) => (item.status === 'SCHEDULED' && new Date(item.scheduledAt).getTime() <= now) || (item.status === 'SENT' && item.sentAt && now - new Date(item.sentAt).getTime() < 60000)).forEach((item: { id: string; type: string; job: { title: string; company: { name: string } } }) => { if (browserNotificationIds.current.has(item.id)) return; browserNotificationIds.current.add(item.id); new Notification(item.type === 'APPLY_DIRECTLY' ? 'Consider applying directly' : 'Referral follow-up', { body: `${item.job.title} at ${item.job.company.name}`, tag: item.id }); }); }; pollNotifications(); const interval = window.setInterval(pollNotifications, 30000); return () => window.clearInterval(interval); }, [authUser]);

  const currentDate = today(settings.timezone);
  const todayJobs = jobs.filter(job => job.jobDate === currentDate);
  const archivedJobs = jobs.filter(job => job.jobDate < currentDate);
  const counts = {
    total: todayJobs.length,
    needed: todayJobs.filter(job => job.status === 'NOT_REQUESTED').length,
    waiting: todayJobs.filter(job => job.status === 'REQUESTED').length,
    due: todayJobs.filter(isDue).length,
    received: todayJobs.filter(job => job.status === 'RECEIVED').length
  };
  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.job-list .job-card'));
    todayJobs.forEach((job, index) => {
      const logo = cards[index]?.querySelector<HTMLElement>('.company-logo');
      if (!logo || !job.companyLogoUrl || logo.querySelector('img')) return;
      const fallback = job.company.slice(0, 1);
      const image = document.createElement('img');
      image.alt = '';
      image.src = job.companyLogoUrl;
      image.onerror = () => { logo.textContent = fallback; };
      logo.textContent = '';
      logo.appendChild(image);
    });
  }, [jobs]);

  async function changeStatus(id: string, nextStatus: Status) {
    const previousJobs = jobs;
    const optimisticAt = new Date().toISOString();
    setJobs(current => current.map(job => job.id !== id ? job : nextStatus === 'REQUESTED' ? { ...job, status: 'REQUESTED', requestedAt: optimisticAt, nextFollowUpAt: undefined, applyDirectAt: undefined } : { ...job, status: 'RECEIVED', receivedAt: optimisticAt, nextFollowUpAt: undefined, applyDirectAt: undefined }));
    const response = await fetch(nextStatus === 'NOT_REQUESTED' ? `${API_URL}/jobs/${id}/status` : `${API_URL}/jobs/${id}/referral/${nextStatus === 'RECEIVED' ? 'received' : 'request'}`, { method: nextStatus === 'NOT_REQUESTED' ? 'PATCH' : 'POST', credentials: 'include', headers: nextStatus === 'NOT_REQUESTED' ? { 'Content-Type': 'application/json' } : undefined, body: nextStatus === 'NOT_REQUESTED' ? JSON.stringify({ status: nextStatus }) : undefined });
    if (!response.ok) { setJobs(previousJobs); setNotice('The backend rejected this status change.'); return; }
    const updated = mapApiJob(await response.json());
    setJobs(current => current.map(job => job.id === id ? updated : job));
    setNotice(nextStatus === 'REQUESTED' ? 'Referral request tracked. Reminders stop at midnight.' : nextStatus === 'RECEIVED' ? 'Referral received. Future reminders cancelled.' : 'Status reset. Reminder schedule cleared.');
  }

  function requestReferral(job: Job) {
    void changeStatus(job.id, 'REQUESTED');
    let peopleUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(job.company)}`;
    if (job.companyLinkedinUrl) {
      try {
        const companyUrl = new URL(job.companyLinkedinUrl);
        if (!companyUrl.hostname.endsWith('linkedin.com')) throw new Error('Not a LinkedIn URL');
        const companyPath = companyUrl.pathname.replace(/\/$/, '');
        peopleUrl = `${companyUrl.origin}${companyPath.endsWith('/people') ? companyPath : `${companyPath}/people`}/`;
      } catch { peopleUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(job.company)}`; }
    }
    window.open(peopleUrl, '_blank', 'noopener,noreferrer');
  }

  async function addJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const jobUrl = String(form.get('url'));
    const logoUrl = (() => { try { return `https://www.google.com/s2/favicons?domain=${new URL(jobUrl).hostname}&sz=64`; } catch { return undefined; } })();
    const response = await fetch(`${API_URL}/jobs`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: String(form.get('title')), company: String(form.get('company')), source: String(form.get('source')), location: String(form.get('location')), jobUrl, linkedinUrl: String(form.get('linkedinUrl') || '') || undefined, logoUrl }) });
    if (!response.ok) { setNotice('The backend could not add this opportunity.'); return; }
    const created = mapApiJob(await response.json());
    setJobs(current => [created, ...current]);
    setShowAdd(false);
    setNotice('Opportunity added to today.');
  }

  async function markApplySent(id: string) {
    const response = await fetch(`${API_URL}/jobs/${id}/apply-direct/handled`, { method: 'POST', credentials: 'include' });
    if (!response.ok) { setNotice('The backend could not update this notification.'); return; }
    const updated = mapApiJob(await response.json());
    setJobs(current => current.map(job => job.id === id ? updated : job));
    setNotice('Apply-directly reminder marked as handled.');
  }

  async function removeJob(id: string) {
    const response = await fetch(`${API_URL}/jobs/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) { setNotice('The backend could not remove this opportunity.'); return; }
    setJobs(current => current.filter(job => job.id !== id));
    setNotice('Opportunity removed from the queue.');
  }

  async function logout() { await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); setAuthUser(null); setJobs([]); }

  async function toggleNotifications() { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); setShowNotifications(!showNotifications); }

  if (!authChecked) return <div className="auth-loading">Loading Referral First...</div>;
  if (!authUser) return <AuthScreen onAuthenticated={setAuthUser} />;

  async function saveSettings() {
    const payload = { ...settings, timezone: settings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone };
    const response = await fetch(`${API_URL}/settings`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setNotice(response.ok ? 'Reminder settings saved.' : 'The backend could not save settings.');
    if (response.ok) {
      setSettings(payload);
      setShowSettings(false);
    }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo" src="/logo.svg" alt="" /><span>Referral First</span></div>
      <nav className="nav-list">
        <button className={activeView === 'today' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('today')}><LayoutDashboard size={17} /> Today <span className="nav-count">{counts.total}</span></button>
        <button className={activeView === 'archive' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('archive')}><Archive size={17} /> Archive</button>
      </nav>
      <div className="sidebar-bottom"><div className="day-note"><span className="pulse" /> Reminders end at midnight</div><button className="nav-item" onClick={() => setShowSettings(true)}><Settings2 size={17} /> Settings</button><div className="profile"><div className="avatar">{authUser.name.slice(0, 2).toUpperCase()}</div><div><strong>{authUser.name}</strong><span>{authUser.email}</span></div><button className="logout-button" onClick={logout}>Log out</button></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><p className="eyebrow">{activeView === 'today' ? 'Daily command center' : 'Your history'}</p><h1>{activeView === 'today' ? 'Today’s opportunities' : 'Archive'}</h1></div><div className="top-actions"><div className="notification-wrap"><button className="icon-button" aria-label="Notifications" onClick={toggleNotifications}><Bell size={18} />{todayJobs.some(job => isDue(job) || (job.status === 'REQUESTED' && !!job.applyDirectAt && !job.applySentAt && new Date(job.applyDirectAt) <= new Date())) && <span className="notification-dot" />}</button>{showNotifications && <NotificationPanel jobs={todayJobs} onMarkApplySent={markApplySent} />}</div><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17} /> Track opportunity</button></div></header>
      {notice && <div className="notice"><Check size={16} /> {notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
      {activeView === 'today' ? <>
        <div className="date-row"><div><span className="date-label">{formatWeekday(currentDate)}</span><span className="date-value">{formatDate(currentDate)}</span></div><span className="timezone">Local time · {settings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>
        <section className="summary-grid"><SummaryCard label="Tracked today" value={counts.total} icon={<BriefcaseBusiness />} tone="ink" /><SummaryCard label="Referral needed" value={counts.needed} icon={<Sparkles />} tone="coral" /><SummaryCard label="Waiting for referral" value={counts.waiting} icon={<Clock3 />} tone="gold" /><SummaryCard label="Follow-up due" value={counts.due} icon={<Bell />} tone="mint" /></section>
        <div className="section-heading"><div><h2>Action queue</h2><p>The next best action for every opportunity you found today.</p></div></div>
        <div className="job-list">{todayJobs.map(job => <JobCard key={job.id} job={job} timezone={settings.timezone} onRequest={() => requestReferral(job)} onReceive={() => { if (window.confirm('Mark this referral as received? Future reminders will be cancelled.')) changeStatus(job.id, 'RECEIVED'); }} onRemove={() => { if (window.confirm('Remove this opportunity from your queue?')) removeJob(job.id); }} />)}{todayJobs.length === 0 && <EmptyState onAdd={() => setShowAdd(true)} />}</div>
      </> : <ArchiveView jobs={archivedJobs} timezone={settings.timezone} />}
    </section>
    {showAdd && <Modal title="Track an opportunity" onClose={() => setShowAdd(false)}><form className="job-form" onSubmit={addJob}><label>Job title<input name="title" placeholder="e.g. Backend Engineer" required /></label><label>Company<input name="company" placeholder="e.g. Acme Technologies" required /></label><div className="form-row"><label>Source<select name="source"><option>LinkedIn</option><option>Company site</option><option>Indeed</option><option>Wellfound</option><option>Other</option></select></label><label>Location<input name="location" placeholder="Remote or city" /></label></div><label>Job URL<input name="url" type="url" placeholder="https://..." required /></label><label>Company LinkedIn URL <span className="optional-label">(optional)</span><input name="linkedinUrl" type="url" placeholder="https://linkedin.com/company/..." /></label><button className="primary-button form-submit"><Plus size={17} /> Add to today</button></form></Modal>}
    {showSettings && <Modal title="Reminder settings" onClose={() => setShowSettings(false)}><div className="settings-form"><p>Reminders are only scheduled if they fit before your local midnight.</p><label>Follow-up interval <div className="input-suffix"><input type="number" min="0.1" step="0.1" value={settings.followUpHours} onChange={event => setSettings({ ...settings, followUpHours: Number(event.target.value) })} /><span>hours</span></div></label><label>Apply directly after <div className="input-suffix"><input type="number" min="0.1" step="0.1" value={settings.applyDirectHours} onChange={event => setSettings({ ...settings, applyDirectHours: Number(event.target.value) })} /><span>hours</span></div></label><button className="primary-button form-submit" onClick={saveSettings}>Save settings</button></div></Modal>}
  </main>;
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) { return <div className={`summary-card ${tone}`}><div className="summary-icon">{icon}</div><strong>{value}</strong><span>{label}</span></div>; }
function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) { const [mode, setMode] = useState<'login' | 'register'>('login'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(''); const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; const response = await fetch(`${API_URL}/auth/${mode}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, timezone, ...(mode === 'register' ? { name } : {}) }) }); const result = await response.json().catch(() => ({})); setBusy(false); if (!response.ok) { setError(result.error ?? 'Could not authenticate'); return; } onAuthenticated({ ...result, timezone: result.timezone ?? timezone }); } return <main className="auth-shell"><div className="auth-card"><div className="brand"><img className="brand-logo" src="/logo.svg" alt="" /><span>Referral First</span></div><p className="eyebrow">Your referral command center</p><h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1><p className="auth-copy">Keep your job opportunities and reminders private to your account.</p><form className="job-form" onSubmit={submit}>{mode === 'register' && <label>Name<input value={name} onChange={event => setName(event.target.value)} required /></label>}<label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label><label>Password<input type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /></label>{error && <p className="auth-error">{error}</p>}<button className="primary-button form-submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Register'}</button></form><button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}</button></div></main>; }
function JobCard({ job, timezone, onRequest, onReceive, onRemove }: { job: Job; timezone?: string; onRequest: () => void; onReceive: () => void; onRemove: () => void }) { const due = isDue(job); const statusLabel = job.status === 'NOT_REQUESTED' ? 'Referral needed' : job.status === 'RECEIVED' ? 'Referral received' : due ? 'Follow-up due' : 'Waiting for referral'; return <article className={`job-card ${job.status.toLowerCase()} ${due ? 'due' : ''}`}><div className="job-main"><div className="company-logo">{job.company.slice(0, 1)}</div><div className="job-copy"><div className="job-title-row"><h3>{job.title}</h3><a href={job.url} target="_blank" rel="noreferrer" aria-label="Open job"><ExternalLink size={16} /></a></div><p className="company-name">{job.company} <span>·</span> {job.location}</p><div className="job-meta"><span>{job.source}</span><span>Added {formatTime(job.createdAt, timezone)}</span>{job.companyLinkedinUrl && <a href={job.companyLinkedinUrl} target="_blank" rel="noreferrer">Company LinkedIn</a>}</div></div></div><div className="job-action"><span className={`status-pill ${job.status.toLowerCase()} ${due ? 'due-pill' : ''}`}><span className="status-dot" />{statusLabel}</span>{job.status === 'NOT_REQUESTED' && <button className="secondary-button" onClick={onRequest}>Find referral on LinkedIn <span>→</span></button>}{job.status === 'REQUESTED' && <><span className="next-reminder">{job.nextFollowUpAt ? `Next reminder ${formatTime(job.nextFollowUpAt, timezone)}` : 'No more reminders today'}</span><button className="receive-button" onClick={onReceive}><Check size={15} /> Mark referral received</button></>} {job.status === 'RECEIVED' && <span className="received-time">Received {formatTime(job.receivedAt, timezone)}</span>}<button className="remove-button" onClick={onRemove} aria-label={`Remove ${job.title}`} title="Remove from queue"><Trash2 size={14} /> Remove</button></div></article>; }
function NotificationPanel({ jobs, onMarkApplySent }: { jobs: Job[]; onMarkApplySent: (id: string) => void }) { const dueJobs = jobs.filter(job => isDue(job)); const applyJobs = jobs.filter(job => job.status === 'REQUESTED' && !!job.applyDirectAt && !job.applySentAt && new Date(job.applyDirectAt) <= new Date()); return <div className="notification-panel"><div className="notification-panel-header"><strong>Notifications</strong><span>{dueJobs.length + applyJobs.length}</span></div>{dueJobs.map(job => <div className="notification-item" key={`follow-${job.id}`}><span className="notification-icon follow"><Bell size={14} /></span><div><strong>Follow up with {job.company}</strong><span>{job.title} · due now</span></div></div>)}{applyJobs.map(job => <div className="notification-item" key={`apply-${job.id}`}><span className="notification-icon apply"><BriefcaseBusiness size={14} /></span><div><strong>Consider applying directly</strong><span>{job.title} · {job.company}</span><button className="notification-action" onClick={() => onMarkApplySent(job.id)}>Mark handled</button></div></div>)}{!dueJobs.length && !applyJobs.length && <div className="notification-empty">You’re all caught up for today.</div>}</div>; }
function ArchiveView({ jobs, timezone }: { jobs: Job[]; timezone?: string }) { const grouped = jobs.reduce<Record<string, Job[]>>((groups, job) => ({ ...groups, [job.jobDate]: [...(groups[job.jobDate] || []), job] }), {}); return <div className="archive-list">{Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, dateJobs]) => <section key={date} className="archive-group"><div className="archive-heading"><h2>{formatDate(date)}</h2><span>{dateJobs.length} opportunities</span></div>{dateJobs.map(job => <article className="archive-row" key={job.id}><div><strong>{job.title}</strong><span>{job.company} · {job.source}</span></div><span className={`status-pill ${job.status.toLowerCase()}`}><span className="status-dot" />{job.status === 'RECEIVED' ? 'Referral received' : job.status === 'REQUESTED' ? 'Referral requested' : 'Referral needed'}</span><span className="archive-time">Added {formatTime(job.createdAt, timezone)}</span></article>)}</section>)}{jobs.length === 0 && <div className="empty-archive"><Archive size={30} /><h2>Nothing in the archive yet</h2><p>Yesterday’s opportunities will appear here.</p></div>}</div>; }
function EmptyState({ onAdd }: { onAdd: () => void }) { return <div className="empty-archive"><Sparkles size={30} /><h2>Your queue is clear</h2><p>Track a promising job before it slips away.</p><button className="primary-button" onClick={onAdd}><Plus size={17} /> Track opportunity</button></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="modal"><div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</div></div>; }
