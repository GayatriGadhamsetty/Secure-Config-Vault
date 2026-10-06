import { useEffect, useMemo, useState, type FormEvent, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CalendarClock, Check, CheckCheck, ChevronDown, CircleHelp, Clock3, Compass,
  FileCheck2, FolderKanban, Gauge, GraduationCap, Layers3,
  LogOut, Menu, MessageCircle, Plus, Search, Settings2, ShieldCheck, Sparkles,
  Star, UserRound, UsersRound, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  createActiveProject, createApplication, createDemoProject, createProject,
  createReview, deleteDemoProject, deleteProject, getProfile, listActiveProjects,
  listApplications, listCalls, listDemoProjects, listMessages, listNotifications,
  listProfiles, listProjects, listReviews, requestCall, saveProfile, sendMessage,
  updateApplicationStatus, updateCall, updateProject,
  type ActiveProject, type Application, type CallRequest, type DemoProject,
  type Message, type Profile, type Project, type Review, type Role,
} from '@/lib/data';
import {
  useAnalyzeProjectHealth, useGenerateProjectBrief, useGenerateSkillGapPlan,
  useHealthCheck, useScoreProjectMatch,
} from '@workspace/api-client-react';
import type { ProjectHealthInput, ProjectBriefInput, SkillGapInput, MatchInput } from '@workspace/api-client-react';

const queryClient = new QueryClient();
const cx = (...items: Array<string | false | null | undefined>) => items.filter(Boolean).join(' ');
const dateLabel = (d?: string | null) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled';
const money = (n?: number | null) => n == null ? '—' : `$${n.toLocaleString()}`;
const split = (text: string) => text.split(',').map((v) => v.trim()).filter(Boolean);

function Button({ children, onClick, kind = 'primary', type = 'button', disabled = false, className = '' }: {
  children: ReactNode; onClick?: () => void; kind?: 'primary' | 'outline' | 'quiet' | 'danger'; type?: 'button' | 'submit'; disabled?: boolean; className?: string;
}) {
  return <button data-testid="button-action" type={type} onClick={onClick} disabled={disabled} className={cx('btn', `btn-${kind}`, className)}>{children}</button>;
}
function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <label className="field-label">{label}<input data-testid={`input-${(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="field" {...props} /></label>;
}
function Textarea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return <label className="field-label">{label}<textarea data-testid={`input-${(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="field field-area" {...props} /></label>;
}
function Select({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="field-label">{label}<select className="field" {...props}>{children}</select></label>;
}
function Badge({ children, tone = 'soft' }: { children: ReactNode; tone?: 'soft' | 'green' | 'amber' | 'slate' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
function Avatar({ name, size = 'md' }: { name?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`avatar avatar-${size}`} aria-label={name || 'Member'}>{(name || 'FM').split(/\s+/).slice(0, 2).map((n) => n[0]).join('').toUpperCase()}</span>;
}
function Empty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-mark"><Layers3 size={21} /></div><h3>{title}</h3><p>{detail}</p>{action}</div>;
}
function Skeleton({ lines = 3 }: { lines?: number }) {
  return <div className="skeleton-wrap" aria-label="Loading">{Array.from({ length: lines }).map((_, i) => <span key={i} className="skeleton-line" />)}</div>;
}
function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' | 'info' }) {
  return <div role="status" className={`alert alert-${tone}`}>{children}</div>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Landing() {
  return <main className="landing">
    <nav className="landing-nav"><Link href="/" className="brand"><span className="brand-symbol"><Layers3 size={19} /></span>Freelance<span>Match</span></Link><div className="landing-links"><a href="#how">How it works</a><a href="#trust">Built for better work</a><Link href="/login" className="login-link">Log in</Link><Link href="/register" className="nav-cta">Create an account <ArrowRight size={15} /></Link></div></nav>
    <section className="hero quiet-grid">
      <div className="hero-copy fade-up"><div className="eyebrow"><span className="eyebrow-dot" />Work that fits, from the start</div><h1>Find the right person<br />for <em>this</em> project.</h1><p className="hero-lede">A more thoughtful way to match independent talent with the work they’re uniquely good at. Clear expectations, verified skills, and a safer way to get started.</p><div className="hero-actions"><Link href="/register" className="btn btn-primary">Find your fit <ArrowRight size={17} /></Link><Link href="/login" className="hero-secondary">I already have an account <ArrowUpRight size={15} /></Link></div><div className="trust-note"><ShieldCheck size={16} /><span>Real profiles. Project-specific fit. No bidding race.</span></div></div>
      <div className="hero-art fade-up" aria-label="Project collaboration illustration"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="match-note"><div className="note-top"><span className="note-icon"><Check size={15} /></span><span>PROJECT FIT</span><span className="note-live">Ready to connect</span></div><div className="match-person"><Avatar name="Maya Chen" size="lg" /><div><strong>Maya Chen</strong><small>Product designer · 8 yrs</small></div><div className="fit-score">94<small>fit</small></div></div><div className="mini-tags"><span>Product strategy</span><span>Figma</span><span>Design systems</span></div><div className="note-foot"><span><ShieldCheck size={14} /> 3 skills verified</span><span>Based on your brief</span></div></div><div className="floating-brief"><span className="brief-icon"><FileCheck2 size={16} /></span><div><small>YOUR PROJECT</small><strong>Make onboarding feel effortless</strong></div><CheckCheck size={18} className="brief-check" /></div><div className="art-caption"><span className="caption-line" />A better first conversation begins here.</div></div>
    </section>
    <section id="how" className="how-section"><div className="section-intro"><div className="eyebrow">A clearer way to collaborate</div><h2>Less guessing.<br /><span>Better work together.</span></h2><p>FreelanceMatch makes the important parts of finding a collaborator visible before the work begins.</p></div><div className="steps-list"><div className="step"><span className="step-no">01</span><div><h3>Start with the project</h3><p>Share the real brief, skills, budget, and outcomes. We help make the scope easier to understand.</p></div><ArrowDownRight size={18} /></div><div className="step"><span className="step-no">02</span><div><h3>See the fit, not just the pitch</h3><p>Compare skills, experience, portfolio work, and verified capabilities in project context.</p></div><ArrowDownRight size={18} /></div><div className="step"><span className="step-no">03</span><div><h3>Build trust before kickoff</h3><p>Talk through the details, agree on next steps, and keep the collaboration attached to the project.</p></div><ArrowDownRight size={18} /></div></div></section>
    <section id="trust" className="trust-band"><div className="trust-visual"><div className="trust-seal"><ShieldCheck size={37} /><span>WORK<br />WITH<br />CLARITY</span></div><div className="trust-orbit-label">Confidence is a process, not a promise.</div></div><div className="trust-copy"><div className="eyebrow">Designed for the human side of work</div><h2>Good work starts<br />with <em>good context.</em></h2><p>Profiles tell part of the story. A project-specific conversation tells you whether the working relationship can be just as strong as the portfolio.</p><ul><li><Check size={16} /> Skills can be verified and made visible</li><li><Check size={16} /> Messages and calls stay tied to a project</li><li><Check size={16} /> AI suggestions are transparent recommendations</li></ul><Link href="/register" className="text-link">Explore the platform <ArrowRight size={16} /></Link></div></section>
    <section className="closing"><div className="closing-kicker">Your next good collaboration</div><h2>Begins with a better match.</h2><Link href="/register" className="btn btn-primary">Get started <ArrowRight size={17} /></Link></section>
    <footer className="landing-footer"><Link href="/" className="brand"><span className="brand-symbol"><Layers3 size={17} /></span>Freelance<span>Match</span></Link><span>Built for independent work, and the people behind it.</span><div><Link href="/login">Log in</Link><Link href="/register">Join FreelanceMatch</Link></div></footer>
  </main>;
}

function AuthPage({ mode, onDone }: { mode: 'login' | 'register'; onDone: () => void }) {
  const [role, setRole] = useState<Role>('freelancer');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setNotice(''); setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '');
    const password = String(fd.get('password') || '');
    try {
      if (mode === 'register') {
        const fullName = String(fd.get('name') || '').trim();
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role } } });
        if (authError) throw authError;
        if (!data.session) { setNotice('Check your email to confirm your account, then sign in.'); setPending(false); return; }
        await saveProfile(data.user!.id, { role, full_name: fullName });
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to complete sign in. Please try again.'); }
    finally { setPending(false); }
  }
  return <main className="auth-page"><Link href="/" className="brand auth-brand"><span className="brand-symbol"><Layers3 size={19} /></span>Freelance<span>Match</span></Link><div className="auth-layout"><div className="auth-aside"><div className="eyebrow">Better work starts here</div><h1>Find your next<br /><em>right fit.</em></h1><p>Bring clarity to how you find, evaluate, and work with independent talent.</p><div className="auth-aside-foot"><ShieldCheck size={18} /> Collaboration grounded in real project context</div></div><section className="auth-card surface"><div className="auth-card-head"><span className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Create your account'}</span><h2>{mode === 'login' ? 'Good to see you.' : 'Let’s get to know you.'}</h2><p>{mode === 'login' ? 'Sign in to pick up where your next collaboration begins.' : 'Choose how you’ll use FreelanceMatch. You can build from there.'}</p></div>
    {mode === 'register' && <div className="role-choice" role="group" aria-label="Choose your role"><button data-testid="role-client" onClick={() => setRole('client')} className={cx(role === 'client' && 'selected')}><BriefcaseBusiness size={18} /><strong>I’m hiring</strong><small>Find a collaborator</small></button><button data-testid="role-freelancer" onClick={() => setRole('freelancer')} className={cx(role === 'freelancer' && 'selected')}><Compass size={18} /><strong>I’m independent</strong><small>Find a project that fits</small></button></div>}
    {error && <Alert>{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}<form className="form-stack" onSubmit={submit}>{mode === 'register' && <Input label="Your name" name="name" placeholder="e.g. Riley Morgan" required /> }<Input label="Email address" type="email" name="email" placeholder="you@studio.com" required /><Input label="Password" type="password" name="password" placeholder="At least 8 characters" minLength={8} required /><Button type="submit" disabled={pending} className="full-width">{pending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></Button></form><div className="auth-switch">{mode === 'login' ? <>New to FreelanceMatch? <Link href="/register">Create an account</Link></> : <>Already have an account? <Link href="/login">Sign in</Link></>}</div></section></div><div className="auth-bottom">Private by design <span /> Made for independent work</div></main>;
}

type WorkspaceData = {
  projects: Project[]; profiles: Profile[]; applications: Application[]; demos: DemoProject[];
  messages: Message[]; calls: CallRequest[]; active: ActiveProject[]; reviews: Review[]; notifications: any[];
};
const emptyData: WorkspaceData = { projects: [], profiles: [], applications: [], demos: [], messages: [], calls: [], active: [], reviews: [], notifications: [] };

function AppWorkspace() {
  const [location, setLocation] = useLocation();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState<WorkspaceData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const routeParts = location.split('?')[0].split('/').filter(Boolean);
  const route = routeParts[0] || 'dashboard';
  const id = routeParts[1];
  const isPublic = location === '/' || location === '/login' || location === '/register';
  const health = useHealthCheck();
  const healthMutation = useAnalyzeProjectHealth();
  const briefMutation = useGenerateProjectBrief();
  const matchMutation = useScoreProjectMatch();
  const skillMutation = useGenerateSkillGapPlan();
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiKind, setAiKind] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: result }) => {
      if (!active) return;
      setSession(result.session);
      if (result.session?.user) {
        try { setProfile(await getProfile(result.session.user.id)); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not load your profile.'); }
      }
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) { setProfile(null); setData(emptyData); }
      else {
        window.setTimeout(() => getProfile(next.user.id).then(setProfile).catch((e) => setError(e.message)), 0);
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!authLoading && !session && location !== '/' && location !== '/login' && location !== '/register') setLocation('/login');
  }, [authLoading, session, location, setLocation]);

  useEffect(() => {
    if (!session?.user || !profile) return;
    setLoading(true); setError('');
    const uid = session.user.id;
    const load = async () => {
      const next = { ...emptyData };
      if (route === 'dashboard' || route === 'projects' || route === 'project' || route === 'applications' || route === 'active' || route === 'feedback' || route === 'freelancer' || route === 'messages') {
        next.projects = route === 'projects' && profile.role === 'freelancer'
          ? await listProjects({ search: query, limit: 50 })
          : await listProjects({ search: query, clientId: profile.role === 'client' ? uid : undefined, includeClosed: true, limit: 50 });
      }
      if (route === 'freelancers' || route === 'freelancer' || route === 'dashboard') next.profiles = await listProfiles({ role: 'freelancer', search: route === 'freelancers' ? query : undefined, limit: 30 });
      if (route === 'applications' || route === 'dashboard' || route === 'project' || route === 'projects') next.applications = await listApplications(profile.role === 'client' && id ? { projectId: id } : profile.role === 'client' ? {} : { freelancerId: uid });
      if (route === 'profile' || route === 'freelancer') next.demos = await listDemoProjects(route === 'freelancer' && id ? id : uid);
      if (route === 'messages' && id) next.messages = await listMessages(id);
      if (route === 'calls') next.calls = await listCalls(uid);
      if (route === 'active' || route === 'dashboard' || route === 'feedback') next.active = await listActiveProjects(uid);
      if (route === 'feedback' || route === 'profile' || route === 'freelancer') next.reviews = await listReviews(route === 'freelancer' && id ? id : uid);
      if (route === 'notifications' || route === 'dashboard') next.notifications = await listNotifications(uid);
      if (activeFlag.current) { setData(next); setLoading(false); }
    };
    let live = true;
    const activeFlag = { current: true };
    load().catch((e) => { if (live) { setError(e instanceof Error ? e.message : 'We could not load this view.'); setLoading(false); } });
    return () => { live = false; activeFlag.current = false; };
  }, [session?.user?.id, profile?.id, profile?.role, location, refresh, query]);

  const refreshData = () => setRefresh((v) => v + 1);
  async function perform(work: () => Promise<unknown>, message: string) {
    setError(''); setNotice('');
    try { await work(); setNotice(message); refreshData(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
  }
  async function logout() { await supabase.auth.signOut(); setLocation('/'); }
  if (location === '/') return <Landing />;
  if (location === '/login' || location === '/register') return <AuthPage mode={location === '/register' ? 'register' : 'login'} onDone={() => setLocation('/dashboard')} />;
  if (authLoading) return <div className="auth-loading"><div className="brand"><span className="brand-symbol"><Layers3 size={18} /></span>Freelance<span>Match</span></div><Skeleton lines={4} /></div>;
  if (!session) return <div className="auth-loading"><Skeleton lines={3} /></div>;
  if (!profile) return <div className="auth-loading"><Alert>{error || 'Your account profile is being prepared. Try loading it again.'}</Alert><Button onClick={() => session?.user && getProfile(session.user.id).then(setProfile).catch((e) => setError(e.message))} kind="outline">Retry profile load</Button></div>;

  const clientNav = [
    { href: '/dashboard', label: 'Overview', icon: Gauge },
    { href: '/projects', label: 'My projects', icon: BriefcaseBusiness },
    { href: '/freelancers', label: 'Find talent', icon: UsersRound },
    { href: '/applications', label: 'Applications', icon: FileCheck2 },
    { href: '/active', label: 'Active work', icon: FolderKanban },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: '/calls', label: 'Calls', icon: CalendarClock },
  ];
  const freelancerNav = [
    { href: '/dashboard', label: 'Overview', icon: Gauge },
    { href: '/projects', label: 'Find projects', icon: Compass },
    { href: '/applications', label: 'My applications', icon: FileCheck2 },
    { href: '/active', label: 'Active work', icon: FolderKanban },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: '/calls', label: 'Calls', icon: CalendarClock },
  ];
  const nav = profile.role === 'client' ? clientNav : freelancerNav;
  const titleMap: Record<string, string> = { dashboard: 'Overview', projects: profile.role === 'client' ? 'My projects' : 'Find projects', project: 'Project details', freelancers: 'Find talent', freelancer: 'Professional profile', applications: profile.role === 'client' ? 'Applications' : 'My applications', messages: 'Project messages', calls: 'Calls & scheduling', active: 'Active projects', feedback: 'Feedback', notifications: 'Notifications', settings: 'Settings', profile: 'My profile' };

  async function runAi(kind: string, payload: any) {
    setError(''); setNotice(''); setAiResult(null); setAiKind(kind);
    try {
      let result;
      if (kind === 'health') result = await healthMutation.mutateAsync({ data: payload as ProjectHealthInput });
      if (kind === 'brief') result = await briefMutation.mutateAsync({ data: payload as ProjectBriefInput });
      if (kind === 'match') result = await matchMutation.mutateAsync({ data: payload as MatchInput });
      if (kind === 'skills') result = await skillMutation.mutateAsync({ data: payload as SkillGapInput });
      setAiResult(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Recommendation unavailable. Please try again.'); }
  }

  return <div className="workspace app-shell">
    <aside className={cx('sidebar', mobileMenu && 'sidebar-open')}><Link href="/dashboard" className="brand sidebar-brand"><span className="brand-symbol"><Layers3 size={18} /></span>Freelance<span>Match</span></Link><div className="workspace-switch"><div className="workspace-avatar">{profile.role === 'client' ? <BriefcaseBusiness size={17} /> : <Compass size={17} />}</div><div><small>WORKSPACE</small><strong>{profile.role === 'client' ? 'Client space' : 'Freelancer space'}</strong></div><ChevronDown size={15} /></div><div className="side-caption">WORKSPACE</div><nav className="side-nav">{nav.map((item) => { const Icon = item.icon; const active = location === item.href || (item.href === '/projects' && route === 'project'); return <Link key={item.href} href={item.href} className={cx('side-link', active && 'side-active')} onClick={() => setMobileMenu(false)}><Icon size={17} /><span>{item.label}</span>{item.label === 'Messages' && <span className="nav-dot" />}</Link>; })}</nav><div className="side-caption side-lower">YOUR SPACE</div><nav className="side-nav"><Link href="/profile" className={cx('side-link', route === 'profile' && 'side-active')}><UserRound size={17} /><span>My profile</span></Link><Link href="/feedback" className={cx('side-link', route === 'feedback' && 'side-active')}><Star size={17} /><span>Feedback</span></Link><Link href="/notifications" className={cx('side-link', route === 'notifications' && 'side-active')}><Bell size={17} /><span>Notifications</span>{data.notifications.length > 0 && <span className="nav-count">{data.notifications.length}</span>}</Link><Link href="/settings" className={cx('side-link', route === 'settings' && 'side-active')}><Settings2 size={17} /><span>Settings</span></Link></nav><div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><CircleHelp size={17} /></span><strong>Need a hand?</strong><p>Your next step should feel clear.</p><button onClick={() => setLocation('/settings')}>Visit help & settings <ArrowRight size={13} /></button></div><button className="user-menu" onClick={() => setLocation('/profile')}><Avatar name={profile.full_name} size="sm" /><span><strong>{profile.full_name}</strong><small>{profile.role === 'client' ? 'Client account' : 'Independent professional'}</small></span><ChevronDown size={15} /></button></div></aside>
    {mobileMenu && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <div className="workspace-main"><header className="topbar"><button className="mobile-menu-btn" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation"><Menu size={20} /></button><div className="crumb">Workspace <span>/</span> <strong>{titleMap[route] || 'Workspace'}</strong></div><div className="top-actions"><Link href="/notifications" className="top-icon" aria-label="Notifications"><Bell size={18} />{data.notifications.length > 0 && <i />}</Link><div className="top-divider" /><button className="top-profile" onClick={() => setLocation('/profile')}><Avatar name={profile.full_name} size="sm" /><span>{profile.full_name.split(' ')[0]}</span><ChevronDown size={14} /></button><button className="logout-button" title="Sign out" onClick={logout}><LogOut size={17} /></button></div></header><main className="page-content">
      {(error || notice) && <div className="flash-stack">{error && <Alert>{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}</div>}
      {loading ? <div className="page-skeleton"><Skeleton lines={6} /></div> : <PageContent route={route} id={id} profile={profile} data={data} query={query} setQuery={setQuery} perform={perform} setLocation={setLocation} runAi={runAi} aiResult={aiResult} aiKind={aiKind} aiBusy={healthMutation.isPending || briefMutation.isPending || matchMutation.isPending || skillMutation.isPending} health={health} refreshData={refreshData} />}
    </main><footer className="workspace-footer"><span>FreelanceMatch</span><span>Clearer collaboration, from first fit to final feedback.</span><Link href="/settings">Settings</Link></footer></div>
  </div>;
}

function PageContent({ route, id, profile, data, query, setQuery, perform, setLocation, runAi, aiResult, aiKind, aiBusy, health, refreshData }: {
  route: string; id?: string; profile: Profile; data: WorkspaceData; query: string; setQuery: (v: string) => void;
  perform: (work: () => Promise<unknown>, message: string) => Promise<void>; setLocation: (v: string) => void;
  runAi: (kind: string, payload: any) => Promise<void>; aiResult: any; aiKind: string; aiBusy: boolean; health: any; refreshData: () => void;
}) {
  const [filter, setFilter] = useState('all');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const project = data.projects.find((p) => p.id === id);
  const appRows = data.applications;
  const activeRows = data.active;
  const myProjects = data.projects;
  const profileHref = (uid: string) => `/freelancers/${uid}`;
  const head = (eyebrow: string, title: string, subtitle?: string, action?: ReactNode) => <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>;
  const searchBox = <div className="search-box"><Search size={17} /><input aria-label="Search" placeholder="Search by title, name or skill…" value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>⌘ K</kbd></div>;
  const statusTone = (status: string): 'soft' | 'green' | 'amber' | 'slate' => status === 'accepted' || status === 'completed' || status === 'in_progress' ? 'green' : status === 'pending' || status === 'requested' || status === 'open' ? 'amber' : 'slate';
  const projectCard = (p: Project) => <article className="project-card surface" key={p.id}><div className="project-card-top"><div className="badge-pair"><Badge tone={statusTone(p.status)}>{p.status.replace('_', ' ')}</Badge>{p.is_demo && <Badge tone="slate">Demo record</Badge>}</div><span className="small-meta">{p.project_type || 'Project'}</span></div><Link href={`/projects/${p.id}`} className="project-title-link"><h3>{p.title}</h3></Link><p className="project-desc">{p.description}</p><div className="tag-row">{p.required_skills.slice(0, 4).map((s) => <span className="skill-tag" key={s}>{s}</span>)}{p.required_skills.length > 4 && <span className="skill-tag">+{p.required_skills.length - 4}</span>}</div><div className="project-card-foot"><span><strong>{money(p.budget_min)}–{money(p.budget_max)}</strong><small>budget</small></span><span><strong>{dateLabel(p.deadline)}</strong><small>target date</small></span><Link href={`/projects/${p.id}`} className="round-arrow" aria-label="Open project"><ArrowUpRight size={17} /></Link></div></article>;
  const profileCard = (p: Profile) => <article className="talent-card surface" key={p.id}><div className="talent-card-head"><Avatar name={p.full_name} size="lg" /><div className="talent-rating">{p.average_rating > 0 ? <><Star size={13} fill="currentColor" /> {p.average_rating.toFixed(1)}</> : <span>New profile</span>}</div></div><Link href={profileHref(p.id)} className="talent-name"><h3>{p.full_name}</h3></Link><p className="talent-headline">{p.headline || 'Independent professional'}</p><p className="talent-bio">{p.bio || 'This professional is building their profile.'}</p><div className="tag-row">{p.skills.slice(0, 4).map((s) => <span className="skill-tag" key={s}>{s}</span>)}</div><div className="talent-card-foot"><span>{p.experience_years} years experience</span><span>{p.hourly_rate ? `${money(p.hourly_rate)}/hr` : 'Rate on request'}</span></div><Link href={profileHref(p.id)} className="text-link">View profile <ArrowRight size={14} /></Link></article>;

  if (route === 'dashboard') {
    const openCount = myProjects.filter((p) => p.status === 'open').length;
    const working = activeRows.filter((p) => p.status === 'in_progress').length;
    return <div className="fade-up">{head('Your workspace', `Good to see you, ${profile.full_name.split(' ')[0]}.`, profile.role === 'client' ? 'Here’s what’s moving across your projects.' : 'A clear view of your search and current collaborations.', <Link href={profile.role === 'client' ? '/projects/new' : '/projects'} className="btn btn-primary">{profile.role === 'client' ? <><Plus size={16} /> New project</> : <>Explore projects <ArrowRight size={16} /></>}</Link>)}
      <div className="welcome-strip"><div className="welcome-emblem"><Sparkles size={22} /></div><div><span className="eyebrow">{profile.role === 'client' ? 'MAKE YOUR NEXT PROJECT COUNT' : 'YOUR NEXT PROJECT IS OUT THERE'}</span><h2>{profile.role === 'client' ? 'A thoughtful brief attracts the right people.' : 'A good fit is more than a list of skills.'}</h2><p>{profile.role === 'client' ? 'Start with clear outcomes and the right collaborator becomes easier to find.' : 'Show the work you’re proud of and find projects where your strengths matter.'}</p></div><Link href={profile.role === 'client' ? '/projects/new' : '/profile'} className="welcome-link">{profile.role === 'client' ? 'Create a project' : 'Complete your profile'} <ArrowRight size={15} /></Link></div>
      <div className="stat-grid"><div className="stat-card surface"><span>Open projects</span><strong>{profile.role === 'client' ? openCount : data.projects.length}</strong><small><BriefcaseBusiness size={14} /> {profile.role === 'client' ? 'Currently accepting applications' : 'Available to explore'}</small></div><div className="stat-card surface"><span>Applications</span><strong>{appRows.length}</strong><small><FileCheck2 size={14} /> {appRows.filter((a) => a.status === 'pending').length} awaiting a decision</small></div><div className="stat-card surface"><span>Active collaborations</span><strong>{working}</strong><small><Activity size={14} /> {working ? 'Work in progress' : 'Ready when you are'}</small></div><div className="stat-card surface"><span>Unread updates</span><strong>{data.notifications.length}</strong><small><Bell size={14} /> Recent account activity</small></div></div>
      <div className="dashboard-columns"><section className="panel surface"><div className="panel-heading"><div><span className="eyebrow">IN MOTION</span><h2>{profile.role === 'client' ? 'Your projects' : 'Recently posted'}</h2></div><Link href="/projects" className="text-link">See all <ArrowRight size={14} /></Link></div>{myProjects.length ? <div className="compact-list">{myProjects.slice(0, 4).map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="compact-row"><span className="row-icon"><BriefcaseBusiness size={16} /></span><span className="row-copy"><strong>{p.title}</strong><small>{profile.role === 'client' ? `${appRows.filter((a) => a.project_id === p.id).length} applications` : p.project_type}</small></span><Badge tone={statusTone(p.status)}>{p.status.replace('_', ' ')}</Badge><ArrowRight size={15} /></Link>)}</div> : <Empty title="Nothing on the board yet" detail={profile.role === 'client' ? 'Create a project to begin meeting the right people.' : 'Browse open opportunities that fit your skills.'} action={<Link className="text-link" href={profile.role === 'client' ? '/projects/new' : '/projects'}>Take the first step <ArrowRight size={14} /></Link>} />}</section>
      <section className="panel surface"><div className="panel-heading"><div><span className="eyebrow">GOOD PEOPLE, GOOD WORK</span><h2>{profile.role === 'client' ? 'A few professionals' : 'Your next step'}</h2></div>{profile.role === 'client' && <Link href="/freelancers" className="text-link">Explore talent <ArrowRight size={14} /></Link>}</div>{profile.role === 'client' ? data.profiles.slice(0, 3).map((p) => <Link href={profileHref(p.id)} key={p.id} className="mini-person"><Avatar name={p.full_name} size="sm" /><span><strong>{p.full_name}</strong><small>{p.headline}</small></span><ArrowUpRight size={15} /></Link>) : <div className="next-step"><span className="next-step-icon"><UserRound size={19} /></span><div><strong>Make your experience easy to see.</strong><p>A clear profile and a few demo projects help clients understand how you work.</p><Link href="/profile" className="text-link">Review your profile <ArrowRight size={14} /></Link></div></div>}</section></div>
    </div>;
  }
  if (route === 'projects' && id === 'new') return profile.role === 'client' ? <ProjectCreate profile={profile} perform={perform} setLocation={setLocation} runAi={runAi} aiResult={aiResult} aiKind={aiKind} aiBusy={aiBusy} /> : <Empty title="Project creation is for clients" detail="Browse open projects and apply to work that fits your skills." action={<Link href="/projects" className="text-link">Explore projects <ArrowRight size={14} /></Link>} />;
  if (route === 'projects' && id) {
    const foundProject = myProjects.find((p) => p.id === id) || null;
    return foundProject ? <ProjectDetail project={foundProject} profile={profile} applications={appRows} perform={perform} runAi={runAi} aiResult={aiResult} aiKind={aiKind} aiBusy={aiBusy} setLocation={setLocation} /> : <Empty title="Project not found" detail="This project may have been removed or is no longer available." action={<Link href="/projects" className="text-link">Back to projects <ArrowRight size={14} /></Link>} />;
  }
  if (route === 'projects' && profile.role === 'client') return <div className="fade-up">{head('Your work, in one place', 'My projects', 'Manage the briefs and collaborations you’ve started.', <Link href="/projects/new" className="btn btn-primary"><Plus size={16} /> Create project</Link>)}<div className="toolbar">{searchBox}<div className="filter-pills"><button className={filter === 'all' ? 'pill-active' : ''} onClick={() => setFilter('all')}>All projects</button><button className={filter === 'open' ? 'pill-active' : ''} onClick={() => setFilter('open')}>Open</button><button className={filter === 'in_progress' ? 'pill-active' : ''} onClick={() => setFilter('in_progress')}>In progress</button></div></div><div className="project-grid">{myProjects.filter((p) => filter === 'all' || p.status === filter).map(projectCard)}</div>{!myProjects.length && <Empty title="Your project space is clear" detail="Write a brief that tells people what success looks like." action={<Link href="/projects/new" className="btn btn-primary"><Plus size={15} /> Create your first project</Link>} />}</div>;
  if (route === 'projects' && profile.role === 'freelancer') return <div className="fade-up">{head('Find work that fits', 'Explore projects', 'Open opportunities, clear expectations, and room to do your best work.')}<div className="search-toolbar">{searchBox}<span className="result-count">{data.projects.length} open projects</span></div><div className="project-grid">{data.projects.map(projectCard)}</div>{!data.projects.length && <Empty title="No open projects found" detail="Try a different search, or check back as new projects are posted." />}</div>;
  if (route === 'projects' && profile.role === 'client') return null;
  if (route === 'projects-new') return <ProjectCreate profile={profile} perform={perform} setLocation={setLocation} runAi={runAi} aiResult={aiResult} aiKind={aiKind} aiBusy={aiBusy} />;
  if (route === 'project') return project ? <ProjectDetail project={project} profile={profile} applications={appRows} perform={perform} runAi={runAi} aiResult={aiResult} aiKind={aiKind} aiBusy={aiBusy} setLocation={setLocation} /> : <Empty title="Project not found" detail="This project may have been removed or is no longer available." action={<Link href="/projects" className="text-link">Back to projects <ArrowRight size={14} /></Link>} />;
  if (route === 'freelancers' && profile.role !== 'client') return <Empty title="Talent directory is for clients" detail="Explore open project opportunities that match your experience." action={<Link href="/projects" className="text-link">Browse projects <ArrowRight size={14} /></Link>} />;
  if (route === 'freelancers') return <div className="fade-up">{head('Independent talent', 'Meet your next collaborator', 'Browse professionals by experience, skill, and the work they share.')}<div className="search-toolbar">{searchBox}<span className="result-count">{data.profiles.length} profiles</span></div><div className="talent-grid">{data.profiles.map(profileCard)}</div>{!data.profiles.length && <Empty title="No professionals match yet" detail="Try searching a broader name or skill." />}</div>;
  if (route === 'freelancer') {
    const freelancer = selectedProfile || data.profiles.find((p) => p.id === id);
    return freelancer ? <FreelancerProfile freelancer={freelancer} demos={data.demos} reviews={data.reviews} viewer={profile} projects={data.projects} runAi={runAi} aiResult={aiResult} aiBusy={aiBusy} /> : <ProfileLookup id={id || ''} onLoaded={setSelectedProfile} />;
  }
  if (route === 'applications') return <Applications profile={profile} applications={appRows} projects={data.projects} perform={perform} setLocation={setLocation} />;
  if (route === 'messages') return <Messages projectId={id || ''} profile={profile} messages={data.messages} projects={data.projects} perform={perform} setLocation={setLocation} />;
  if (route === 'calls') return <Calls calls={data.calls} profile={profile} projects={data.projects} perform={perform} />;
  if (route === 'active') return <ActiveProjects rows={activeRows} projects={data.projects} profile={profile} perform={perform} />;
  if (route === 'feedback') return <Feedback rows={activeRows} reviews={data.reviews} projects={data.projects} profile={profile} perform={perform} />;
  if (route === 'notifications') return <Notifications items={data.notifications} />;
  if (route === 'profile') return <MyProfile profile={profile} demos={data.demos} reviews={data.reviews} perform={perform} />;
  if (route === 'settings') return <Settings profile={profile} perform={perform} health={health} />;
  return <Empty title="This page is taking a breather" detail="Choose a section from the navigation to continue." />;
}

function ProjectCreate({ profile, perform, setLocation, runAi, aiResult, aiKind, aiBusy }: any) {
  const [brief, setBrief] = useState('');
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const fd = new FormData(e.currentTarget);
    const input = {
      title: String(fd.get('title')).trim(), description: String(fd.get('description')).trim(),
      required_skills: split(String(fd.get('required_skills') || '')), optional_skills: split(String(fd.get('optional_skills') || '')),
      budget_min: Number(fd.get('budget_min')), budget_max: Number(fd.get('budget_max')), deadline: String(fd.get('deadline')),
      project_type: String(fd.get('project_type')), deliverables: split(String(fd.get('deliverables') || '')),
      experience_level: String(fd.get('experience_level')),
    };
    if (input.budget_min > input.budget_max) { setError('Minimum budget must be lower than maximum budget.'); return; }
    await perform(async () => { const made = await createProject(profile.id, input); setLocation(`/projects/${made.id}`); }, 'Project created.');
  }
  const handleBrief = async () => { if (brief.trim().length < 20) { setError('Add at least 20 characters so the brief recommendation has enough context.'); return; } await runAi('brief', { description: brief }); };
  return <div className="fade-up"><div className="backline"><Link href="/projects">← Back to projects</Link></div><div className="form-page-heading"><div className="eyebrow">A clear brief is a great beginning</div><h1>Create a project</h1><p>Describe the outcome you need. You’ll review every detail before publishing.</p></div><div className="create-layout"><form className="form-panel surface" onSubmit={submit}><div className="form-section-title"><span>01</span><div><h2>Project essentials</h2><p>Start with the outcome and the details people need to evaluate fit.</p></div></div><Input label="Project title" name="title" placeholder="e.g. Refresh our customer onboarding" required maxLength={160} /><Textarea label="Project description" name="description" placeholder="What are you trying to accomplish? Include context, constraints, and how you’ll know the work is successful." required minLength={10} rows={5} /><div className="form-two"><Input label="Minimum budget (USD)" type="number" name="budget_min" min={0} required placeholder="2400" /><Input label="Maximum budget (USD)" type="number" name="budget_max" min={0} required placeholder="4800" /></div><div className="form-two"><Input label="Target completion" type="date" name="deadline" required /><Select label="Project type" name="project_type"><option value="Fixed price">Fixed price</option><option value="Hourly">Hourly</option><option value="Ongoing">Ongoing</option></Select></div><div className="form-two"><Select label="Experience level" name="experience_level"><option value="any">Any level</option><option value="beginner">Early career</option><option value="intermediate">Experienced</option><option value="expert">Expert</option></Select><Input label="Required skills" name="required_skills" placeholder="Figma, UX research, prototyping" /></div><Input label="Optional skills" name="optional_skills" placeholder="Design systems, analytics" /><Input label="Key deliverables" name="deliverables" placeholder="Wireframes, clickable prototype, handoff notes" /><div className="form-actions"><Button type="submit"><Plus size={16} /> Publish project</Button><span>Only your saved project details are shared.</span></div></form><aside className="brief-sidebar"><div className="ai-card surface"><div className="ai-card-head"><span className="ai-glyph"><Sparkles size={18} /></span><div><div className="eyebrow">BRIEF ASSIST</div><h3>Shape your thinking</h3></div></div><p>Turn a rough idea into a structured brief recommendation. You stay in control of what goes into your project.</p><Textarea label="Starting point" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Share the idea, the outcome you want, and any context you have…" rows={5} />{error && <Alert>{error}</Alert>}<Button onClick={handleBrief} kind="outline" disabled={aiBusy} className="full-width"><Sparkles size={15} /> {aiBusy && aiKind === 'brief' ? 'Thinking…' : 'Suggest a project brief'}</Button>{aiResult && aiKind === 'brief' && <AiOutput result={aiResult} title="Brief recommendations" />}</div><div className="sidebar-tip"><ShieldCheck size={17} /><p><strong>Your project stays yours.</strong><br />AI suggestions are recommendations, not a substitute for your judgment.</p></div></aside></div></div>;
}

function ProjectDetail({ project, profile, applications, perform, runAi, aiResult, aiKind, aiBusy, setLocation }: any) {
  const [cover, setCover] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [callDate, setCallDate] = useState('');
  const [recipient, setRecipient] = useState('');
  const [showCall, setShowCall] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const own = project.client_id === profile.id;
  const sent = applications.some((a: Application) => a.project_id === project.id && a.freelancer_id === profile.id);
  const healthInput = { title: project.title, description: project.description, requiredSkills: project.required_skills, optionalSkills: project.optional_skills, budget: project.budget_max, deadline: project.deadline, projectType: project.project_type, deliverables: project.deliverables, experienceLevel: project.experience_level } satisfies ProjectHealthInput;
  return <div className="fade-up"><div className="backline"><Link href="/projects">← Back to projects</Link></div><div className="detail-layout"><div className="detail-main"><div className="detail-title-row"><Badge tone={project.status === 'open' ? 'green' : 'slate'}>{project.status.replace('_', ' ')}</Badge><span className="small-meta">{project.project_type}</span>{project.is_demo && <Badge tone="slate">Demo record</Badge>}</div><h1 className="detail-title">{project.title}</h1><p className="detail-subtitle">Posted {dateLabel(project.created_at)} · {project.experience_level} experience</p><section className="detail-section"><div className="eyebrow">THE PROJECT</div><h2>What you’ll be working on</h2><p className="long-copy">{project.description}</p></section><section className="detail-section"><div className="eyebrow">THE FIT</div><h2>Skills & deliverables</h2><h4>Required skills</h4><div className="tag-row">{project.required_skills.map((s: string) => <span className="skill-tag skill-large" key={s}>{s}</span>)}</div>{project.optional_skills.length > 0 && <><h4>Also useful</h4><div className="tag-row">{project.optional_skills.map((s: string) => <span className="skill-tag" key={s}>{s}</span>)}</div></>}<h4>Expected deliverables</h4><ul className="check-list">{project.deliverables.length ? project.deliverables.map((x: string) => <li key={x}><Check size={15} />{x}</li>) : <li>Deliverables to be agreed together.</li>}</ul></section>
      {own && <section className="detail-section applications-inline"><div className="panel-heading"><div><div className="eyebrow">INCOMING INTEREST</div><h2>Applications <span className="count-bubble">{applications.filter((a: Application) => a.project_id === project.id).length}</span></h2></div><Link href="/applications" className="text-link">Manage <ArrowRight size={14} /></Link></div>{applications.filter((a: Application) => a.project_id === project.id).length === 0 ? <p className="muted-copy">When a freelancer applies, their proposal will appear here.</p> : applications.filter((a: Application) => a.project_id === project.id).map((a: Application) => <div className="application-row" key={a.id}><Avatar name={a.freelancer?.full_name} size="sm" /><div><strong>{a.freelancer?.full_name || 'Freelancer'}</strong><p>{a.cover_letter}</p></div><Badge tone={a.status === 'pending' ? 'amber' : statusTone(a.status)}>{a.status}</Badge></div>)}</section>}
      <div className="ai-inline"><span className="ai-glyph"><Sparkles size={17} /></span><div><strong>Check project health</strong><p>Get a recommendation on scope, budget, and deadline clarity.</p></div><Button kind="outline" disabled={aiBusy} onClick={() => runAi('health', healthInput)}>{aiBusy && aiKind === 'health' ? 'Checking…' : 'Review scope'}</Button></div>{aiResult && aiKind === 'health' && <AiOutput result={aiResult} title="Project health recommendations" />}
      </div><aside className="detail-aside"><div className="summary-card surface"><div className="eyebrow">PROJECT SUMMARY</div><div className="summary-stat"><span>Budget range</span><strong>{money(project.budget_min)} – {money(project.budget_max)}</strong></div><div className="summary-stat"><span>Target date</span><strong>{dateLabel(project.deadline)}</strong></div><div className="summary-stat"><span>Experience level</span><strong className="capitalize">{project.experience_level}</strong></div><div className="summary-stat"><span>Applicants</span><strong>{applications.filter((a: Application) => a.project_id === project.id).length}</strong></div>
      {profile.role === 'freelancer' && project.status === 'open' && (sent ? <Alert tone="success">You’ve applied to this project.</Alert> : showApply ? <form className="form-stack compact-form" onSubmit={(e) => { e.preventDefault(); void perform(() => createApplication(project.id, profile.id, cover), 'Application submitted.'); setShowApply(false); }}><Textarea label="A note to the client" value={cover} onChange={(e) => setCover(e.target.value)} rows={4} placeholder="What makes this project interesting to you, and how would you approach it?" required /><Button type="submit" disabled={!cover.trim()}>Send application <ArrowRight size={15} /></Button></form> : <Button onClick={() => setShowApply(true)} className="full-width">Apply to project <ArrowRight size={15} /></Button>)}
      {profile.role === 'freelancer' && <><Button kind="outline" className="full-width margin-top" onClick={() => setShowAi(!showAi)}><Sparkles size={15} /> {showAi ? 'Hide fit recommendations' : 'Explore my fit'}</Button>{showAi && <SkillGapPanel project={project} profile={profile} runAi={runAi} aiResult={aiResult} aiBusy={aiBusy} />}</>}
      {own && <><Button kind="outline" className="full-width margin-top" onClick={() => setShowCall(!showCall)}><CalendarClock size={15} /> Request a call</Button>{showCall && <form className="form-stack compact-form" onSubmit={(e) => { e.preventDefault(); void perform(() => requestCall({ project_id: project.id, requester_id: profile.id, recipient_id: recipient, scheduled_at: callDate ? new Date(callDate).toISOString() : null }), 'Call request sent.'); setShowCall(false); }}><Input label="Freelancer profile ID" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Paste a freelancer profile ID" required /><Input label="Proposed time" type="datetime-local" value={callDate} onChange={(e) => setCallDate(e.target.value)} /><Button type="submit" disabled={!recipient}>Send request</Button></form>}<Button kind="quiet" className="full-width margin-top" onClick={() => void perform(() => updateProject(project.id, { status: project.status === 'open' ? 'in_progress' : 'open' }), project.status === 'open' ? 'Project moved to in progress.' : 'Project reopened.')}>{project.status === 'open' ? 'Mark in progress' : 'Reopen project'}</Button><Button kind="danger" className="full-width" onClick={() => setConfirmDelete(true)}>Delete project</Button>{confirmDelete && <div className="confirm-box"><p>Delete “{project.title}”? This cannot be undone.</p><Button kind="danger" onClick={() => void perform(() => deleteProject(project.id), 'Project deleted.')}>Confirm delete</Button><Button kind="quiet" onClick={() => setConfirmDelete(false)}>Cancel</Button></div>}</>}
      </div><div className="safe-note"><ShieldCheck size={17} /><div><strong>Keep work in context</strong><p>Messages and call requests stay connected to this project.</p><Link href={`/messages/${project.id}`}>Open project messages <ArrowRight size={13} /></Link></div></div></aside></div></div>;
}

function statusTone(status: string): 'soft' | 'green' | 'amber' | 'slate' { return status === 'accepted' || status === 'completed' || status === 'in_progress' ? 'green' : status === 'pending' || status === 'requested' || status === 'open' ? 'amber' : 'slate'; }
function AiOutput({ result, title }: { result: any; title: string }) {
  if (!result) return null;
  return <div className="ai-output"><div className="ai-output-title"><Sparkles size={15} /><strong>{title}</strong><Badge tone="slate">Recommendation</Badge></div>{result.matchScore !== undefined && <div className="ai-score">{result.matchScore}<small>/100 suggested fit</small></div>}{result.riskLevel && <div><span className="eyebrow">RISK ASSESSMENT</span><p><strong className="capitalize">{result.riskLevel} risk</strong> · {result.scopeAssessment}</p></div>}{result.projectGoal && <p><strong>Project goal</strong><br />{result.projectGoal}</p>}{result.readinessSummary && <p>{result.readinessSummary}</p>}{result.reason && <p>{result.reason}</p>}{result.recommendation && <p>{result.recommendation}</p>}{result.missingInformation?.length > 0 && <div><strong>Worth clarifying</strong><ul>{result.missingInformation.map((x: string) => <li key={x}>{x}</li>)}</ul></div>}{result.recommendations?.length > 0 && <div><strong>Suggestions</strong><ul>{result.recommendations.map((x: string) => <li key={x}>{x}</li>)}</ul></div>}{result.missingSkills?.length > 0 && <div><strong>Skills to consider</strong><div className="tag-row">{result.missingSkills.map((x: string) => <span className="skill-tag" key={x}>{x}</span>)}</div></div>}{result.preparationPlan?.length > 0 && <div className="prep-list">{result.preparationPlan.map((x: any) => <div key={`${x.order}-${x.skill}`}><Badge tone="slate">Step {x.order}</Badge><strong>{x.skill}</strong><p>{x.topics.join(' · ')} — {x.tip}</p></div>)}</div>}{result.mustHave?.length > 0 && <div><strong>Must-have</strong><div className="tag-row">{result.mustHave.map((x: string) => <span className="skill-tag" key={x}>{x}</span>)}</div></div>}</div>;
}
function SkillGapPanel({ project, profile, runAi, aiResult, aiBusy }: any) {
  const run = () => runAi('skills', { projectTitle: project.title, requiredSkills: project.required_skills, freelancerSkills: profile.skills } satisfies SkillGapInput);
  return <div className="skill-gap"><p>See where your listed skills align, plus a preparation plan for the gaps.</p><Button kind="quiet" disabled={aiBusy} onClick={run}>{aiBusy ? 'Preparing…' : 'Generate skill plan'}</Button>{aiResult?.preparationPlan && <AiOutput result={aiResult} title="Skill preparation recommendations" />}</div>;
}

function Applications({ profile, applications, projects, perform, setLocation }: any) {
  const [confirmId, setConfirmId] = useState('');
  return <div className="fade-up"><div className="page-heading"><div><div className="eyebrow">Project conversations begin here</div><h1>{profile.role === 'client' ? 'Applications' : 'My applications'}</h1><p>{profile.role === 'client' ? 'Review thoughtful proposals and decide who to speak with.' : 'Keep an eye on the projects you’ve reached out about.'}</p></div></div><div className="application-list surface">{applications.length ? applications.map((app: Application) => { const p = projects.find((x: Project) => x.id === app.project_id); return <article className="application-item" key={app.id}><Avatar name={profile.role === 'client' ? app.freelancer?.full_name : p?.title} /><div className="application-content"><div className="application-line"><strong>{profile.role === 'client' ? app.freelancer?.full_name || 'Freelancer' : p?.title || 'Project'}</strong><Badge tone={statusTone(app.status)}>{app.status}</Badge></div><p className="application-project">{profile.role === 'client' ? p?.title : app.freelancer?.headline}</p><p className="application-note">{app.cover_letter}</p><div className="application-actions"><Button kind="outline" onClick={() => setLocation(profile.role === 'client' ? `/freelancers/${app.freelancer_id}` : `/projects/${app.project_id}`)}>View {profile.role === 'client' ? 'profile' : 'project'} <ArrowRight size={14} /></Button>{profile.role === 'client' && app.status === 'pending' && <><Button onClick={() => void perform(() => updateApplicationStatus(app.id, 'accepted'), 'Application accepted.')}>Accept</Button><Button kind="quiet" onClick={() => setConfirmId(app.id)}>Decline</Button>{confirmId === app.id && <div className="confirm-box"><span>Decline this application?</span><Button kind="danger" onClick={() => { void perform(() => updateApplicationStatus(app.id, 'rejected'), 'Application declined.'); setConfirmId(''); }}>Confirm</Button><Button kind="quiet" onClick={() => setConfirmId('')}>Keep</Button></div>}</>}</div></div></article>; }) : <Empty title="No applications yet" detail={profile.role === 'client' ? 'Applications will appear as professionals respond to your projects.' : 'When you apply to a project, you can track its status here.'} action={profile.role === 'freelancer' ? <Link href="/projects" className="btn btn-primary">Explore projects <ArrowRight size={15} /></Link> : undefined} />}</div></div>;
}

function Messages({ projectId, profile, messages, projects, perform, setLocation }: any) {
  const [body, setBody] = useState('');
  const [recipient, setRecipient] = useState('');
  const project = projects.find((p: Project) => p.id === projectId);
  return <div className="fade-up">{<div className="page-heading"><div><div className="eyebrow">Project context, always</div><h1>Messages</h1><p>Keep conversations connected to the work you’re discussing.</p></div>{project && <Badge tone="slate">{project.title}</Badge>}</div>}<div className="message-layout surface"><aside className="message-rail"><div className="message-rail-head"><strong>Project threads</strong><span>{projects.length}</span></div>{projects.length ? projects.map((item: Project) => <Link key={item.id} href={`/messages/${item.id}`} className={cx('thread-card', item.id === projectId && 'selected')}><span className="thread-avatar"><BriefcaseBusiness size={17} /></span><span><strong>{item.title}</strong><small>Project conversation</small></span></Link>) : <Empty title="No projects yet" detail="Open or create a project to start a project-specific conversation." action={<Link href="/projects" className="text-link">Browse projects <ArrowRight size={13} /></Link>} />}</aside><section className="message-thread"><div className="thread-header"><span className="thread-avatar"><BriefcaseBusiness size={17} /></span><div><strong>{project?.title || 'No project selected'}</strong><small>Private project conversation</small></div><ShieldCheck size={17} className="thread-shield" /></div>{!projectId ? <div className="thread-empty"><MessageCircle size={24} /><h3>Messages belong to a project</h3><p>Choose one of your projects from the list to keep details and decisions together.</p></div> : <><div className="message-history">{messages.length ? messages.map((m: Message) => <div key={m.id} className={cx('message-bubble-wrap', m.sender_id === profile.id && 'mine')}><Avatar name={m.sender_id === profile.id ? profile.full_name : 'Project collaborator'} size="sm" /><div className="message-bubble"><p>{m.body}</p><small>{m.sender_id === profile.id ? 'You' : 'Collaborator'} · {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></div></div>) : <div className="thread-empty"><MessageCircle size={24} /><h3>A good conversation starts with context.</h3><p>Send a note about the project, a question, or the next decision.</p></div>}</div><form className="compose-message" onSubmit={(e) => { e.preventDefault(); void perform(() => sendMessage({ project_id: projectId, sender_id: profile.id, recipient_id: recipient, body: body.trim() }), 'Message sent.'); setBody(''); }}><Input label="Recipient profile ID" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Enter the other participant’s profile ID" required /><div className="compose-row"><Textarea label="Write a message" value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="A note about the project…" required /><Button type="submit" disabled={!body.trim() || !recipient}>Send <ArrowRight size={15} /></Button></div></form></>}</section></div></div>;
}

function Calls({ calls, profile, projects, perform }: any) {
  const [show, setShow] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [scheduled, setScheduled] = useState('');
  return <div className="fade-up">{<div className="page-heading"><div><div className="eyebrow">Make space for the conversation</div><h1>Calls & scheduling</h1><p>Request a project conversation and agree on a time that works.</p></div><Button onClick={() => setShow(!show)}><Plus size={16} /> Request a call</Button></div>}{show && <form className="call-form surface form-stack" onSubmit={(e) => { e.preventDefault(); void perform(() => requestCall({ project_id: projectId, requester_id: profile.id, recipient_id: recipient, scheduled_at: scheduled ? new Date(scheduled).toISOString() : null }), 'Call request sent.'); setShow(false); }}><div className="form-two"><Select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Choose a project</option>{projects.map((p: Project) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select><Input label="Other participant profile ID" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Profile ID" required /></div><Input label="Proposed date and time" type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} /><div className="form-actions"><Button type="submit" disabled={!projectId || !recipient}>Send request</Button><Button kind="quiet" onClick={() => setShow(false)}>Cancel</Button></div></form>}<div className="call-list">{calls.length ? calls.map((call: CallRequest) => { const p = projects.find((x: Project) => x.id === call.project_id); const incoming = call.recipient_id === profile.id; return <article className="call-card surface" key={call.id}><div className="call-icon"><CalendarClock size={20} /></div><div className="call-card-copy"><div className="application-line"><strong>{p?.title || 'Project conversation'}</strong><Badge tone={statusTone(call.status)}>{call.status}</Badge></div><p>{incoming ? 'Request from collaborator' : 'Requested by you'} · {dateLabel(call.scheduled_at)}</p>{call.meeting_url && <a href={call.meeting_url} target="_blank" rel="noreferrer" className="text-link">Join meeting <ArrowUpRight size={14} /></a>}</div>{incoming && call.status === 'requested' && <div className="call-actions"><Button onClick={() => void perform(() => updateCall(call.id, { status: 'accepted' }), 'Call accepted.')}>Accept</Button><Button kind="quiet" onClick={() => void perform(() => updateCall(call.id, { status: 'rejected' }), 'Call declined.')}>Decline</Button></div>}</article>; }) : <Empty title="No calls scheduled" detail="Request a conversation from a project when you’re ready to discuss the work." />}</div></div>;
}

function ActiveProjects({ rows, projects, profile, perform }: any) {
  const [counterpart, setCounterpart] = useState('');
  const [projectId, setProjectId] = useState('');
  return <div className="fade-up">{<div className="page-heading"><div><div className="eyebrow">Work in progress</div><h1>Active projects</h1><p>Track collaborations after both sides agree to begin.</p></div></div>}<div className="active-grid">{rows.length ? rows.map((row: ActiveProject) => { const p = projects.find((x: Project) => x.id === row.project_id); return <article className="active-card surface" key={row.id}><div className="active-card-top"><span className="active-mark"><Activity size={18} /></span><Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge></div><h3>{p?.title || 'Project collaboration'}</h3><p>{profile.role === 'client' ? 'Independent collaborator' : 'Client collaboration'} · Started {dateLabel(row.created_at)}</p><div className="progress-label"><span>Progress</span><strong>{row.progress}%</strong></div><div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(0, row.progress))}%` }} /></div><div className="active-card-actions"><Link href={`/messages/${row.project_id}`} className="btn btn-outline"><MessageCircle size={15} /> Project messages</Link><Link href="/feedback" className="btn btn-quiet">Feedback <ArrowRight size={14} /></Link></div></article>; }) : <Empty title="No active collaborations yet" detail="When a project moves into active work, it will be tracked here." />}</div><details className="secondary-create surface"><summary><Plus size={15} /> Start a collaboration from an accepted agreement</summary><form className="form-two" onSubmit={(e) => { e.preventDefault(); const p = projects.find((x: Project) => x.id === projectId); if (!p || !counterpart) return; void perform(() => createActiveProject({ project_id: projectId, client_id: profile.role === 'client' ? profile.id : counterpart, freelancer_id: profile.role === 'freelancer' ? profile.id : counterpart, status: 'in_progress', progress: 0 }), 'Collaboration started.'); }}><Select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Choose project</option>{projects.map((p: Project) => <option value={p.id} key={p.id}>{p.title}</option>)}</Select><Input label="Collaborator profile ID" value={counterpart} onChange={(e) => setCounterpart(e.target.value)} placeholder="Profile ID" required /><Button type="submit">Start collaboration</Button></form></details></div>;
}

function Feedback({ rows, reviews, projects, profile, perform }: any) {
  const [chosen, setChosen] = useState<ActiveProject | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const reviewSet = useMemo(() => new Set(reviews.map((r: Review) => `${r.project_id}:${r.reviewer_id}`)), [reviews]);
  return <div className="fade-up"><div className="page-heading"><div><div className="eyebrow">Close the loop</div><h1>Feedback</h1><p>Share useful, specific feedback with the people you worked alongside.</p></div></div><div className="feedback-layout"><section className="panel surface"><div className="panel-heading"><div><span className="eyebrow">COMPLETED WORK</span><h2>Ready for feedback</h2></div></div>{rows.filter((r: ActiveProject) => r.status === 'completed').length ? rows.filter((r: ActiveProject) => r.status === 'completed').map((r: ActiveProject) => { const p = projects.find((x: Project) => x.id === r.project_id); const done = reviewSet.has(`${r.project_id}:${profile.id}`); return <div className="feedback-row" key={r.id}><span className="row-icon"><Star size={16} /></span><div><strong>{p?.title || 'Project'}</strong><small>{done ? 'Feedback submitted' : 'Share your experience'}</small></div>{done ? <Badge tone="green">Reviewed</Badge> : <Button kind="outline" onClick={() => setChosen(r)}>Leave feedback</Button>}</div>; }) : <Empty title="Nothing to review yet" detail="Completed collaborations will appear here." />}</section><section className="panel surface"><div className="panel-heading"><div><span className="eyebrow">RECEIVED</span><h2>Feedback about you</h2></div></div>{reviews.length ? reviews.map((r: Review) => <div className="review-card" key={r.id}><div className="stars">{Array.from({ length: r.overall_rating }).map((_, i) => <Star size={13} fill="currentColor" key={i} />)}</div><p>{r.content}</p><small>{dateLabel(r.created_at)}</small></div>) : <Empty title="No feedback received" detail="Feedback from collaborators will appear after it is shared." />}</section></div>{chosen && <div className="modal-backdrop"><form className="feedback-modal surface" onSubmit={(e) => { e.preventDefault(); const recipient = profile.role === 'client' ? chosen.freelancer_id : chosen.client_id; void perform(() => createReview({ project_id: chosen.project_id, reviewer_id: profile.id, reviewee_id: recipient, overall_rating: rating, categories: {}, content }), 'Feedback submitted.'); setChosen(null); }}><button type="button" className="modal-close" onClick={() => setChosen(null)} aria-label="Close"><X size={18} /></button><span className="eyebrow">FEEDBACK THAT HELPS</span><h2>How did the collaboration go?</h2><Select label="Overall rating" value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value={5}>5 — Excellent</option><option value={4}>4 — Strong</option><option value={3}>3 — Good</option><option value={2}>2 — Needs improvement</option><option value={1}>1 — Poor</option></Select><Textarea label="What should they know?" rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share a specific, constructive note about the experience." required /><Button type="submit" disabled={!content.trim()}>Submit feedback</Button></form></div>}</div>;
}

function Notifications({ items }: { items: any[] }) {
  return <div className="fade-up"><div className="page-heading"><div><div className="eyebrow">Stay in the loop</div><h1>Notifications</h1><p>Updates related to your account and collaborations.</p></div></div><div className="notification-list surface">{items.length ? items.map((item, i) => <article className="notification-item" key={item.id || i}><span className="notification-symbol"><Bell size={16} /></span><div><strong>{item.title || item.type || 'Account update'}</strong><p>{item.body || item.message || 'There’s a new update in your FreelanceMatch workspace.'}</p><small>{item.created_at ? dateLabel(item.created_at) : 'Recent'}</small></div></article>) : <Empty title="All caught up" detail="When something needs your attention, you’ll find it here." />}</div></div>;
}

function MyProfile({ profile, demos, reviews, perform }: any) {
  const [addDemo, setAddDemo] = useState(false);
  return <div className="fade-up"><div className="page-heading"><div><div className="eyebrow">How you show up</div><h1>My profile</h1><p>Make your experience easy to understand and your work easy to trust.</p></div></div><div className="profile-layout"><ProfileEditor profile={profile} perform={perform} /><section className="profile-content"><div className="profile-banner surface"><div className="profile-avatar-large"><Avatar name={profile.full_name} size="lg" /></div><div><Badge tone="green"><ShieldCheck size={12} /> {profile.verified_skills.length} verified skills</Badge><h2>{profile.full_name}</h2><p>{profile.headline || 'Add a headline that captures your specialty.'}</p><div className="tag-row">{profile.skills.map((s: string) => <span className="skill-tag" key={s}>{s}</span>)}</div></div></div><section className="panel surface demo-panel"><div className="panel-heading"><div><span className="eyebrow">SELECTED WORK</span><h2>Demo projects</h2></div><Button kind="outline" onClick={() => setAddDemo(!addDemo)}><Plus size={15} /> Add work</Button></div>{addDemo && <form className="form-stack demo-form" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); void perform(() => createDemoProject({ freelancer_id: profile.id, title: String(fd.get('title')), description: String(fd.get('description')), technologies: split(String(fd.get('technologies') || '')), screenshot_urls: split(String(fd.get('screenshots') || '')), github_url: String(fd.get('github') || '') || null, live_demo_url: String(fd.get('live') || '') || null }), 'Demo project added.'); setAddDemo(false); }}><Input label="Project title" name="title" required /><Textarea label="What did you build?" name="description" rows={3} required /><Input label="Technologies" name="technologies" placeholder="React, TypeScript, Supabase" /><Input label="Screenshot URLs" name="screenshots" placeholder="https://…" /><div className="form-two"><Input label="GitHub URL" name="github" type="url" /><Input label="Live demo URL" name="live" type="url" /></div><Button type="submit">Save demo work</Button></form>}{demos.length ? demos.map((d: DemoProject) => <article className="demo-item" key={d.id}><span className="demo-symbol"><Layers3 size={18} /></span><div><strong>{d.title}</strong><p>{d.description}</p><div className="tag-row">{d.technologies.map((t) => <span className="skill-tag" key={t}>{t}</span>)}</div><div className="demo-links">{d.github_url && <a href={d.github_url} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a>}{d.live_demo_url && <a href={d.live_demo_url} target="_blank" rel="noreferrer">Live demo <ArrowUpRight size={13} /></a>}</div></div><Button kind="quiet" onClick={() => window.confirm(`Remove “${d.title}” from your demo work?`) && void perform(() => deleteDemoProject(d.id), 'Demo project removed.')}>Remove</Button></article>) : <Empty title="Show what you can do" detail="Add a demo project so people can see your approach, not just read about it." />}</section><section className="panel surface"><div className="panel-heading"><div><span className="eyebrow">TRUST BUILDS OVER TIME</span><h2>Feedback</h2></div><span className="rating-large"><Star size={15} fill="currentColor" /> {profile.average_rating > 0 ? profile.average_rating.toFixed(1) : '—'}</span></div>{reviews.length ? reviews.map((r: Review) => <div className="review-card" key={r.id}><div className="stars">{Array.from({ length: r.overall_rating }).map((_, i) => <Star size={13} fill="currentColor" key={i} />)}</div><p>{r.content}</p><small>{dateLabel(r.created_at)}</small></div>) : <p className="muted-copy">Feedback from past collaborations will appear here.</p>}</section></section></div></div>;
}

function ProfileEditor({ profile, perform }: any) {
  return <form className="profile-editor surface form-stack" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); void perform(() => saveProfile(profile.id, { role: profile.role, full_name: String(fd.get('full_name')).trim(), headline: String(fd.get('headline')), bio: String(fd.get('bio')), skills: split(String(fd.get('skills') || '')), experience_years: Number(fd.get('experience_years')), education: String(fd.get('education')) || null, availability: String(fd.get('availability')), hourly_rate: fd.get('hourly_rate') ? Number(fd.get('hourly_rate')) : null, portfolio_url: String(fd.get('portfolio_url')) || null }), 'Profile updated.'); }}><div className="form-section-title"><span><UserRound size={15} /></span><div><h2>Profile details</h2><p>Keep the essentials current.</p></div></div><Input label="Full name" name="full_name" defaultValue={profile.full_name} required /><Input label="Professional headline" name="headline" defaultValue={profile.headline || ''} placeholder="What do you do best?" /><Textarea label="About you" name="bio" defaultValue={profile.bio || ''} rows={5} placeholder="Your approach, the work you enjoy, and the value you bring." /><Input label="Skills" name="skills" defaultValue={profile.skills.join(', ')} placeholder="Figma, React, research" /><div className="form-two"><Input label="Years of experience" name="experience_years" type="number" min={0} defaultValue={profile.experience_years} /><Input label="Hourly rate (USD)" name="hourly_rate" type="number" min={0} defaultValue={profile.hourly_rate || ''} /></div><Input label="Education" name="education" defaultValue={profile.education || ''} /><Select label="Availability" name="availability" defaultValue={profile.availability || 'Open to work'}><option>Open to work</option><option>Available part-time</option><option>Available for select projects</option><option>Not available</option></Select><Input label="Portfolio URL" name="portfolio_url" type="url" defaultValue={profile.portfolio_url || ''} placeholder="https://" /><Button type="submit">Save profile changes</Button></form>;
}

function ProfileLookup({ id, onLoaded }: { id: string; onLoaded: (p: Profile) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { listProfiles({ limit: 100 }).then((rows) => { const found = rows.find((p) => p.id === id); if (found) { setProfile(found); onLoaded(found); } else setError('This profile could not be found.'); }).catch((e) => setError(e.message)); }, [id, onLoaded]);
  return profile ? null : <div className="page-content">{error ? <Alert>{error}</Alert> : <Skeleton lines={4} />}</div>;
}

function FreelancerProfile({ freelancer, demos, reviews, viewer, projects, runAi, aiResult, aiBusy }: any) {
  const [projectId, setProjectId] = useState('');
  async function match(project: Project) {
    const payload: MatchInput = { project: { title: project.title, description: project.description, requiredSkills: project.required_skills, budget: project.budget_max, deadline: project.deadline }, freelancer: { name: freelancer.full_name, skills: freelancer.skills, experienceYears: freelancer.experience_years, availability: freelancer.availability, rate: freelancer.hourly_rate || 0, rating: freelancer.average_rating, portfolioSummary: demos.map((d: DemoProject) => `${d.title}: ${d.description}`).join(' | ') } };
    await runAi('match', payload);
  }
  return <div className="fade-up"><div className="backline"><Link href="/freelancers">← Back to talent</Link></div><div className="public-profile-head surface"><div className="public-avatar"><Avatar name={freelancer.full_name} size="lg" /></div><div className="public-profile-details"><div className="eyebrow">INDEPENDENT PROFESSIONAL</div><h1>{freelancer.full_name}</h1><p className="public-headline">{freelancer.headline}</p><div className="public-meta"><span><Star size={14} fill="currentColor" /> {freelancer.average_rating > 0 ? freelancer.average_rating.toFixed(1) : 'New profile'}</span><span><GraduationCap size={15} /> {freelancer.experience_years} years experience</span><span><Clock3 size={15} /> {freelancer.availability}</span></div><div className="tag-row">{freelancer.skills.map((s: string) => <span className="skill-tag" key={s}>{s}</span>)}</div></div><div className="profile-action"><strong>{freelancer.hourly_rate ? `${money(freelancer.hourly_rate)}/hr` : 'Rate on request'}</strong>{viewer.role === 'client' && <Link href="/projects" className="btn btn-primary">View projects <ArrowRight size={15} /></Link>}</div></div><div className="profile-detail-columns"><section className="panel surface"><div className="eyebrow">ABOUT</div><h2>How I work</h2><p className="long-copy">{freelancer.bio || 'This professional is still adding details to their profile.'}</p>{freelancer.education && <div className="education-row"><GraduationCap size={17} /><span><small>EDUCATION</small><strong>{freelancer.education}</strong></span></div>}<div className="verification-block"><div className="eyebrow">VERIFIED SKILLS</div>{freelancer.verified_skills.length ? <div className="tag-row">{freelancer.verified_skills.map((s: string) => <span className="verified-tag" key={s}><ShieldCheck size={13} />{s}</span>)}</div> : <p>No verified skills listed yet.</p>}</div></section><section className="panel surface"><div className="panel-heading"><div><div className="eyebrow">SELECTED WORK</div><h2>Demo projects</h2></div></div>{demos.length ? demos.map((d: DemoProject) => <div className="public-demo" key={d.id}><div className="demo-symbol"><Layers3 size={17} /></div><div><strong>{d.title}</strong><p>{d.description}</p><div className="tag-row">{d.technologies.map((t: string) => <span className="skill-tag" key={t}>{t}</span>)}</div></div></div>) : <p className="muted-copy">No demo projects added yet.</p>}</section></div><div className="profile-detail-columns"><section className="panel surface"><div className="eyebrow">COLLABORATOR FEEDBACK</div><h2>Reviews</h2>{reviews.length ? reviews.map((r: Review) => <div className="review-card" key={r.id}><div className="stars">{Array.from({ length: r.overall_rating }).map((_, i) => <Star size={13} fill="currentColor" key={i} />)}</div><p>{r.content}</p><small>{dateLabel(r.created_at)}</small></div>) : <p className="muted-copy">Reviews will be visible here as collaborations are completed.</p>}</section><section className="ai-match-card surface"><div className="ai-card-head"><span className="ai-glyph"><Sparkles size={18} /></span><div><div className="eyebrow">PROJECT-SPECIFIC MATCH</div><h3>Explore a better fit</h3></div></div><p>Get a project-specific recommendation based on this professional’s real profile and demo work.</p>{viewer.role === 'client' && <><Select label="Your open project" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Choose a project</option>{projects.filter((p: Project) => p.status === 'open').map((p: Project) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select><Button className="full-width margin-top" disabled={!projectId || aiBusy} onClick={() => { const selected = projects.find((p: Project) => p.id === projectId); if (selected) void match(selected); }}>{aiBusy ? 'Comparing fit…' : 'Recommend a project fit'} <Sparkles size={15} /></Button></>}{aiResult && <AiOutput result={aiResult} title="Fit recommendations" />}</section></div></div>;
}

function Settings({ profile, perform, health }: any) {
  return <div className="fade-up"><div className="page-heading"><div><div className="eyebrow">Your account, your controls</div><h1>Settings</h1><p>Review account details and connection status.</p></div></div><div className="settings-grid"><section className="settings-card surface"><div className="settings-icon"><UserRound size={19} /></div><div className="eyebrow">ACCOUNT</div><h2>Account profile</h2><p>Your account role and identity are managed through your profile.</p><div className="setting-line"><span>Name</span><strong>{profile.full_name}</strong></div><div className="setting-line"><span>Workspace</span><strong className="capitalize">{profile.role}</strong></div><div className="setting-line"><span>Verified skills</span><strong>{profile.verified_skills.length}</strong></div><Link href="/profile" className="text-link">Edit your profile <ArrowRight size={14} /></Link></section><section className="settings-card surface"><div className="settings-icon"><Activity size={19} /></div><div className="eyebrow">SERVICE STATUS</div><h2>Platform connection</h2><p>Health check for the recommendation service.</p><div className="api-status"><span className={cx('status-light', health.isError ? 'status-off' : 'status-on')} /><strong>{health.isLoading ? 'Checking…' : health.isError ? 'Unavailable' : health.data?.status || 'Connected'}</strong><span>API status</span></div>{health.isError && <Alert>We couldn't reach the API right now. It may recover shortly.</Alert>}<Button kind="outline" onClick={() => health.refetch()}>Check again <Activity size={14} /></Button></section><section className="settings-card settings-wide surface"><div className="settings-icon"><ShieldCheck size={19} /></div><div className="eyebrow">SIGN-IN & SECURITY</div><h2>Account access</h2><p>Sign out of this browser when you’re finished.</p><Button kind="outline" onClick={() => void perform(async () => { await supabase.auth.signOut(); }, 'Signed out.')}>Sign out <ArrowRight size={15} /></Button></section></div></div>;
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={Landing} />
    <Route path="/login" component={() => <AppWorkspace />} />
    <Route path="/register" component={() => <AppWorkspace />} />
    <Route path="/:rest*" component={AppWorkspace} />
    <Route component={() => <div className="not-found"><div className="eyebrow">404 · NOT FOUND</div><h1>This page isn’t here.</h1><Link href="/" className="btn btn-primary">Back to FreelanceMatch <ArrowRight size={15} /></Link></div>} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
