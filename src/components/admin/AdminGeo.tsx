import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Globe, Plus, Trash2, ShieldBan, ShieldCheck } from "lucide-react";

const LANGUAGES = ["EN", "AR", "TR", "HI", "PT", "RU", "KO", "JA"];
const CURRENCIES = ["USD", "EUR", "GBP", "TRY", "INR", "BRL", "RUB", "KRW", "JPY", "AED", "BTC", "ETH", "USDT"];

const FLAG_URL = (code: string) => `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;

interface GeoEntry {
  id: string;
  country_code: string;
  country_name: string;
  is_blocked: boolean;
  currency: string;
  language: string;
  created_at: string;
}

export default function AdminGeo() {
  const [entries, setEntries] = useState<GeoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", currency: "USD", language: "EN", blocked: false });

  const fetch = async () => {
    const { data, error } = await supabase.from("geo_settings").select("*").order("country_name");
    if (!error && data) setEntries(data as GeoEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleAdd = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Country code and name required"); return; }
    const { error } = await supabase.from("geo_settings").insert({
      country_code: form.code.trim().toUpperCase(),
      country_name: form.name.trim(),
      currency: form.currency,
      language: form.language,
      is_blocked: form.blocked,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Country already exists" : "Failed to add");
      return;
    }
    toast.success("Country added");
    setForm({ code: "", name: "", currency: "USD", language: "EN", blocked: false });
    setShowForm(false);
    fetch();
  };

  const handleRemove = async (id: string) => {
    await supabase.from("geo_settings").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success("Country removed");
  };

  const toggleBlock = async (id: string, current: boolean) => {
    await supabase.from("geo_settings").update({ is_blocked: !current }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_blocked: !current } : e));
    toast.success(!current ? "Country blocked" : "Country allowed");
  };

  const updateField = async (id: string, field: "currency" | "language", value: string) => {
    await supabase.from("geo_settings").update({ [field]: value }).eq("id", id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const blocked = entries.filter(e => e.is_blocked);
  const allowed = entries.filter(e => !e.is_blocked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Globe className="h-5 w-5 text-orange-400" /> Geo Settings</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="casino-gold-gradient text-black font-bold text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Country
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-white/10 p-4 space-y-3" style={{ background: "#ffffff" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Country Code (e.g. US)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="bg-white/5 border-white/10 text-white" maxLength={2} />
            <Input placeholder="Country Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-white/60 text-xs">
              <input type="checkbox" checked={form.blocked} onChange={e => setForm(f => ({ ...f, blocked: e.target.checked }))} className="accent-red-500" />
              Block this country
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} size="sm" className="casino-gold-gradient text-black font-bold text-xs">Add</Button>
            <Button onClick={() => setShowForm(false)} size="sm" variant="ghost" className="text-white/50 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Blocked countries */}
      <div>
        <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1.5"><ShieldBan className="h-4 w-4" /> Blocked Countries ({blocked.length})</h3>
        <div className="rounded-xl border border-red-500/20 overflow-hidden" style={{ background: "#ffffff" }}>
          {blocked.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-6">No blocked countries</p>
          ) : (
            <div className="flex flex-wrap gap-2 p-3">
              {blocked.map(e => (
                <div key={e.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <img src={FLAG_URL(e.country_code)} alt={e.country_code} className="h-3.5 rounded-sm" onError={ev => (ev.currentTarget.style.display = "none")} />
                  <span className="text-white text-xs">{e.country_name}</span>
                  <button onClick={() => toggleBlock(e.id, true)} className="text-green-400 hover:text-green-300 ml-1" title="Allow">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleRemove(e.id)} className="text-red-400 hover:text-red-300" title="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All countries table */}
      <div>
        <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> All Countries ({entries.length})</h3>
        <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "#ffffff" }}>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/50 text-xs">Country</TableHead>
                <TableHead className="text-white/50 text-xs">Code</TableHead>
                <TableHead className="text-white/50 text-xs">Status</TableHead>
                <TableHead className="text-white/50 text-xs">Currency</TableHead>
                <TableHead className="text-white/50 text-xs">Language</TableHead>
                <TableHead className="text-white/50 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-white/30 py-8">Loading...</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-white/30 py-8">No countries configured</TableCell></TableRow>
              ) : entries.map(e => (
                <TableRow key={e.id} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="text-white text-xs font-medium flex items-center gap-2">
                    <img src={FLAG_URL(e.country_code)} alt={e.country_code} className="h-3.5 rounded-sm" onError={ev => (ev.currentTarget.style.display = "none")} />
                    {e.country_name}
                  </TableCell>
                  <TableCell className="text-white/60 text-xs font-mono">{e.country_code}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.is_blocked ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                      {e.is_blocked ? "Blocked" : "Allowed"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select value={e.currency} onValueChange={v => updateField(e.id, "currency", v)}>
                      <SelectTrigger className="h-7 w-20 bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={e.language} onValueChange={v => updateField(e.id, "language", v)}>
                      <SelectTrigger className="h-7 w-16 bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleBlock(e.id, e.is_blocked)} className={`h-7 w-7 p-0 ${e.is_blocked ? "text-green-400" : "text-red-400"}`}>
                      {e.is_blocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldBan className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(e.id)} className="text-red-400 hover:text-red-300 h-7 w-7 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
