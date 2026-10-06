import { supabase } from './supabase';

export type Role = 'client' | 'freelancer';
export type ProjectStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ActiveProjectStatus = 'not_started' | 'in_progress' | 'review' | 'completed' | 'cancelled';

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  headline: string | null;
  bio: string | null;
  skills: string[];
  experience_years: number;
  education: string | null;
  availability: string;
  hourly_rate: number | null;
  portfolio_url: string | null;
  verified_skills: string[];
  average_rating: number;
  is_demo: boolean;
  created_at: string;
};

export type Project = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  required_skills: string[];
  optional_skills: string[];
  budget_min: number;
  budget_max: number;
  deadline: string;
  project_type: string;
  deliverables: string[];
  experience_level: string;
  status: ProjectStatus;
  risk_level: 'low' | 'medium' | 'high' | null;
  health_analysis: Record<string, unknown> | null;
  is_demo: boolean;
  created_at: string;
};

export type Application = {
  id: string;
  project_id: string;
  freelancer_id: string;
  cover_letter: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  project?: Project;
  freelancer?: Profile;
};

export type DemoProject = {
  id: string;
  freelancer_id: string;
  title: string;
  description: string;
  technologies: string[];
  screenshot_urls: string[];
  github_url: string | null;
  live_demo_url: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  project_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

export type CallRequest = {
  id: string;
  project_id: string;
  requester_id: string;
  recipient_id: string;
  scheduled_at: string | null;
  meeting_url: string | null;
  status: 'requested' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
};

export type ActiveProject = {
  id: string;
  project_id: string;
  client_id: string;
  freelancer_id: string;
  status: ActiveProjectStatus;
  progress: number;
  created_at: string;
};

export type Deliverable = {
  id: string;
  active_project_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string | null;
  created_at: string;
};

export type ScopeChange = {
  id: string;
  active_project_id: string;
  requested_by: string;
  original_scope: string;
  requested_change: string;
  proposed_budget_adjustment: number | null;
  proposed_deadline_adjustment_days: number | null;
  client_approved: boolean | null;
  freelancer_approved: boolean | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type Review = {
  id: string;
  project_id: string;
  reviewer_id: string;
  reviewee_id: string;
  overall_rating: number;
  categories: Record<string, number>;
  content: string;
  created_at: string;
};

export type ProjectInput = Omit<
  Project,
  'id' | 'client_id' | 'status' | 'risk_level' | 'health_analysis' | 'is_demo' | 'created_at'
>;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('The requested record was not found.');
  return result.data;
}

export async function saveProfile(
  userId: string,
  changes: Partial<Profile> & Pick<Profile, 'role' | 'full_name'>,
) {
  return unwrap(
    await supabase
      .from('profiles')
      .upsert({ id: userId, ...changes }, { onConflict: 'id' })
      .select()
      .single(),
  ) as Profile;
}

export async function getProfile(userId: string) {
  const result = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as Profile | null;
}

export async function listProfiles(options: {
  role?: Role;
  search?: string;
  skill?: string;
  limit?: number;
} = {}) {
  let query = supabase.from('profiles').select('*').eq('role', options.role ?? 'freelancer');
  const search = options.search?.trim();
  if (search) query = query.ilike('full_name', `%${search.replace(/[%_]/g, '\\$&')}%`);
  if (options.skill) query = query.contains('skills', [options.skill]);
  const result = await query.order('average_rating', { ascending: false }).limit(options.limit ?? 30);
  if (result.error) throw new Error(result.error.message);
  return result.data as Profile[];
}

export async function listProjects(options: {
  search?: string;
  skill?: string;
  clientId?: string;
  includeClosed?: boolean;
  limit?: number;
} = {}) {
  let query = supabase.from('projects').select('*');
  if (options.clientId) query = query.eq('client_id', options.clientId);
  else if (!options.includeClosed) query = query.eq('status', 'open');
  const search = options.search?.trim();
  if (search) query = query.ilike('title', `%${search.replace(/[%_]/g, '\\$&')}%`);
  if (options.skill) query = query.contains('required_skills', [options.skill]);
  const result = await query.order('created_at', { ascending: false }).limit(options.limit ?? 50);
  if (result.error) throw new Error(result.error.message);
  return result.data as Project[];
}

export async function getProject(projectId: string) {
  const result = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as Project | null;
}

export async function createProject(clientId: string, input: ProjectInput) {
  return unwrap(
    await supabase
      .from('projects')
      .insert({ ...input, client_id: clientId, status: 'open' })
      .select()
      .single(),
  ) as Project;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, 'title' | 'description' | 'status' | 'risk_level' | 'health_analysis'>>,
) {
  return unwrap(
    await supabase.from('projects').update(updates).eq('id', projectId).select().single(),
  ) as Project;
}

export async function deleteProject(projectId: string) {
  const result = await supabase.from('projects').delete().eq('id', projectId);
  if (result.error) throw new Error(result.error.message);
}

export async function createApplication(projectId: string, freelancerId: string, coverLetter: string) {
  return unwrap(
    await supabase
      .from('applications')
      .insert({ project_id: projectId, freelancer_id: freelancerId, cover_letter: coverLetter })
      .select()
      .single(),
  ) as Application;
}

export async function listApplications(options: { projectId?: string; freelancerId?: string }) {
  let query = supabase.from('applications').select('*');
  if (options.projectId) query = query.eq('project_id', options.projectId);
  if (options.freelancerId) query = query.eq('freelancer_id', options.freelancerId);
  const result = await query.order('created_at', { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return result.data as Application[];
}

export async function updateApplicationStatus(
  applicationId: string,
  status: Application['status'],
) {
  return unwrap(
    await supabase.from('applications').update({ status }).eq('id', applicationId).select().single(),
  ) as Application;
}

export async function listDemoProjects(freelancerId: string) {
  const result = await supabase
    .from('demo_projects')
    .select('*')
    .eq('freelancer_id', freelancerId)
    .order('created_at', { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return result.data as DemoProject[];
}

export async function createDemoProject(
  input: Omit<DemoProject, 'id' | 'created_at'>,
) {
  return unwrap(await supabase.from('demo_projects').insert(input).select().single()) as DemoProject;
}

export async function deleteDemoProject(id: string) {
  const result = await supabase.from('demo_projects').delete().eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

export async function listMessages(projectId: string) {
  const result = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (result.error) throw new Error(result.error.message);
  return result.data as Message[];
}

export async function sendMessage(input: Omit<Message, 'id' | 'created_at'>) {
  return unwrap(await supabase.from('messages').insert(input).select().single()) as Message;
}

export async function listCalls(userId: string) {
  const result = await supabase
    .from('call_requests')
    .select('*')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return result.data as CallRequest[];
}

export async function requestCall(input: Pick<
  CallRequest,
  'project_id' | 'requester_id' | 'recipient_id' | 'scheduled_at'
>) {
  return unwrap(await supabase.from('call_requests').insert(input).select().single()) as CallRequest;
}

export async function updateCall(
  id: string,
  changes: Pick<CallRequest, 'status'> & Partial<Pick<CallRequest, 'scheduled_at' | 'meeting_url'>>,
) {
  return unwrap(await supabase.from('call_requests').update(changes).eq('id', id).select().single()) as CallRequest;
}

export async function listActiveProjects(userId: string) {
  const result = await supabase
    .from('active_projects')
    .select('*')
    .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return result.data as ActiveProject[];
}

export async function createActiveProject(input: Omit<ActiveProject, 'id' | 'created_at'>) {
  return unwrap(await supabase.from('active_projects').insert(input).select().single()) as ActiveProject;
}

export async function updateActiveProject(
  id: string,
  changes: Partial<Pick<ActiveProject, 'status' | 'progress'>>,
) {
  return unwrap(await supabase.from('active_projects').update(changes).eq('id', id).select().single()) as ActiveProject;
}

export async function listDeliverables(activeProjectId: string) {
  const result = await supabase
    .from('deliverables')
    .select('*')
    .eq('active_project_id', activeProjectId)
    .order('created_at', { ascending: true });
  if (result.error) throw new Error(result.error.message);
  return result.data as Deliverable[];
}

export async function createDeliverable(
  input: Pick<Deliverable, 'active_project_id' | 'title' | 'description' | 'due_date'>,
) {
  return unwrap(await supabase.from('deliverables').insert(input).select().single()) as Deliverable;
}

export async function updateDeliverable(
  id: string,
  changes: Partial<Pick<Deliverable, 'title' | 'description' | 'status' | 'due_date'>>,
) {
  return unwrap(await supabase.from('deliverables').update(changes).eq('id', id).select().single()) as Deliverable;
}

export async function listScopeChanges(activeProjectId: string) {
  const result = await supabase
    .from('scope_changes')
    .select('*')
    .eq('active_project_id', activeProjectId)
    .order('created_at', { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return result.data as ScopeChange[];
}

export async function createScopeChange(
  input: Pick<ScopeChange, 'active_project_id' | 'requested_by' | 'original_scope' | 'requested_change'> &
    Partial<Pick<ScopeChange, 'proposed_budget_adjustment' | 'proposed_deadline_adjustment_days'>>,
) {
  return unwrap(await supabase.from('scope_changes').insert(input).select().single()) as ScopeChange;
}

export async function approveScopeChange(
  id: string,
  role: Role,
  approved: boolean,
) {
  const changes =
    role === 'client'
      ? { client_approved: approved }
      : { freelancer_approved: approved };
  return unwrap(await supabase.from('scope_changes').update(changes).eq('id', id).select().single()) as ScopeChange;
}

export async function listReviews(profileId: string) {
  const result = await supabase
    .from('reviews')
    .select('*')
    .eq('reviewee_id', profileId)
    .order('created_at', { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return result.data as Review[];
}

export async function createReview(input: Omit<Review, 'id' | 'created_at'>) {
  return unwrap(await supabase.from('reviews').insert(input).select().single()) as Review;
}

export async function listNotifications(userId: string) {
  const result = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

export async function markNotificationRead(id: string) {
  const result = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (result.error) throw new Error(result.error.message);
}
