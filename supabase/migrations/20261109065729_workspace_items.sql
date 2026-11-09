create table public.pm_workspace_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.pm_profiles(id) on delete cascade,
  kind text not null check (kind in ('NOTE','ROUTINE','CAPTURE','FIT','PREFERENCES')),
  title text not null check (length(title) between 1 and 500),
  content text not null default '' check (length(content) <= 30000),
  data jsonb not null default '{}'::jsonb,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pm_workspace_items_owner_updated on public.pm_workspace_items(user_id, updated_at desc);
create unique index pm_workspace_items_preferences on public.pm_workspace_items(user_id) where kind='PREFERENCES';
create unique index pm_workspace_items_task_fit on public.pm_workspace_items(user_id, (data->>'task_id')) where kind='FIT';
alter table public.pm_workspace_items enable row level security;
create policy pm_workspace_items_owner_select on public.pm_workspace_items for select to authenticated using ((select auth.uid())=user_id);
create policy pm_workspace_items_owner_insert on public.pm_workspace_items for insert to authenticated with check ((select auth.uid())=user_id);
create policy pm_workspace_items_owner_update on public.pm_workspace_items for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy pm_workspace_items_owner_delete on public.pm_workspace_items for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.pm_workspace_items to authenticated;
grant all on public.pm_workspace_items to service_role;
revoke all on public.pm_workspace_items from anon;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('pm-captures','pm-captures',false,3145728,array['image/png','image/jpeg','image/webp']);
-- Screenshots are accessed through authenticated PerMan routes and short-lived signed URLs.

alter table public.pm_tasks add column pm_recurrence_parent_id uuid references public.pm_tasks(id) on delete set null;
create unique index pm_tasks_recurrence_parent_unique on public.pm_tasks(pm_recurrence_parent_id) where pm_recurrence_parent_id is not null;

create function public.pm_complete_task(p_user_id uuid,p_task_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  current_task public.pm_tasks%rowtype;
  result_task public.pm_tasks%rowtype;
  step interval;
  frequency text;
  repeat_interval integer;
  max_count integer;
  current_count integer;
  end_cutoff timestamptz;
  next_rule jsonb;
  next_due timestamptz;
  next_reminder timestamptz;
begin
  select * into current_task from public.pm_tasks where id=p_task_id and user_id=p_user_id for update;
  if not found then raise exception 'Task not found'; end if;
  if current_task.status='DONE' then return to_jsonb(current_task); end if;
  update public.pm_tasks set status='DONE',completed_at=now(),updated_at=now() where id=p_task_id and user_id=p_user_id returning * into result_task;
  update public.pm_reminders set status='DISMISSED',updated_at=now() where task_id=p_task_id and user_id=p_user_id and status in ('PENDING','SNOOZED');
  frequency := current_task.recurrence_rule->>'frequency';
  if current_task.due_date is not null and frequency in ('DAILY','WEEKLY','MONTHLY','YEARLY') then
    -- Check recurrence count termination
    if (current_task.recurrence_rule ? 'count') and (current_task.recurrence_rule->>'count') is not null then
      max_count := (current_task.recurrence_rule->>'count')::integer;
      current_count := coalesce((current_task.recurrence_rule->>'current_occurrence')::integer, 1);
      if current_count >= max_count then
        return to_jsonb(result_task);
      end if;
    end if;

    repeat_interval := greatest(1,least(1000,coalesce((current_task.recurrence_rule->>'interval')::integer,1)));
    step := case frequency when 'DAILY' then make_interval(days=>repeat_interval) when 'WEEKLY' then make_interval(days=>repeat_interval*7) when 'MONTHLY' then make_interval(months=>repeat_interval) else make_interval(years=>repeat_interval) end;
    next_due := ((current_task.due_date at time zone current_task.timezone)+step) at time zone current_task.timezone;

    -- Check recurrence end_date termination
    if (current_task.recurrence_rule ? 'end_date') and (current_task.recurrence_rule->>'end_date') is not null then
      end_cutoff := (current_task.recurrence_rule->>'end_date')::timestamptz;
      if next_due > end_cutoff then
        return to_jsonb(result_task);
      end if;
    end if;

    if current_task.reminder_time is not null then next_reminder := ((current_task.reminder_time at time zone current_task.timezone)+step) at time zone current_task.timezone; end if;

    -- Advance current_occurrence count in child task
    next_rule := jsonb_set(
      current_task.recurrence_rule,
      '{current_occurrence}',
      to_jsonb(coalesce((current_task.recurrence_rule->>'current_occurrence')::integer, 1) + 1)
    );

    insert into public.pm_tasks(user_id,title,description,category_id,subcategory_id,project_id,status,priority,due_date,reminder_time,timezone,recurrence_rule,source,external_url,merchant,estimated_amount,pm_recurrence_parent_id)
      values(p_user_id,current_task.title,replace(current_task.description,'☑','☐'),current_task.category_id,current_task.subcategory_id,current_task.project_id,'SCHEDULED',current_task.priority,next_due,next_reminder,current_task.timezone,next_rule,current_task.source,current_task.external_url,current_task.merchant,current_task.estimated_amount,current_task.id)
      on conflict (pm_recurrence_parent_id) where pm_recurrence_parent_id is not null do nothing;
    if found and next_reminder is not null then
      insert into public.pm_reminders(user_id,task_id,remind_at,status,channel)
        select p_user_id,id,next_reminder,'PENDING','EMAIL' from public.pm_tasks where pm_recurrence_parent_id=current_task.id and user_id=p_user_id;
    end if;
  end if;
  return to_jsonb(result_task);
end;
$$;
revoke all on function public.pm_complete_task(uuid,uuid) from public,anon,authenticated;
grant execute on function public.pm_complete_task(uuid,uuid) to service_role;
