import { useMemo, useState } from "react";
import { BriefcaseBusiness, ExternalLink, Filter, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statuses = ["saved", "applied", "interview", "offer", "rejected"] as const;
const statusLabels: Record<string, string> = { saved: "Saved", applied: "Applied", interview: "Interview", offer: "Offer", rejected: "Rejected" };
const statusStyles: Record<string, string> = { saved: "border-slate-400/30 bg-slate-400/10 text-slate-200", applied: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200", interview: "border-violet-400/30 bg-violet-400/10 text-violet-200", offer: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200", rejected: "border-rose-400/30 bg-rose-400/10 text-rose-200" };

export default function JobTracker() {
  const query = trpc.applications.list.useQuery();
  const createMutation = trpc.applications.create.useMutation();
  const updateMutation = trpc.applications.update.useMutation();
  const deleteMutation = trpc.applications.delete.useMutation();
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ company: "", role: "", location: "", jobUrl: "", salary: "", notes: "", status: "saved" as typeof statuses[number] });

  const applications = query.data ?? [];
  const filtered = useMemo(() => applications.filter((application) => {
    const matchesFilter = filter === "all" || application.status === filter;
    const haystack = `${application.company} ${application.role} ${application.location || ""}`.toLowerCase();
    return matchesFilter && haystack.includes(search.toLowerCase());
  }), [applications, filter, search]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return toast.error("Add a company and role first.");
    try {
      await createMutation.mutateAsync(form);
      await utils.applications.list.invalidate();
      setForm({ company: "", role: "", location: "", jobUrl: "", salary: "", notes: "", status: "saved" });
      setShowForm(false);
      toast.success("Job added to your tracker.");
    } catch { toast.error("Could not save this job. Try again."); }
  };

  const updateStatus = async (id: number, status: typeof statuses[number]) => {
    try { await updateMutation.mutateAsync({ id, status }); await utils.applications.list.invalidate(); toast.success(`Marked as ${statusLabels[status].toLowerCase()}.`); } catch { toast.error("Could not update the application."); }
  };

  const remove = async (id: number) => {
    try { await deleteMutation.mutateAsync({ id }); await utils.applications.list.invalidate(); toast.success("Application removed."); } catch { toast.error("Could not remove the application."); }
  };

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="relative overflow-hidden rounded-3xl border border-violet/20 bg-gradient-to-br from-violet/15 via-background to-primary/10 p-6 sm:p-8"><div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet/15 blur-3xl" /><div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><Badge className="mb-3 border-violet/20 bg-violet/10 text-violet-200">Application command center</Badge><h1 className="text-3xl font-bold tracking-tight"><span className="text-gradient-full">Keep every opportunity moving</span></h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Save roles, update your pipeline, and keep your next follow-up visible.</p></div><Button onClick={() => setShowForm((value) => !value)} className="bg-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Add application</Button></div></div>
    {showForm && <Card className="glass-card border-primary/20"><CardHeader><CardTitle className="text-lg">Save a new opportunity</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="company">Company</Label><Input id="company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="e.g. Stripe" /></div><div className="space-y-2"><Label htmlFor="role">Role</Label><Input id="role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="e.g. Software Engineer" /></div><div className="space-y-2"><Label htmlFor="location">Location</Label><Input id="location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Remote or city" /></div><div className="space-y-2"><Label htmlFor="salary">Salary range</Label><Input id="salary" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} placeholder="Optional" /></div><div className="space-y-2 md:col-span-2"><Label htmlFor="jobUrl">Job link</Label><Input id="jobUrl" type="url" value={form.jobUrl} onChange={(event) => setForm({ ...form, jobUrl: event.target.value })} placeholder="https://" /></div><div className="space-y-2 md:col-span-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Recruiter, referral, follow-up date..." /></div><div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={createMutation.isPending} className="bg-primary text-primary-foreground">Save job</Button></div></form></CardContent></Card>}
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, role, or location" className="pl-9" /></div><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((status) => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent></Select></div></div>
    {query.isLoading ? <div className="grid gap-4 md:grid-cols-2"><div className="h-40 animate-pulse rounded-2xl bg-accent/20" /><div className="h-40 animate-pulse rounded-2xl bg-accent/20" /></div> : filtered.length === 0 ? <Card className="glass-card border-0"><CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BriefcaseBusiness className="h-7 w-7" /></div><h2 className="text-lg font-semibold">{applications.length ? "No matching applications" : "Your pipeline starts here"}</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">{applications.length ? "Try another search or status filter." : "Save your first role and turn scattered job hunting into a clear next step."}</p>{!applications.length && <Button onClick={() => setShowForm(true)} className="mt-5 bg-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Save your first job</Button>}</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{filtered.map((application) => <Card key={application.id} className="glass-card border-0 transition hover:-translate-y-0.5 hover:border-primary/20"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-lg font-semibold">{application.role}</p><p className="mt-1 truncate text-sm text-primary">{application.company}</p></div><Badge variant="outline" className={statusStyles[application.status]}>{statusLabels[application.status]}</Badge></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{application.location && <span>{application.location}</span>}{application.salary && <span>{application.salary}</span>}</div>{application.notes && <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{application.notes}</p>}<div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4"><Select value={application.status} onValueChange={(value) => updateStatus(application.id, value as typeof statuses[number])}><SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}</SelectContent></Select>{application.jobUrl && <Button asChild variant="ghost" size="sm"><a href={application.jobUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />Open link</a></Button>}<Button variant="ghost" size="sm" onClick={() => remove(application.id)} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" />Remove</Button></div></CardContent></Card>)}</div>}
  </div>;
}
