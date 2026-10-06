-- Run this file once in the Supabase SQL Editor. Marketplace records are
-- protected by RLS; demo profiles and projects are explicitly labeled.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key,
  role text not null check (role in ('client', 'freelancer')),
  full_name text not null,
  headline text,
  bio text,
  skills text[] not null default '{}',
  experience_years integer not null default 0 check (experience_years >= 0),
  education text,
  availability text not null default 'available',
  hourly_rate numeric(10,2),
  portfolio_url text,
  verified_skills text[] not null default '{}',
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  review_count integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  required_skills text[] not null default '{}',
  optional_skills text[] not null default '{}',
  budget_min numeric(12,2) not null default 0,
  budget_max numeric(12,2) not null default 0,
  deadline date not null,
  project_type text not null default 'fixed',
  deliverables text[] not null default '{}',
  experience_level text not null default 'any',
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  risk_level text check (risk_level in ('low','medium','high')),
  health_analysis jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_max >= budget_min)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  cover_letter text not null default '',
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, freelancer_id)
);

create table if not exists public.demo_projects (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  technologies text[] not null default '{}',
  screenshot_urls text[] not null default '{}',
  github_url text,
  live_demo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 10000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.call_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_at timestamptz,
  meeting_url text,
  status text not null default 'requested' check (status in ('requested','accepted','rejected','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.active_projects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('not_started','in_progress','review','completed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  active_project_id uuid not null references public.active_projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scope_changes (
  id uuid primary key default gen_random_uuid(),
  active_project_id uuid not null references public.active_projects(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  original_scope text not null,
  requested_change text not null,
  proposed_budget_adjustment numeric(12,2),
  proposed_deadline_adjustment_days integer,
  client_approved boolean,
  freelancer_approved boolean,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  overall_rating numeric(2,1) not null check (overall_rating between 1 and 5),
  categories jsonb not null default '{}',
  content text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, reviewer_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists projects_status_created_idx on public.projects(status, created_at desc);
create index if not exists projects_client_idx on public.projects(client_id);
create index if not exists applications_project_idx on public.applications(project_id, created_at desc);
create index if not exists applications_freelancer_idx on public.applications(freelancer_id, created_at desc);
create index if not exists messages_project_idx on public.messages(project_id, created_at);
create index if not exists calls_participants_idx on public.call_requests(requester_id, recipient_id);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();
drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at before update on public.applications
for each row execute function public.set_updated_at();
drop trigger if exists demo_projects_updated_at on public.demo_projects;
create trigger demo_projects_updated_at before update on public.demo_projects
for each row execute function public.set_updated_at();
drop trigger if exists call_requests_updated_at on public.call_requests;
create trigger call_requests_updated_at before update on public.call_requests
for each row execute function public.set_updated_at();
drop trigger if exists active_projects_updated_at on public.active_projects;
create trigger active_projects_updated_at before update on public.active_projects
for each row execute function public.set_updated_at();
drop trigger if exists deliverables_updated_at on public.deliverables;
create trigger deliverables_updated_at before update on public.deliverables
for each row execute function public.set_updated_at();
drop trigger if exists scope_changes_updated_at on public.scope_changes;
create trigger scope_changes_updated_at before update on public.scope_changes
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  chosen_role text;
begin
  chosen_role := new.raw_user_meta_data ->> 'role';
  if chosen_role is null or chosen_role not in ('client', 'freelancer') then
    chosen_role := 'freelancer';
  end if;
  insert into public.profiles (id, role, full_name)
  values (new.id, chosen_role, coalesce(new.raw_user_meta_data ->> 'full_name', 'New member'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.protect_profile_trust_fields()
returns trigger language plpgsql as $$
begin
  if auth.uid() = old.id then
    new.role := old.role;
    new.is_demo := old.is_demo;
    new.average_rating := old.average_rating;
    new.review_count := old.review_count;
    new.verified_skills := old.verified_skills;
  end if;
  return new;
end;
$$;

create or replace function public.protect_application_status()
returns trigger language plpgsql as $$
declare
  project_client uuid;
begin
  if new.project_id is distinct from old.project_id
     or new.freelancer_id is distinct from old.freelancer_id then
    raise exception 'Application project and freelancer cannot be changed';
  end if;
  select client_id into project_client from public.projects where id = old.project_id;
  if auth.uid() = old.freelancer_id and auth.uid() <> project_client
     and new.status is distinct from old.status and new.status <> 'withdrawn' then
    raise exception 'Freelancers may only withdraw their own application';
  end if;
  if old.status = 'accepted' and new.status <> 'accepted' then
    raise exception 'An accepted application cannot be reopened';
  end if;
  return new;
end;
$$;

create or replace function public.activate_project_on_acceptance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  project_client uuid;
  project_status text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select client_id, status into project_client, project_status
    from public.projects where id = new.project_id for update;
    if project_client is null or project_status <> 'open' then
      raise exception 'This project is no longer open';
    end if;
    update public.projects set status = 'in_progress' where id = new.project_id;
    insert into public.active_projects (project_id, client_id, freelancer_id, status, progress)
    values (new.project_id, project_client, new.freelancer_id, 'in_progress', 0);
  end if;
  return new;
end;
$$;

create or replace function public.update_profile_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  affected_profile uuid;
begin
  if tg_op = 'DELETE' then
    affected_profile := old.reviewee_id;
  else
    affected_profile := new.reviewee_id;
  end if;
  update public.profiles
  set average_rating = coalesce((
        select round(avg(overall_rating), 2)
        from public.reviews where reviewee_id = affected_profile
      ), 0),
      review_count = (
        select count(*) from public.reviews where reviewee_id = affected_profile
      )
  where id = affected_profile;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.protect_call_update()
returns trigger language plpgsql as $$
begin
  if new.project_id is distinct from old.project_id
     or new.requester_id is distinct from old.requester_id
     or new.recipient_id is distinct from old.recipient_id then
    raise exception 'Call participants and project cannot be changed';
  end if;
  if auth.uid() = old.requester_id and new.status is distinct from old.status
     and new.status <> 'cancelled' then
    raise exception 'The requester may only cancel a call request';
  end if;
  if auth.uid() = old.recipient_id and new.status not in ('requested','accepted','rejected','completed','cancelled') then
    raise exception 'Invalid call status';
  end if;
  return new;
end;
$$;

create or replace function public.protect_scope_approval()
returns trigger language plpgsql as $$
declare
  project_client uuid;
  project_freelancer uuid;
begin
  if new.active_project_id is distinct from old.active_project_id then
    raise exception 'Scope change project cannot be changed';
  end if;
  if new.requested_by is distinct from old.requested_by
     or new.original_scope is distinct from old.original_scope
     or new.requested_change is distinct from old.requested_change
     or new.proposed_budget_adjustment is distinct from old.proposed_budget_adjustment
     or new.proposed_deadline_adjustment_days is distinct from old.proposed_deadline_adjustment_days then
    raise exception 'Scope request terms cannot be changed after submission';
  end if;
  select client_id, freelancer_id into project_client, project_freelancer
  from public.active_projects where id = old.active_project_id;
  if auth.uid() = project_client then
    if new.freelancer_approved is distinct from old.freelancer_approved then
      raise exception 'Clients cannot approve on behalf of a freelancer';
    end if;
  elsif auth.uid() = project_freelancer then
    if new.client_approved is distinct from old.client_approved then
      raise exception 'Freelancers cannot approve on behalf of a client';
    end if;
  end if;
  if new.client_approved = false or new.freelancer_approved = false then
    new.status := 'rejected';
  elsif new.client_approved = true and new.freelancer_approved = true then
    new.status := 'approved';
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create or replace function public.protect_active_project_participants()
returns trigger language plpgsql as $$
begin
  if new.project_id is distinct from old.project_id
     or new.client_id is distinct from old.client_id
     or new.freelancer_id is distinct from old.freelancer_id then
    raise exception 'Active project participants and source project cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
drop trigger if exists profiles_trust_fields on public.profiles;
create trigger profiles_trust_fields before update on public.profiles
for each row execute function public.protect_profile_trust_fields();
drop trigger if exists applications_status_guard on public.applications;
create trigger applications_status_guard before update on public.applications
for each row execute function public.protect_application_status();
drop trigger if exists applications_activate_project on public.applications;
create trigger applications_activate_project after update of status on public.applications
for each row execute function public.activate_project_on_acceptance();
drop trigger if exists calls_update_guard on public.call_requests;
create trigger calls_update_guard before update on public.call_requests
for each row execute function public.protect_call_update();
drop trigger if exists scope_approval_guard on public.scope_changes;
create trigger scope_approval_guard before update on public.scope_changes
for each row execute function public.protect_scope_approval();
drop trigger if exists active_project_participants_guard on public.active_projects;
create trigger active_project_participants_guard before update on public.active_projects
for each row execute function public.protect_active_project_participants();
drop trigger if exists review_updates_profile_rating on public.reviews;
create trigger review_updates_profile_rating after insert or update or delete on public.reviews
for each row execute function public.update_profile_rating();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.applications enable row level security;
alter table public.demo_projects enable row level security;
alter table public.messages enable row level security;
alter table public.call_requests enable row level security;
alter table public.active_projects enable row level security;
alter table public.deliverables enable row level security;
alter table public.scope_changes enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Public freelancer directory" on public.profiles;
create policy "Public freelancer directory" on public.profiles for select
using (role = 'freelancer' or id = auth.uid() or exists (
  select 1 from public.projects p where p.client_id = id and p.is_demo = true
));
drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile" on public.profiles for insert to authenticated
with check (id = auth.uid());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Browse open projects" on public.projects;
create policy "Browse open projects" on public.projects for select
using (
  (status = 'open' and (is_demo or auth.uid() is not null))
  or client_id = auth.uid()
  or exists (select 1 from public.active_projects a
    where a.project_id = id and a.freelancer_id = auth.uid())
);
drop policy if exists "Clients create projects" on public.projects;
create policy "Clients create projects" on public.projects for insert to authenticated
with check (client_id = auth.uid() and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'client'
));
drop policy if exists "Clients manage own projects" on public.projects;
create policy "Clients manage own projects" on public.projects for update to authenticated
using (client_id = auth.uid()) with check (client_id = auth.uid());
drop policy if exists "Clients delete own projects" on public.projects;
create policy "Clients delete own projects" on public.projects for delete to authenticated
using (client_id = auth.uid());

drop policy if exists "Participants view applications" on public.applications;
create policy "Participants view applications" on public.applications for select to authenticated
using (freelancer_id = auth.uid() or exists (
  select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid()
));
drop policy if exists "Freelancers apply" on public.applications;
create policy "Freelancers apply" on public.applications for insert to authenticated
with check (freelancer_id = auth.uid() and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'freelancer'
) and exists (
  select 1 from public.projects p where p.id = project_id and p.status = 'open'
));
drop policy if exists "Participants update applications" on public.applications;
create policy "Participants update applications" on public.applications for update to authenticated
using (freelancer_id = auth.uid() or exists (
  select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid()
));

drop policy if exists "Demo work is public" on public.demo_projects;
create policy "Demo work is public" on public.demo_projects for select using (true);
drop policy if exists "Freelancers manage demo work" on public.demo_projects;
create policy "Freelancers manage demo work" on public.demo_projects for all to authenticated
using (freelancer_id = auth.uid()) with check (freelancer_id = auth.uid());

drop policy if exists "Message participants read" on public.messages;
create policy "Message participants read" on public.messages for select to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "Message participants send" on public.messages;
create policy "Message participants send" on public.messages for insert to authenticated
with check (sender_id = auth.uid() and sender_id <> recipient_id and exists (
  select 1 from public.projects p where p.id = project_id
  and (
    (p.client_id = sender_id and exists (
      select 1 from public.applications a where a.project_id = p.id
        and a.freelancer_id = recipient_id and a.status in ('pending','accepted')
    ))
    or
    (p.client_id = recipient_id and exists (
      select 1 from public.applications a where a.project_id = p.id
        and a.freelancer_id = sender_id and a.status in ('pending','accepted')
    ))
  )
));

drop policy if exists "Call participants read" on public.call_requests;
create policy "Call participants read" on public.call_requests for select to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "Call participants create" on public.call_requests;
create policy "Call participants create" on public.call_requests for insert to authenticated
with check (requester_id = auth.uid() and requester_id <> recipient_id and exists (
  select 1 from public.projects p where p.id = project_id
  and (
    (p.client_id = requester_id and exists (
      select 1 from public.applications a where a.project_id = p.id
        and a.freelancer_id = recipient_id and a.status in ('pending','accepted')
    ))
    or
    (p.client_id = recipient_id and exists (
      select 1 from public.applications a where a.project_id = p.id
        and a.freelancer_id = requester_id and a.status in ('pending','accepted')
    ))
  )
));
drop policy if exists "Call participants update" on public.call_requests;
create policy "Call participants update" on public.call_requests for update to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid())
with check (requester_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "Active project participants read" on public.active_projects;
create policy "Active project participants read" on public.active_projects for select to authenticated
using (client_id = auth.uid() or freelancer_id = auth.uid());
drop policy if exists "Active project participants create" on public.active_projects;
create policy "Active project participants create" on public.active_projects for insert to authenticated
with check (
  client_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.client_id = auth.uid())
  and exists (select 1 from public.applications a where a.project_id = project_id
    and a.freelancer_id = freelancer_id and a.status = 'accepted')
);
drop policy if exists "Active project participants update" on public.active_projects;
create policy "Active project participants update" on public.active_projects for update to authenticated
using (client_id = auth.uid() or freelancer_id = auth.uid())
with check (client_id = auth.uid() or freelancer_id = auth.uid());

drop policy if exists "Deliverable participants read" on public.deliverables;
create policy "Deliverable participants read" on public.deliverables for select to authenticated
using (exists (select 1 from public.active_projects a where a.id = active_project_id
  and (a.client_id = auth.uid() or a.freelancer_id = auth.uid())));
drop policy if exists "Deliverable participants manage" on public.deliverables;
create policy "Deliverable participants manage" on public.deliverables for all to authenticated
using (exists (select 1 from public.active_projects a where a.id = active_project_id
  and (a.client_id = auth.uid() or a.freelancer_id = auth.uid())))
with check (exists (select 1 from public.active_projects a where a.id = active_project_id
  and (a.client_id = auth.uid() or a.freelancer_id = auth.uid())));

drop policy if exists "Scope participants read" on public.scope_changes;
create policy "Scope participants read" on public.scope_changes for select to authenticated
using (exists (select 1 from public.active_projects a where a.id = active_project_id
  and (a.client_id = auth.uid() or a.freelancer_id = auth.uid())));
drop policy if exists "Scope participants create" on public.scope_changes;
create policy "Scope participants create" on public.scope_changes for insert to authenticated
with check (requested_by = auth.uid() and exists (
  select 1 from public.active_projects a where a.id = active_project_id
  and (a.client_id = auth.uid() or a.freelancer_id = auth.uid())
));
drop policy if exists "Scope participants approve" on public.scope_changes;
create policy "Scope participants approve" on public.scope_changes for update to authenticated
using (exists (select 1 from public.active_projects a where a.id = active_project_id
  and (a.client_id = auth.uid() or a.freelancer_id = auth.uid())))
with check (exists (select 1 from public.active_projects a where a.id = active_project_id
  and (a.client_id = auth.uid() or a.freelancer_id = auth.uid())));

drop policy if exists "Reviews are public" on public.reviews;
create policy "Reviews are public" on public.reviews for select using (true);
drop policy if exists "Project participants write reviews" on public.reviews;
create policy "Project participants write reviews" on public.reviews for insert to authenticated
with check (reviewer_id = auth.uid() and exists (
  select 1 from public.active_projects a where a.project_id = project_id and a.status = 'completed'
  and (a.client_id = auth.uid() or a.freelancer_id = auth.uid())
  and reviewee_id in (a.client_id, a.freelancer_id)
));

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select to authenticated
using (user_id = auth.uid());
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Small, visibly labeled examples for exploring both sides before signup.
insert into public.profiles (id, role, full_name, headline, bio, skills, experience_years, availability, hourly_rate, verified_skills, average_rating, review_count, is_demo)
values
  ('00000000-0000-4000-8000-000000000001','freelancer','Maya Chen','Product designer & front-end developer','I turn complex product ideas into clear, warm interfaces, then build them in React.','{"Product Design","React","TypeScript","Figma"}',6,'available',72,'{"React","Figma"}',4.9,18,true),
  ('00000000-0000-4000-8000-000000000002','freelancer','Arjun Mehta','Full-stack engineer','I build dependable web products with thoughtful API and database foundations.','{"Node.js","PostgreSQL","React","TypeScript"}',4,'available',58,'{"Node.js","PostgreSQL"}',4.8,12,true),
  ('00000000-0000-4000-8000-000000000003','freelancer','Nia Okafor','Fresh talent · React developer','Self-taught developer with three practical demo projects and strong communication.','{"React","JavaScript","CSS","Figma"}',0,'available',28,'{"React"}',5,3,true),
  ('00000000-0000-4000-8000-000000000004','client','Northstar Studio','Product team','A small product team building useful tools for independent businesses.','{}',0,'available',null,'{}',0,0,true)
on conflict (id) do nothing;

insert into public.projects (id, client_id, title, description, required_skills, optional_skills, budget_min, budget_max, deadline, project_type, deliverables, experience_level, status, risk_level, is_demo)
values
  ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000004','E-commerce storefront refresh','Redesign and build a focused storefront for a sustainable homewares brand, with a fast product discovery flow and accessible checkout.','{"React","TypeScript","Product Design"}','{"Shopify","Accessibility"}',4200,6200,current_date + 28,'fixed','{"Responsive storefront","Product listing and detail pages","Accessible checkout handoff"}','intermediate','open','low',true),
  ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000004','Client portal for a creative studio','Create a private project portal for sharing milestones, files and feedback between a small studio and its clients.','{"React","Node.js","PostgreSQL"}','{"Authentication","UX Design"}',6500,9000,current_date + 42,'fixed','{"Portal dashboard","Milestone tracking","Feedback flow"}','expert','open','medium',true),
  ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000004','Landing page for a climate nonprofit','Build a concise, mobile-first campaign page with a clear story and newsletter signup.','{"React","CSS","Figma"}','{"Copywriting","Analytics"}',1400,2400,current_date + 18,'fixed','{"Responsive campaign page","Newsletter signup","CMS-ready sections"}','beginner','open','low',true)
on conflict (id) do nothing;

insert into public.demo_projects (id, freelancer_id, title, description, technologies, screenshot_urls, github_url, live_demo_url)
values
  ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000003','Neighborhood Pantry','A demo grocery storefront with accessible filters and a responsive checkout flow.','{"React","JavaScript","CSS"}','{}',null,null),
  ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000001','Field Notes','A personal research journal that makes complex notes easier to scan and share.','{"Figma","React","TypeScript"}','{}',null,null),
  ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000002','Studio Billing API','A small API demo for invoice status, payment reminders and audit history.','{"Node.js","PostgreSQL","REST"}','{}',null,null)
on conflict (id) do nothing;

insert into public.reviews (id, project_id, reviewer_id, reviewee_id, overall_rating, categories, content)
values
  ('00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001',5,'{"communication":5,"technical_skill":5,"deadline":5}','Maya brought structure to a busy brief and communicated clearly at every milestone.'),
  ('00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002',5,'{"communication":5,"technical_skill":5,"deadline":4}','Arjun made the system easy to maintain and kept the handoff clear.'),
  ('00000000-0000-4000-8000-000000000903','00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003',5,'{"communication":5,"technical_skill":5,"deadline":5}','Nia showed thoughtful problem-solving and documented the demo work carefully.')
on conflict (id) do nothing;
