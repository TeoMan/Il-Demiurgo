import { useState, useEffect, useRef } from "react";
const uid = () => Math.random().toString(36).slice(2, 9);
const MODEL = "claude-sonnet-4-20250514";

async function aiCall(msgs, sys, maxTok = 2400) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTok, system: sys, messages: msgs }),
    });
    const d = await r.json();
    return d.content?.find(b => b.type === "text")?.text || "";
  } catch { return ""; }
}
async function dbGet(k) { try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function dbSet(k, v) { try { await window.storage.set(k, JSON.stringify(v)); } catch {} }
async function shGet(k) { try { const r = await window.storage.get(k, true); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function shSet(k, v) { try { await window.storage.set(k, JSON.stringify(v), true); } catch {} }

const mkSHK = (room) => ({
  campaign:   room + ":sh_campaign",
  recap:      room + ":sh_recap",
  plots:      room + ":sh_plots",
  initiative: room + ":sh_initiative",
  ann:        room + ":sh_ann",
  pc: n => room + ":sh_pc:" + n.toLowerCase().replace(/[^a-z0-9]/g, "_"),
});
const ROOM_WORDS = ["DRAGO","ELFO","NANO","ORCO","MAGO","BARDO","LADRO","PALADINO","DRUIDO","RANGER","STREGA","GOLEM"];
const genRoomCode = () => ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)] + "-" + String(Math.floor(Math.random() * 9000) + 1000);

function Card({ children, className = "", onClick }) {
  return <div className={"bg-zinc-800 border border-zinc-700 rounded-xl p-4 " + (onClick ? "cursor-pointer hover:border-red-700/60 transition-colors " : "") + className} onClick={onClick}>{children}</div>;
}
function PCard({ children, className = "", onClick }) {
  return <div className={"bg-zinc-800 border border-zinc-700 rounded-xl p-4 " + (onClick ? "cursor-pointer hover:border-blue-600/60 transition-colors " : "") + className} onClick={onClick}>{children}</div>;
}
function Btn({ children, onClick, variant = "primary", size = "md", disabled = false, className = "" }) {
  const s = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2", lg: "px-6 py-3 text-base" }[size];
  const v = {
    primary: "bg-red-800 text-zinc-100 hover:bg-red-700 font-semibold",
    secondary: "bg-zinc-700 text-zinc-200 hover:bg-zinc-600",
    danger: "bg-red-900 text-red-200 hover:bg-red-800 border border-red-700",
    ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700",
    ai: "bg-purple-900/60 text-purple-200 hover:bg-purple-800/70 border border-purple-700/50",
    player: "bg-blue-800 text-zinc-100 hover:bg-blue-700 font-semibold",
    pSecondary: "bg-blue-900/40 text-blue-200 hover:bg-blue-800/50 border border-blue-700/50",
  }[variant];
  return <button onClick={onClick} disabled={disabled} className={"rounded-lg transition-colors disabled:opacity-40 " + s + " " + v + " " + className}>{children}</button>;
}
function Inp({ value, onChange, placeholder, type = "text", className = "", ...p }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={"bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-700 w-full " + className} {...p} />;
}
function PInp({ value, onChange, placeholder, type = "text", className = "", ...p }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={"bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 w-full " + className} {...p} />;
}
function Txta({ value, onChange, placeholder, rows = 4, className = "" }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={"bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-700 w-full resize-none " + className} />;
}
function PTxta({ value, onChange, placeholder, rows = 4, className = "" }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={"bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 w-full resize-none " + className} />;
}
function Badge({ children, color = "gold" }) {
  const c = { gold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", blue: "bg-blue-500/20 text-blue-400 border-blue-500/30", red: "bg-red-500/20 text-red-400 border-red-500/30", green: "bg-green-500/20 text-green-400 border-green-500/30", zinc: "bg-zinc-600/40 text-zinc-400 border-zinc-500/30", purple: "bg-purple-500/20 text-purple-300 border-purple-500/30", cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", orange: "bg-orange-500/20 text-orange-300 border-orange-500/30" }[color] || "bg-zinc-600/40 text-zinc-400";
  return <span className={"text-xs px-2 py-0.5 rounded-full border " + c}>{children}</span>;
}
function parseLine(line) {
  return line.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i} className="text-yellow-400 font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i} className="text-zinc-300 italic">{p.slice(1, -1)}</em>;
    return p;
  });
}
function MD({ text }) {
  if (!text) return null;
  return (
    <div className="space-y-1 text-sm text-zinc-300">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="text-yellow-400 font-bold mt-3">{parseLine(line.slice(4))}</p>;
        if (line.startsWith("## "))  return <p key={i} className="text-yellow-300 font-bold text-base mt-4">{parseLine(line.slice(3))}</p>;
        if (line.startsWith("# "))   return <p key={i} className="text-yellow-200 font-bold text-lg mt-4">{parseLine(line.slice(2))}</p>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <p key={i} className="flex gap-2"><span className="text-red-400 shrink-0 mt-0.5">–</span><span>{parseLine(line.slice(2))}</span></p>;
        if (/^\d+\.\s/.test(line)) { const m = line.match(/^(\d+)\.\s(.*)/); return m ? <p key={i} className="flex gap-2"><span className="text-red-400 shrink-0">{m[1]}.</span><span>{parseLine(m[2])}</span></p> : <p key={i}>{parseLine(line)}</p>; }
        if (line === "" || line === "---") return <div key={i} className="h-1.5" />;
        return <p key={i}>{parseLine(line)}</p>;
      })}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-700 shrink-0">
          <h2 className="text-xl font-bold text-yellow-400">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, extra }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full p-6">
        <p className="text-zinc-200 mb-4 whitespace-pre-line">{message}</p>
        {extra}
        <div className="flex justify-end gap-3 mt-5"><Btn variant="secondary" onClick={onCancel}>Annulla</Btn><Btn variant="danger" onClick={onConfirm}>Conferma</Btn></div>
      </div>
    </div>
  );
}
function AISuggestBox({ loading, result, onAccept, onDismiss }) {
  if (!loading && !result) return null;
  return (
    <div className="mt-2 bg-purple-950/50 border border-purple-700/40 rounded-xl p-3">
      {loading ? <p className="text-purple-300 text-xs animate-pulse">✨ Generando suggerimento...</p> : (
        <div className="space-y-2">
          <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Suggerimento AI</p>
          {Object.entries(result).filter(([k]) => k !== "_type").map(([k, v]) => <div key={k}><span className="text-zinc-500 text-xs capitalize">{k}: </span><span className="text-zinc-200 text-xs">{v}</span></div>)}
          <div className="flex gap-2 pt-1"><Btn size="sm" variant="ai" onClick={() => onAccept(result)}>✓ Aggiungi</Btn><Btn size="sm" variant="ghost" onClick={onDismiss}>✕ Scarta</Btn></div>
        </div>
      )}
    </div>
  );
}

function BodyEditPreview({ body, onChange }) {
  const [mode, setMode] = useState("preview");
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-zinc-400">Testo</label>
        <div className="flex gap-1 bg-zinc-700 rounded-lg p-0.5">
          {[["preview","👁 Anteprima"],["edit","✏️ Modifica"]].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)}
              className={"px-2 py-0.5 rounded-md text-xs transition-colors " + (mode === m ? "bg-zinc-500 text-zinc-100 font-semibold" : "text-zinc-400 hover:text-zinc-200")}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {mode === "preview" ? (
        <div className="bg-zinc-700/60 border border-zinc-600 rounded-lg px-3 py-2.5 min-h-28 max-h-64 overflow-y-auto">
          {body.trim() ? <MD text={body} /> : <p className="text-zinc-500 text-xs italic">Nessun testo.</p>}
        </div>
      ) : (
        <Txta value={body} onChange={onChange} rows={7} />
      )}
    </div>
  );
}

function SaveSnippetModal({ text, onSavePlot, onSaveChar, onSaveSession, onSaveNote, onClose }) {
  const [mode, setMode] = useState(""); const [title, setTitle] = useState(""); const [body, setBody] = useState(text.slice(0, 5000)); const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const modes = [
    { id: "plot", label: "📜 Trama", hint: "Salvata come trama.", needTitle: true, tLabel: "Titolo trama", tPh: "La cospirazione..." },
    { id: "char", label: "👤 PNG", hint: "Salvato come nuovo PNG.", needTitle: true, tLabel: "Nome PNG", tPh: "Vyrenna..." },
    { id: "session", label: "📅 Sessione", hint: "Salvata come nuova sessione.", needTitle: true, tLabel: "Titolo", tPh: "La notte dell'oracolo..." },
    { id: "note", label: "📝 Note", hint: "Aggiunto alle note.", needTitle: false, tLabel: "", tPh: "" },
  ];
  const cur = modes.find(m => m.id === mode);
  const doSave = () => {
    if (mode === "plot") onSavePlot({ id: uid(), title: title || "Spunto", description: body, status: "hidden", relatedChars: [], notes: "" });
    else if (mode === "char") onSaveChar({ id: uid(), name: title || "PNG", type: "png", race: "", class: "", level: "", background: body, notes: "", hp: "", maxHp: "", ac: "" });
    else if (mode === "session") onSaveSession({ id: uid(), title: title || "Sessione", date: today, summary: body, highlights: "", nextHooks: "" });
    else if (mode === "note") onSaveNote(body);
    setSaved(true); setTimeout(onClose, 1200);
  };
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-700 shrink-0">
          <h2 className="text-lg font-bold text-yellow-400">💾 Salva questa risposta</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-xl">✕</button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {saved ? <p className="text-green-400 text-center py-6 text-lg">✅ Salvato!</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">{modes.map(m => <button key={m.id} onClick={() => setMode(m.id)} className={"px-2 py-2 rounded-lg border text-xs transition-colors " + (mode === m.id ? "border-red-700 bg-red-800/30 text-zinc-100" : "border-zinc-700 text-zinc-400 hover:border-zinc-500")}>{m.label}</button>)}</div>
              {cur && <div className="space-y-3">
                <p className="text-xs text-zinc-500">{cur.hint}</p>
                {cur.needTitle && <div><label className="text-xs text-zinc-400 mb-1 block">{cur.tLabel}</label><Inp value={title} onChange={setTitle} placeholder={cur.tPh} /></div>}
                <BodyEditPreview body={body} onChange={setBody} />
                <div className="flex justify-end"><Btn onClick={doSave} disabled={cur.needTitle && !title.trim()}>Salva</Btn></div>
              </div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TONES = [
  { id: "epic", label: "Fantasy Epico", desc: "Eroi, draghi, destino", icon: "🐉" },
  { id: "dark", label: "Dark Fantasy", desc: "Moralità grigia, orrore", icon: "💀" },
  { id: "political", label: "Politico", desc: "Intrighi, potere", icon: "👑" },
  { id: "mystery", label: "Mistero", desc: "Segreti, indagini", icon: "🔍" },
  { id: "horror", label: "Horror", desc: "Terrore, sopravvivenza", icon: "🕯️" },
  { id: "adventure", label: "Avventura", desc: "Esplorazione", icon: "🗺️" },
];
const RULESETS = [
  { id: "5e2014", label: "D&D 5e (2014)", short: "5e 2014" },
  { id: "5e2024", label: "D&D 5e (2024)", short: "5e 2024" },
  { id: "3e5",    label: "D&D 3.5e",       short: "3.5e"    },
  { id: "pathfinder2", label: "Pathfinder 2e", short: "PF2e" },
  { id: "homebrew", label: "Homebrew / Custom", short: "Homebrew" },
];
const DM_TABS = [
  { id: "hub",        label: "Riepilogo",    icon: "📊" },
  { id: "world",      label: "Mondo",        icon: "🌍" },
  { id: "story",      label: "Narratore",    icon: "🔮" },
  { id: "characters", label: "Personaggi",   icon: "👤" },
  { id: "plots",      label: "Trame",        icon: "📜" },
  { id: "sessions",   label: "Sessioni",     icon: "📅" },
  { id: "notes",      label: "Note",         icon: "📝" },
  { id: "initiative", label: "Combattimento",icon: "⚔️" },
  { id: "rules",      label: "Regole",       icon: "📖" },
  { id: "share",      label: "Bacheca",      icon: "📡" },
];
const CONDITIONS = ["Accecato","Affascinato","Avvelenato","Esausto","Afferrato","Impaurito","Incapacitato","Invisibile","Paralizzato","Pietrificato","Prono","Trattenuto","Stordito"];
const QUICK_RULES = [
  { cat: "✨ Incantesimi", items: ["Palla di Fuoco — statistiche","Contromagia — meccaniche","Scudo — reazione","Maleficio — dettagli"] },
  { cat: "👹 Mostri", items: ["Goblin — scheda","Drago Rosso Adulto","Beholder — eye rays","Lich — abilità speciali"] },
  { cat: "📋 Regole", items: ["Come funziona il Grapple?","Regole per la copertura","Concentrazione","Azioni bonus","Tiri salvezza morte"] },
  { cat: "💎 Oggetti", items: ["Sacca Conservante","Spada Vorpal","Mantello di Invisibilità"] },
];
const STATS_KEYS = ["str","dex","con","int","wis","cha"];
const STATS_LABELS = ["FOR","DES","COS","INT","SAG","CAR"];
const BLANK_SLOTS = [0,0,0,0,0,0,0,0,0];

const SLOT_FULL    = [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];
const SLOT_HALF    = [[],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]];
const SLOT_WARLOCK = [[1],[2],[0,2],[0,2],[0,0,2],[0,0,2],[0,0,0,2],[0,0,0,2],[0,0,0,0,2],[0,0,0,0,2],[0,0,0,0,3],[0,0,0,0,3],[0,0,0,0,3],[0,0,0,0,3],[0,0,0,0,3],[0,0,0,0,3],[0,0,0,0,4],[0,0,0,0,4],[0,0,0,0,4],[0,0,0,0,4]];

const getSpellSlots = (cls, lvl) => {
  const l = Math.max(1, Math.min(20, parseInt(lvl) || 1));
  const c = (cls || "").toLowerCase();
  const isFull    = ["mago","wizard","stregone","sorcerer","chierico","cleric","druido","druid","bardo","bard"].some(x => c.includes(x));
  const isHalf    = ["paladino","paladin","ranger"].some(x => c.includes(x));
  const isWarlock = ["warlock"].some(x => c.includes(x));
  const table = isFull ? SLOT_FULL : isHalf ? SLOT_HALF : isWarlock ? SLOT_WARLOCK : null;
  if (!table) return [...BLANK_SLOTS];
  const row = table[l - 1] || [];
  return BLANK_SLOTS.map((_, i) => row[i] || 0);
};

const formatProficiencies = (raw) => {
  if (!raw) return "";
  return raw.split(";").map(s => s.trim()).filter(Boolean).map(s => "- " + s).join("\n");
};

const SKILLS = [
  { key: "acrobatics",    label: "Acrobazia",          stat: "dex" },
  { key: "animalhand",    label: "Addestr. Animali",   stat: "wis" },
  { key: "arcana",        label: "Arcana",             stat: "int" },
  { key: "athletics",     label: "Atletica",           stat: "str" },
  { key: "deception",     label: "Inganno",            stat: "cha" },
  { key: "history",       label: "Storia",             stat: "int" },
  { key: "insight",       label: "Intuizione",         stat: "wis" },
  { key: "intimidation",  label: "Intimidazione",      stat: "cha" },
  { key: "investigation", label: "Investigare",        stat: "int" },
  { key: "medicine",      label: "Medicina",           stat: "wis" },
  { key: "nature",        label: "Natura",             stat: "int" },
  { key: "perception",    label: "Percezione",         stat: "wis" },
  { key: "performance",   label: "Esibizione",         stat: "cha" },
  { key: "persuasion",    label: "Persuasione",        stat: "cha" },
  { key: "religion",      label: "Religione",          stat: "int" },
  { key: "sleightofhand", label: "Rapidità di Mano",   stat: "dex" },
  { key: "stealth",       label: "Furtività",          stat: "dex" },
  { key: "survival",      label: "Sopravvivenza",      stat: "wis" },
];

const NOTE_TAGS = [
  { id: "generale", label: "Generale",  color: "zinc"   },
  { id: "sessione", label: "Sessione",  color: "blue"   },
  { id: "png",      label: "PNG",       color: "gold"   },
  { id: "luogo",    label: "Luogo",     color: "green"  },
  { id: "trama",    label: "Trama",     color: "red"    },
  { id: "regola",   label: "Regola",    color: "purple" },
  { id: "altro",    label: "Altro",     color: "orange" },
];

function MonsterModal({ monster, onClose, onAddToCombat }) {
  if (!monster) return null;
  const statMod = v => { const m = Math.floor(((v || 10) - 10) / 2); return (m >= 0 ? "+" : "") + m; };
  const statKeys = [["str","FOR"],["dex","DES"],["con","COS"],["int","INT"],["wis","SAG"],["cha","CAR"]];
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-red-900/60 rounded-2xl max-w-2xl w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-zinc-700 bg-red-950/30 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">{monster.name}</h2>
            <p className="text-zinc-400 text-sm mt-0.5 italic">{monster.type}</p>
            <div className="flex gap-2 mt-2">
              <Badge color="red">CR {monster.cr}</Badge>
              {monster.ac && <Badge color="zinc">🛡️ CA {monster.ac}</Badge>}
              {monster.maxHp && <Badge color="red">❤️ {monster.maxHp} HP</Badge>}
              {monster.speed && <Badge color="zinc">🏃 {monster.speed}</Badge>}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-xl ml-4 shrink-0">✕</button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">💪 Caratteristiche</p>
            <div className="grid grid-cols-6 gap-2">
              {statKeys.map(([k, label]) => (
                <div key={k} className="bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-center">
                  <p className="text-xs text-zinc-500 font-bold mb-0.5">{label}</p>
                  <p className="text-lg font-bold text-yellow-400">{statMod(monster[k])}</p>
                  <p className="text-xs text-zinc-500">{monster[k] || 10}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {monster.saves && Object.keys(monster.saves).length > 0 && (
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Tiri Salvezza</p>
                <p className="text-zinc-300 text-xs">{Object.entries(monster.saves).map(([k,v]) => `${k.toUpperCase()} ${v}`).join(" · ")}</p>
              </div>
            )}
            {monster.skills && Object.keys(monster.skills).length > 0 && (
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Competenze</p>
                <p className="text-zinc-300 text-xs">{Object.entries(monster.skills).map(([k,v]) => `${k} ${v}`).join(" · ")}</p>
              </div>
            )}
            {monster.damageImmunities && (
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Immunità</p>
                <p className="text-zinc-300 text-xs">{monster.damageImmunities}</p>
              </div>
            )}
            {monster.senses && (
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Sensi</p>
                <p className="text-zinc-300 text-xs">{monster.senses}</p>
              </div>
            )}
          </div>
          {monster.traits?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">✨ Tratti</p>
              <div className="space-y-2">
                {monster.traits.map((t, i) => (
                  <div key={i} className="bg-zinc-800/60 rounded-xl px-3 py-2 border border-zinc-700">
                    <p className="text-yellow-400 font-semibold text-sm">{t.name}</p>
                    <p className="text-zinc-300 text-xs mt-0.5 leading-relaxed">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster.actions?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">⚔️ Azioni</p>
              <div className="space-y-2">
                {monster.actions.map((a, i) => (
                  <div key={i} className="bg-red-950/30 rounded-xl px-3 py-2 border border-red-900/40">
                    <p className="text-red-300 font-semibold text-sm">{a.name}</p>
                    <p className="text-zinc-300 text-xs mt-0.5 leading-relaxed">{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster.legendaryActions?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">⭐ Azioni Leggendarie</p>
              <div className="space-y-2">
                {monster.legendaryActions.map((a, i) => (
                  <div key={i} className="bg-yellow-950/30 rounded-xl px-3 py-2 border border-yellow-900/40">
                    <p className="text-yellow-300 font-semibold text-sm">{a.name}</p>
                    {a.desc && <p className="text-zinc-300 text-xs mt-0.5 leading-relaxed">{a.desc}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2 border-t border-zinc-700">
            <Btn onClick={() => { onAddToCombat(monster); onClose(); }} className="flex-1">⚔️ Aggiungi al Combattimento</Btn>
            <Btn variant="secondary" onClick={onClose}>Chiudi</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CHANGE 1/5: RoleSelector — aggiunto percorso "senza codice" per giocatori ──
function DMRoomSelector({ onBack, onSelectDM }) {
  const [roomCode, setRoomCode] = useState(() => genRoomCode());
  const [copied, setCopied] = useState(false);
  const copyCode = () => { navigator.clipboard?.writeText(roomCode).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex items-center justify-center h-screen bg-zinc-950">
      <div className="max-w-md w-full p-8">
        <button onClick={onBack} className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 block">← Indietro</button>
        <div className="text-4xl mb-3 text-center">👑</div>
        <h2 className="text-2xl font-bold text-yellow-400 text-center mb-1">Entra come Master</h2>
        <p className="text-zinc-400 text-sm text-center mb-6">Genera o inserisci un codice stanza, poi condividilo con i giocatori.</p>
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 mb-4 space-y-3">
          <label className="text-xs text-zinc-500 uppercase tracking-wider block">Codice Stanza</label>
          <div className="flex gap-2">
            <input value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ""))} maxLength={16} className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2.5 text-yellow-400 font-mono font-bold text-lg tracking-widest focus:outline-none focus:border-yellow-500" />
            <button onClick={() => setRoomCode(genRoomCode())} className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded-lg text-zinc-300 transition-colors" title="Genera nuovo codice">🎲</button>
            <button onClick={copyCode} className={"px-3 py-2 border rounded-lg text-sm font-semibold transition-colors " + (copied ? "bg-green-700 border-green-600 text-white" : "bg-zinc-700 hover:bg-zinc-600 border-zinc-600 text-zinc-300")}>{copied ? "✅" : "📋"}</button>
          </div>
          <p className="text-zinc-500 text-xs">💡 Se hai già una campagna salvata, inserisci il codice usato in precedenza.</p>
        </div>
        <button onClick={() => roomCode.trim() && onSelectDM(roomCode.trim())} disabled={!roomCode.trim()}
          className="w-full py-4 bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-lg rounded-xl transition-colors">
          👑 Entra come Master →
        </button>
      </div>
    </div>
  );
}

function RoleSelector({ onSelectDM, onSelectPlayer }) {
  const [view, setView] = useState("home");
  // Con stanza
  const [playerRoom, setPlayerRoom] = useState("");
  const [playerName, setPlayerName] = useState("");
  // Senza codice (solo)
  const [soloName, setSoloName]       = useState("");
  const [soloRuleset, setSoloRuleset] = useState("5e2014");

  if (view === "dm") return <DMRoomSelector onBack={() => setView("home")} onSelectDM={onSelectDM} />;

  // Giocatore CON codice stanza
  if (view === "player") return (
    <div className="flex items-center justify-center h-screen bg-zinc-950">
      <div className="max-w-md w-full p-8">
        <button onClick={() => setView("home")} className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 block">← Indietro</button>
        <div className="text-4xl mb-3 text-center">🎮</div>
        <h2 className="text-2xl font-bold text-blue-400 text-center mb-1">Entra nella Stanza</h2>
        <p className="text-zinc-400 text-sm text-center mb-6">Inserisci il codice che ti ha dato il tuo Master.</p>
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 mb-5 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Codice Stanza</label>
            <input value={playerRoom} onChange={e => setPlayerRoom(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ""))} placeholder="es. DRAGO-7742" maxLength={16} className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2.5 text-yellow-400 font-mono font-bold text-lg tracking-widest focus:outline-none focus:border-blue-500 text-center" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Nome del personaggio</label>
            <PInp value={playerName} onChange={setPlayerName} placeholder="Es. Kael" className="text-center text-lg" />
          </div>
        </div>
        <button onClick={() => playerRoom.trim() && playerName.trim() && onSelectPlayer(playerRoom.trim(), playerName.trim(), null)}
          disabled={!playerRoom.trim() || !playerName.trim()}
          className="w-full py-4 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white font-bold text-lg rounded-xl transition-colors">
          🎮 Entra come Giocatore →
        </button>
        <p className="text-center mt-4 text-zinc-500 text-sm">Non hai ancora un codice?{" "}
          <button onClick={() => setView("solo")} className="text-blue-400 hover:text-blue-300 underline">Crea il tuo PG in autonomia →</button>
        </p>
      </div>
    </div>
  );

  // Giocatore SENZA codice — sceglie regolamento in autonomia
  if (view === "solo") return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center overflow-y-auto py-8">
      <div className="max-w-md w-full px-8">
        <button onClick={() => setView("home")} className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 block">← Indietro</button>
        <div className="text-4xl mb-3 text-center">✏️</div>
        <h2 className="text-2xl font-bold text-blue-400 text-center mb-1">Crea il tuo Personaggio</h2>
        <p className="text-zinc-400 text-sm text-center mb-6">
          Puoi creare il PG ora e unirti alla stanza del Master in seguito.<br/>
          <span className="text-zinc-600">Quando il Master ti darà il codice, torna qui e usa "Entra nella Stanza".</span>
        </p>
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 mb-5 space-y-5">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Nome del personaggio</label>
            <PInp value={soloName} onChange={setSoloName} placeholder="Es. Kael" className="text-center text-lg" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider mb-3 block">Regolamento</label>
            <div className="space-y-2">
              {RULESETS.map(r => (
                <button key={r.id} onClick={() => setSoloRuleset(r.id)}
                  className={"w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between " +
                    (soloRuleset === r.id ? "border-blue-600 bg-blue-900/30 text-zinc-100" : "border-zinc-700 text-zinc-400 hover:border-zinc-500")}>
                  <span className="font-medium">{r.label}</span>
                  {soloRuleset === r.id && <span className="text-blue-400 text-sm">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => soloName.trim() && onSelectPlayer("SOLO", soloName.trim(), soloRuleset)}
          disabled={!soloName.trim()}
          className="w-full py-4 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white font-bold text-lg rounded-xl transition-colors">
          ✏️ Inizia a creare →
        </button>
      </div>
    </div>
  );

  // Home
  return (
    <div className="flex items-center justify-center h-screen bg-zinc-950">
      <div className="text-center max-w-lg p-10">
        <div className="text-7xl mb-4">🧞</div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=New+Rocker&display=swap');`}</style>
        <h1 className="text-5xl text-yellow-400 mb-2 tracking-wide" style={{fontFamily:"'New Rocker', serif", textShadow:"0 0 12px rgba(250,204,21,0.8), 0 0 32px rgba(250,204,21,0.4), 0 0 64px rgba(250,204,21,0.2)"}}>Il Demiurgo</h1>
        <p className="text-zinc-300 text-lg mb-1">Master & Giocatori — Ambiente Condiviso</p>
        <p className="text-zinc-500 text-sm mb-10">Ogni campagna ha il suo <span className="text-yellow-400 font-semibold">codice stanza</span>.</p>
        <div className="flex flex-col gap-4">
          <button onClick={() => setView("dm")} className="w-full py-5 bg-red-900/40 hover:bg-red-800/50 border-2 border-red-700/60 hover:border-red-600 rounded-2xl transition-all"><div className="text-4xl mb-2">👑</div><p className="text-xl font-bold text-yellow-400">Sono il Master</p><p className="text-zinc-400 text-sm mt-1">Crea o accedi alla tua campagna con codice</p></button>
          <button onClick={() => setView("player")} className="w-full py-5 bg-blue-900/40 hover:bg-blue-800/50 border-2 border-blue-700/60 hover:border-blue-600 rounded-2xl transition-all"><div className="text-4xl mb-2">🎮</div><p className="text-xl font-bold text-blue-300">Sono un Giocatore</p><p className="text-zinc-400 text-sm mt-1">Inserisci il codice del Master o crea il PG in anticipo</p></button>
        </div>
      </div>
    </div>
  );
}

function WizardProgress({ step }) {
  const labels = ["","🌍 Mondo","👤 PG","👥 PNG","✨ Genera"];
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-zinc-500 mb-1"><span>Passo {step}/4</span><span>{labels[step]}</span></div>
      <div className="h-1 bg-zinc-700 rounded-full"><div className="h-1 bg-red-700 rounded-full transition-all" style={{ width: (step / 4 * 100) + "%" }} /></div>
    </div>
  );
}
function WizardStep0({ onNext, onRestore }) {
  const fileRef = useRef(null);
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md p-8">
        <div className="text-7xl mb-4">🧞</div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=New+Rocker&display=swap');`}</style>
        <h1 className="text-5xl text-yellow-400 mb-2 tracking-wide" style={{fontFamily:"'New Rocker', serif", textShadow:"0 0 12px rgba(250,204,21,0.8), 0 0 32px rgba(250,204,21,0.4), 0 0 64px rgba(250,204,21,0.2)"}}>Il Demiurgo</h1>
        <p className="text-zinc-300 mb-2 text-lg font-medium">Assistente del Master</p>
        <p className="text-zinc-500 text-sm mb-8">La procedura guidata ti aiuta a creare il mondo, i personaggi e le prime trame.</p>
        <div className="flex flex-col gap-3">
          <Btn size="lg" onClick={onNext}>🗺️ Crea Nuova Campagna</Btn>
          <button onClick={() => fileRef.current && fileRef.current.click()} className="w-full px-6 py-3 rounded-lg border-2 border-zinc-700 hover:border-yellow-500/50 text-zinc-400 hover:text-yellow-400 transition-colors text-base">📂 Carica Backup Esistente</button>
        </div>
        <input ref={fileRef} type="file" accept=".json" onChange={onRestore} className="hidden" />
      </div>
    </div>
  );
}
function WizardStep1({ world, setWorld, onNext }) {
  const [locName, setLocName] = useState(""); const [locDesc, setLocDesc] = useState(""); const [locType, setLocType] = useState("città");
  const WIZ_LOC_TYPES = ["città","borgo","dungeon","fortezza","porto","tempio","rovine","foresta","montagna","catena montuosa","fiume","lago","mare","pianura","deserto","palude","isola","altro"];
  const addLoc = () => { if (!locName.trim()) return; setWorld(w => ({ ...w, locations: [...(w.locations || []), { name: locName, desc: locDesc, type: locType }] })); setLocName(""); setLocDesc(""); };
  return (
    <div className="overflow-y-auto h-full p-8">
      <div className="max-w-2xl mx-auto">
        <WizardProgress step={1} />
        <h2 className="text-2xl font-bold text-yellow-400 mb-1">Il Tuo Mondo</h2>
        <p className="text-zinc-400 text-sm mb-5">Definisci il setting.</p>
        <div className="space-y-4">
          <div><label className="text-sm text-zinc-400 mb-1 block">Nome campagna</label><Inp value={world.name} onChange={v => setWorld(w => ({ ...w, name: v }))} placeholder="Le Terre Dimenticate..." /></div>
          <div><label className="text-sm text-zinc-400 mb-1 block">Regolamento</label><div className="flex gap-2 flex-wrap">{RULESETS.map(r => <button key={r.id} onClick={() => setWorld(w => ({ ...w, ruleset: r.id }))} className={"px-4 py-2 rounded-lg text-sm border transition-all " + ((world.ruleset || "5e2014") === r.id ? "border-red-700 bg-red-800/30 text-zinc-100 font-semibold" : "border-zinc-700 text-zinc-400 hover:border-zinc-500")}>{r.label}</button>)}</div></div>
          <div><label className="text-sm text-zinc-400 mb-2 block">Tono</label><div className="grid grid-cols-3 gap-2">{TONES.map(t => <button key={t.id} onClick={() => setWorld(w => ({ ...w, tone: t.id }))} className={"text-left p-3 rounded-xl border-2 transition-all " + (world.tone === t.id ? "border-red-700 bg-red-800/20" : "border-zinc-700 hover:border-zinc-500")}><p className="font-medium text-sm text-zinc-200">{t.icon} {t.label}</p><p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p></button>)}</div></div>
          <div><label className="text-sm text-zinc-400 mb-1 block">Descrizione</label><Txta value={world.description || ""} onChange={v => setWorld(w => ({ ...w, description: v }))} rows={4} placeholder="Atmosfera, fazioni, storia recente..." /></div>
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">📍 Luoghi chiave (opzionale)</label>
            {(world.locations || []).map((l, i) => <div key={i} className="flex items-center gap-2 mb-1 bg-zinc-700/40 px-3 py-1.5 rounded-lg"><span className="text-yellow-400 text-sm shrink-0">{l.name}</span>{l.desc && <span className="text-zinc-500 text-xs flex-1 truncate">— {l.desc}</span>}<button onClick={() => setWorld(w => ({ ...w, locations: w.locations.filter((_, j) => j !== i) }))} className="text-zinc-600 hover:text-red-400 text-xs ml-auto">✕</button></div>)}
            {(world.locations || []).length < 6 && <div className="flex gap-2 mt-1 flex-wrap"><select value={locType} onChange={e => setLocType(e.target.value)} className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-2 text-zinc-200 text-xs w-36 shrink-0"><option value="">— tipo —</option>{WIZ_LOC_TYPES.map(t => <option key={t}>{t}</option>)}</select><Inp value={locName} onChange={setLocName} placeholder="Nome luogo" className="flex-1 min-w-28" /><Inp value={locDesc} onChange={setLocDesc} placeholder="Descrizione breve" className="flex-1 min-w-28" /><Btn variant="secondary" size="sm" onClick={addLoc} disabled={!locName.trim()}>+</Btn></div>}
          </div>
        </div>
        <div className="flex justify-end mt-7"><Btn onClick={onNext} disabled={!world.name}>Avanti →</Btn></div>
      </div>
    </div>
  );
}
function WizardStep2({ pcs, setPcs, onBack, onNext }) {
  const upd = (id, k, v) => setPcs(p => p.map(x => x.id === id ? { ...x, [k]: v } : x));
  return (
    <div className="overflow-y-auto h-full p-8">
      <div className="max-w-2xl mx-auto">
        <WizardProgress step={2} />
        <h2 className="text-2xl font-bold text-yellow-400 mb-1">👤 Personaggi Giocatori</h2>
        <p className="text-zinc-400 text-sm mb-5">Il background dei PG è la materia prima per le trame.</p>
        <div className="space-y-3">
          {pcs.map(pc => (
            <Card key={pc.id} className="relative">
              {pcs.length > 1 && <button onClick={() => setPcs(p => p.filter(x => x.id !== pc.id))} className="absolute top-3 right-3 text-zinc-600 hover:text-red-400 text-xs">✕</button>}
              <div className="grid grid-cols-4 gap-2 mb-2">
                <div className="col-span-2"><label className="text-xs text-zinc-500 mb-1 block">Nome</label><Inp value={pc.name} onChange={v => upd(pc.id, "name", v)} placeholder="Kael" /></div>
                <div><label className="text-xs text-zinc-500 mb-1 block">Razza</label><Inp value={pc.race} onChange={v => upd(pc.id, "race", v)} placeholder="Elfo" /></div>
                <div><label className="text-xs text-zinc-500 mb-1 block">Classe</label><Inp value={pc.cls} onChange={v => upd(pc.id, "cls", v)} placeholder="Ranger" /></div>
              </div>
              <div><label className="text-xs text-zinc-500 mb-1 block">Background</label><Txta value={pc.background} onChange={v => upd(pc.id, "background", v)} rows={2} placeholder="Origini, motivazioni, segreti..." /></div>
            </Card>
          ))}
          {pcs.length < 7 && <button onClick={() => setPcs(p => [...p, { id: uid(), name: "", race: "", cls: "", level: "1", background: "" }])} className="w-full border-2 border-dashed border-zinc-700 hover:border-red-700/40 rounded-xl p-3 text-zinc-500 hover:text-red-400 text-sm transition-colors">+ Aggiungi PG</button>}
        </div>
        <div className="flex items-center gap-3 mt-7"><Btn variant="secondary" onClick={onBack}>← Indietro</Btn><button onClick={onNext} className="ml-auto text-sm text-zinc-500 hover:text-zinc-400 mr-2">Salta</button><Btn onClick={onNext} disabled={pcs.every(p => !p.name)}>Avanti →</Btn></div>
      </div>
    </div>
  );
}
function WizardStep3({ npcs, setNpcs, onBack, onNext }) {
  const updN = (id, k, v) => setNpcs(p => p.map(x => x.id === id ? { ...x, [k]: v } : x));
  return (
    <div className="overflow-y-auto h-full p-8">
      <div className="max-w-2xl mx-auto">
        <WizardProgress step={3} />
        <h2 className="text-2xl font-bold text-yellow-400 mb-1">👥 PNG</h2>
        <p className="text-zinc-400 text-sm mb-5">Aggiungi tutti i personaggi non giocanti.</p>
        <div className="space-y-3 mb-5">
          {npcs.map(npc => (
            <div key={npc.id} className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 relative">
              {npcs.length > 1 && <button onClick={() => setNpcs(p => p.filter(x => x.id !== npc.id))} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 text-sm">✕</button>}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="col-span-1"><label className="text-xs text-zinc-500 mb-1 block">Nome</label><Inp value={npc.name} onChange={v => updN(npc.id, "name", v)} placeholder="Nome" /></div>
                <div><label className="text-xs text-zinc-500 mb-1 block">Ruolo</label>
                  <select value={npc.role} onChange={e => updN(npc.id, "role", e.target.value)} className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-2 text-zinc-200 text-sm">
                    <option value="ally">Alleato</option><option value="neutral">Neutrale</option>
                    <option value="unknown">Misterioso</option><option value="nemico">Nemico</option>
                  </select>
                </div>
                <div><label className="text-xs text-zinc-500 mb-1 block">Descrizione</label><Inp value={npc.description} onChange={v => updN(npc.id, "description", v)} placeholder="Chi è, cosa fa" /></div>
              </div>
              <div><label className="text-xs text-zinc-500 mb-1 block">🔒 Nota Master</label><Inp value={npc.notes || ""} onChange={v => updN(npc.id, "notes", v)} placeholder="Segreto, doppio gioco..." /></div>
            </div>
          ))}
          <button onClick={() => setNpcs(p => [...p, { id: uid(), name: "", role: "ally", description: "" }])} className="text-sm text-zinc-500 hover:text-yellow-400 transition-colors">+ Aggiungi PNG</button>
        </div>
        <div className="flex items-center gap-3 mt-7"><Btn variant="secondary" onClick={onBack}>← Indietro</Btn><button onClick={onNext} className="ml-auto text-sm text-zinc-500 hover:text-zinc-400 mr-2">Salta</button><Btn onClick={onNext}>Avanti →</Btn></div>
      </div>
    </div>
  );
}
function WizardStep4({ world, pcs, npcs, onBack, onComplete }) {
  const [generating, setGenerating] = useState(false);
  const vPcs = pcs.filter(p => p.name), vNpcs = npcs.filter(n => n.name);
  const ruleset = RULESETS.find(r => r.id === (world.ruleset || "5e2014"))?.label || "D&D 5e";
  const handleGenerate = async () => {
    setGenerating(true);
    const locsText = (world.locations || []).length ? "\nLUOGHI: " + world.locations.map(l => l.name + " (" + l.type + ")" + (l.desc ? ": " + l.desc : "")).join("; ") : "";
    const nemici = vNpcs.filter(n => n.role === "nemico");
    const antsText = nemici.length ? "\nNEMICI: " + nemici.map(n => n.name + ": " + n.description).join("; ") : "";
    const altriPng = vNpcs.filter(n => n.role !== "nemico");
    const pngText = altriPng.length ? "\nPNG: " + altriPng.map(n => n.name + " (" + (n.role === "ally" ? "alleato" : n.role === "unknown" ? "misterioso" : "neutrale") + "): " + n.description).join("; ") : "";
    const prompt = "Campagna sandbox " + ruleset + ". MONDO: " + world.name + " (" + world.tone + ") -- " + (world.description || "") +
      locsText + antsText + pngText +
      "\nPG: " + (vPcs.map(p => p.name + " (" + p.race + " " + p.cls + "): " + p.background).join("\n") || "nessuno") +
      "\nGenera 5 trame iniziali. MAX 150 parole per 'description'. " +
      "\nSOLO JSON: [{\"title\":\"...\",\"description\":\"...\",\"status\":\"active\",\"tag\":\"\",\"relatedCharNames\":[]}]";
    let genPlots = [];
    try { const resp = await aiCall([{ role: "user", content: prompt }], "Sei un DM assistant. Rispondi in italiano. Solo JSON puro.", 3000); genPlots = JSON.parse(resp.replace(/```[a-z]*/g, "").replace(/```/g, "").trim()); } catch {}
    const allChars = [
      ...vPcs.map(p => ({ id: uid(), name: p.name, type: "pg", race: p.race, class: p.cls, level: p.level, background: p.background, notes: "", hp: "", maxHp: "", ac: "", role: "" })),
      ...vNpcs.map(n => ({ id: uid(), name: n.name, type: "png", race: "", class: "", level: "", background: n.description, notes: (n.role === "nemico" ? "ANTAGONISTA" : "") + (n.notes ? (n.role === "nemico" ? "\n" : "") + n.notes : ""), hp: "", maxHp: "", ac: "", role: n.role })),
    ];
    const allPlots = genPlots.map(p => ({ id: uid(), title: p.title, description: p.description, status: "active", tag: p.tag || "", notes: "", sharedWithPlayers: false, relatedChars: allChars.filter(c => (p.relatedCharNames || []).includes(c.name)).map(c => c.id) }));
    onComplete({ campaign: { ...world, geography: [], factions: [] }, characters: allChars, plots: allPlots });
    setGenerating(false);
  };
  if (generating) return <div className="flex items-center justify-center h-full"><div className="text-center p-8"><div className="text-7xl mb-5 animate-pulse">✨</div><h2 className="text-2xl font-bold text-yellow-400 mb-3">Costruendo il mondo...</h2></div></div>;
  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-md text-center p-8">
        <div className="text-7xl mb-5">🌍</div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Pronto!</h2>
        <div className="text-left bg-zinc-800/80 rounded-xl p-4 mb-6 space-y-2 text-sm border border-zinc-700">
          <p><span className="text-zinc-400">🌍 Mondo:</span> <span className="text-yellow-300 font-medium">{world.name}</span></p>
          <p><span className="text-zinc-400">📋 Regolamento:</span> <span className="text-zinc-200">{ruleset}</span></p>
          <p><span className="text-zinc-400">👤 PG:</span> <span className="text-zinc-200">{vPcs.length}</span></p>
        </div>
        <div className="flex gap-3"><Btn variant="secondary" onClick={onBack}>← Indietro</Btn><Btn onClick={handleGenerate} className="flex-1">✨ Genera e Inizia!</Btn></div>
      </div>
    </div>
  );
}
function Wizard({ onComplete, onRestore }) {
  const [step, setStep] = useState(0);
  const [world, setWorld] = useState({ name: "", tone: "epic", ruleset: "5e2014", description: "", locations: [] });
  const [pcs, setPcs] = useState([{ id: uid(), name: "", race: "", cls: "", level: "1", background: "" }]);
  const [npcs, setNpcs] = useState([{ id: uid(), name: "", role: "ally", description: "" }]);
  if (step === 0) return <WizardStep0 onNext={() => setStep(1)} onRestore={onRestore} />;
  if (step === 1) return <WizardStep1 world={world} setWorld={setWorld} onNext={() => setStep(2)} />;
  if (step === 2) return <WizardStep2 pcs={pcs} setPcs={setPcs} onBack={() => setStep(1)} onNext={() => setStep(3)} />;
  if (step === 3) return <WizardStep3 npcs={npcs} setNpcs={setNpcs} onBack={() => setStep(2)} onNext={() => setStep(4)} />;
  return <WizardStep4 world={world} pcs={pcs} npcs={npcs} onBack={() => setStep(3)} onComplete={onComplete} />;
}

function CampaignHub({ campaign, sessions, characters, plots }) {
  const activePlots = plots.filter(p => p.status === "active");
  const lastS = sessions.length ? sessions[sessions.length - 1] : null;
  const tone = TONES.find(t => t.id === campaign.tone);
  const ruleset = RULESETS.find(r => r.id === (campaign.ruleset || "5e2014"));
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-5"><h2 className="text-3xl font-bold text-yellow-400">{campaign.name}</h2><div className="flex items-center gap-2 mt-1 flex-wrap">{tone && <Badge color="gold">{tone.icon} {tone.label}</Badge>}{ruleset && <Badge color="zinc">{ruleset.label}</Badge>}</div></div>
      <div className="grid grid-cols-4 gap-3 mb-5">{[["📅 Sessioni", sessions.length], ["👤 PG", characters.filter(c => c.type === "pg").length], ["📜 Trame Attive", activePlots.length], ["📚 Trame Totali", plots.length]].map(([lab, val]) => <Card key={lab} className="text-center py-3"><div className="text-2xl font-bold text-yellow-400">{val}</div><div className="text-xs text-zinc-400">{lab}</div></Card>)}</div>
      <div className="grid grid-cols-3 gap-4">
        <Card><h3 className="text-yellow-500 font-semibold mb-3 text-sm">🌍 Il Mondo</h3>{campaign.description && <p className="text-zinc-300 text-sm mb-3 line-clamp-3">{campaign.description}</p>}<div className="space-y-1 max-h-40 overflow-y-auto">{(campaign.locations || []).map((l, i) => <div key={i} className="flex gap-1.5 text-xs"><Badge color="zinc">{l.type || "luogo"}</Badge><span className="text-yellow-400">{l.name}</span></div>)}{(campaign.locations || []).length === 0 && <p className="text-zinc-600 text-xs italic">Nessun luogo.</p>}</div></Card>
        <Card className="col-span-2"><h3 className="text-yellow-500 font-semibold mb-2 text-sm">📜 Trame Attive</h3>{activePlots.length === 0 ? <p className="text-zinc-500 text-sm">Nessuna.</p> : <div className="space-y-1">{activePlots.slice(0, 5).map(p => <div key={p.id} className="flex gap-2 items-center"><span className="text-red-400 shrink-0 text-xs">–</span><p className="text-zinc-200 text-sm">{p.title}</p>{p.sharedWithPlayers && <Badge color="cyan">👁 Visibile</Badge>}</div>)}</div>}</Card>
        <Card className="col-span-3"><h3 className="text-yellow-500 font-semibold mb-2 text-sm">📅 Ultima Sessione</h3>{lastS ? <div><p className="text-zinc-300 text-sm font-medium">#{sessions.length}: {lastS.title}</p>{lastS.summary && <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{lastS.summary}</p>}{lastS.nextHooks && <p className="text-yellow-500/60 text-xs mt-1">🔗 {lastS.nextHooks}</p>}</div> : <p className="text-zinc-500 text-sm">Nessuna sessione registrata.</p>}</Card>
      </div>
    </div>
  );
}

function WorldEditor({ campaign, onSave }) {
  const LOC_TYPES = ["città","borgo","dungeon","fortezza","porto","tempio","rovine","foresta","montagna","catena montuosa","fiume","lago","mare","pianura","deserto","palude","isola","altro"];
  const [form, setForm] = useState({ name: campaign.name || "", tone: campaign.tone || "epic", ruleset: campaign.ruleset || "5e2014", description: campaign.description || "", locations: campaign.locations || [] });
  const [saved, setSaved] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const prevCampaignRef = useRef(campaign);
  const autoSaveTimer = useRef(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (prevCampaignRef.current !== campaign) {
      prevCampaignRef.current = campaign;
      setForm({ name: campaign.name || "", tone: campaign.tone || "epic", ruleset: campaign.ruleset || "5e2014", description: campaign.description || "", locations: campaign.locations || [] });
    }
  }, [campaign]);
  // Autosalvataggio con debounce 2s su ogni modifica del form
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      onSave({ ...campaign, ...form });
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 1500);
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [form]);
  const [locName, setLocName] = useState(""), [locDesc, setLocDesc] = useState(""), [locType, setLocType] = useState("città");
  const [aiSuggest, setAiSuggest] = useState({ type: null, loading: false, result: null });
  const [dismissedLocs, setDismissedLocs] = useState([]);
  const [editingLocModal, setEditingLocModal] = useState(null);
  const upd = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };
  const saveAll = () => { onSave({ ...campaign, ...form }); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const updLocs = (newLocs) => { const updated = { ...form, locations: newLocs }; setForm(updated); onSave({ ...campaign, ...updated }); };
  const addLoc = () => { if (!locName.trim()) return; updLocs([...form.locations, { name: locName, desc: locDesc, type: locType }]); setLocName(""); setLocDesc(""); };
  const acceptSuggest = r => { updLocs([...form.locations, { name: r.name, desc: r.desc, type: r.type || "altro" }]); setAiSuggest({ type: null, loading: false, result: null }); };
  const ALL_LOC_TYPES = ["dungeon","rovine","tempio","foresta","montagna","palude","isola","deserto","pianura","lago","fiume","mare","fortezza","porto","borgo","città","catena montuosa","altro"];
  const aiSuggestLoc = async () => {
    setAiSuggest({ type: "loc", loading: true, result: null });
    const existingLocs = form.locations.map(l => l.name).join(", ");
    const existingTypes = form.locations.map(l => l.type);
    const unusedTypes = ALL_LOC_TYPES.filter(t => !existingTypes.includes(t));
    const forcedType = unusedTypes.length ? unusedTypes[Math.floor(Math.random() * unusedTypes.length)] : ALL_LOC_TYPES[Math.floor(Math.random() * ALL_LOC_TYPES.length)];
    const excludeStr = dismissedLocs.length ? " Evita tutto ciò che ricorda: " + dismissedLocs.join(", ") + "." : "";
    const ctx = "Campagna: " + form.name + " (" + form.tone + "). " + (form.description || "") + " Luoghi già presenti: " + (existingLocs || "nessuno") + ".";
    try {
      const resp = await aiCall([{ role: "user", content: "TIPO OBBLIGATORIO: " + forcedType.toUpperCase() + ". Crea UN luogo di tipo " + forcedType + " per questa campagna: " + ctx + excludeStr + " SOLO JSON: {\"name\":\"...\",\"type\":\"" + forcedType + "\",\"desc\":\"2 frasi evocative\"}" }], "Sei un world-builder esperto. Solo JSON puro.", 500);
      const cleaned = resp.replace(/```[a-z]*/g, "").replace(/```/g, "").trim();
      const js = cleaned.indexOf("{"), je = cleaned.lastIndexOf("}");
      setAiSuggest({ type: "loc", loading: false, result: { ...JSON.parse(js >= 0 ? cleaned.slice(js, je + 1) : cleaned), _type: "loc" } });
    } catch { setAiSuggest({ type: null, loading: false, result: null }); }
  };
  return (
    <div className="p-6 overflow-y-auto h-full">
      {editingLocModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setEditingLocModal(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-700 shrink-0">
              <h2 className="text-lg font-bold text-yellow-400">✏️ Modifica Luogo</h2>
              <button onClick={() => setEditingLocModal(null)} className="text-zinc-500 hover:text-zinc-200 text-xl leading-none">✕</button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div><label className="text-xs text-zinc-400 mb-1 block">Tipo</label><select value={editingLocModal.type || "altro"} onChange={e => setEditingLocModal(m => ({ ...m, type: e.target.value }))} className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-2 text-zinc-200 text-sm focus:outline-none focus:border-red-700">{LOC_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Nome</label><Inp value={editingLocModal.name} onChange={v => setEditingLocModal(m => ({ ...m, name: v }))} placeholder="Nome del luogo" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Descrizione</label><Txta value={editingLocModal.desc || ""} onChange={v => setEditingLocModal(m => ({ ...m, desc: v }))} rows={4} placeholder="Atmosfera, dettagli..." /></div>
              <div className="flex justify-end gap-2 pt-1">
                <Btn variant="secondary" onClick={() => setEditingLocModal(null)}>Annulla</Btn>
                <Btn disabled={!editingLocModal.name?.trim()} onClick={() => { updLocs(form.locations.map((l, i) => i === editingLocModal.index ? { name: editingLocModal.name, type: editingLocModal.type, desc: editingLocModal.desc } : l)); setEditingLocModal(null); }}>Salva</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-yellow-400">🌍 Il Mondo</h2><div className="flex items-center gap-3">{autoSaved && <span className="text-zinc-500 text-xs">✓ salvato</span>}{saved && <span className="text-green-400 text-sm">✅ Salvato!</span>}<Btn onClick={saveAll}>Salva</Btn></div></div>
        <div className="space-y-5">
          <Card>
            <h3 className="text-yellow-500 font-semibold mb-4 text-sm">📋 Info Base</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-zinc-400 mb-1 block">Nome</label><Inp value={form.name} onChange={v => upd("name", v)} placeholder="Le Terre Dimenticate..." /></div>
              <div><label className="text-xs text-zinc-400 mb-2 block">Regolamento</label><div className="flex gap-2 flex-wrap">{RULESETS.map(r => <button key={r.id} onClick={() => upd("ruleset", r.id)} className={"px-3 py-1.5 rounded-lg text-sm border transition-all " + (form.ruleset === r.id ? "border-red-700 bg-red-800/30 text-zinc-100 font-semibold" : "border-zinc-700 text-zinc-400 hover:border-zinc-500")}>{r.label}</button>)}</div></div>
              <div><label className="text-xs text-zinc-400 mb-2 block">Tono</label><div className="grid grid-cols-3 gap-2">{TONES.map(t => <button key={t.id} onClick={() => upd("tone", t.id)} className={"text-left p-2.5 rounded-xl border-2 transition-all " + (form.tone === t.id ? "border-red-700 bg-red-800/20" : "border-zinc-700 hover:border-zinc-500")}><p className="font-medium text-sm text-zinc-200">{t.icon} {t.label}</p><p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p></button>)}</div></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Descrizione</label><Txta value={form.description} onChange={v => upd("description", v)} rows={5} placeholder="Atmosfera, storia, conflitti..." /></div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-3"><h3 className="text-yellow-500 font-semibold text-sm">📍 Luoghi Chiave</h3><Btn variant="ai" size="sm" onClick={aiSuggestLoc} disabled={aiSuggest.loading}>✨ Suggerisci</Btn></div>
            <div className="space-y-1.5 mb-3">
              {form.locations.length === 0 && <p className="text-zinc-600 text-xs italic px-1">Nessun luogo.</p>}
              {form.locations.map((l, i) => (
                <div key={i} className="flex items-center gap-2 bg-zinc-700/50 hover:bg-zinc-700 px-3 py-2 rounded-lg cursor-pointer transition-colors group" onClick={() => setEditingLocModal({ index: i, name: l.name, type: l.type || "altro", desc: l.desc || "" })}>
                  <Badge color="zinc">{l.type || "luogo"}</Badge>
                  <span className="text-yellow-400 text-sm font-medium">{l.name}</span>
                  {l.desc && <span className="text-zinc-400 text-xs flex-1 truncate">— {l.desc}</span>}
                  <span className="text-zinc-600 group-hover:text-zinc-400 text-xs ml-auto transition-colors">✏️</span>
                  <button onClick={e => { e.stopPropagation(); updLocs(form.locations.filter((_, j) => j !== i)); }} className="text-zinc-600 hover:text-red-400 text-xs shrink-0 transition-colors">✕</button>
                </div>
              ))}
            </div>
            <AISuggestBox loading={aiSuggest.loading} result={aiSuggest.result} onAccept={acceptSuggest} onDismiss={() => { if (aiSuggest.result?.name) setDismissedLocs(d => [...d, aiSuggest.result.name]); setAiSuggest({ type: null, loading: false, result: null }); }} />
            <div className="flex gap-2 items-end flex-wrap bg-zinc-700/30 rounded-xl p-3 mt-3">
              <div className="w-32"><label className="text-xs text-zinc-500 mb-1 block">Tipo</label><select value={locType} onChange={e => setLocType(e.target.value)} className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-2 text-zinc-200 text-xs">{LOC_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="flex-1 min-w-28"><label className="text-xs text-zinc-500 mb-1 block">Nome</label><Inp value={locName} onChange={setLocName} placeholder="Villaromba..." /></div>
              <div className="flex-1 min-w-28"><label className="text-xs text-zinc-500 mb-1 block">Nota</label><Inp value={locDesc} onChange={setLocDesc} placeholder="Città portuale..." /></div>
              <Btn variant="secondary" size="sm" onClick={addLoc} disabled={!locName.trim()}>+ Aggiungi</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StoryEngine({ campaign, characters, plots, sessions, onSavePlot, onSaveChar, onSaveSession, onSaveNote }) {
  const [msgs, setMsgs] = useState([]); const [inp, setInp] = useState(""); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(null);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current && bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const ruleset = RULESETS.find(r => r.id === (campaign?.ruleset || "5e2014"))?.label || "D&D 5e";
  const buildSys = () => {
    const pgs = characters.filter(c => c.type === "pg").map(c => "- " + c.name + " (" + c.race + " " + c.class + "): " + c.background).join("\n") || "nessuno";
    const ap = plots.filter(p => p.status === "active").map(p => "- " + p.title + ": " + p.description).join("\n") || "nessuna";
    const ls = sessions.slice(-3).map((s, i) => "- Sess." + (sessions.length - 2 + i) + ": " + s.title + " -- " + s.summary).join("\n") || "nessuna";
    return "Sei un narratore per master di " + ruleset + ".\nCAMPAGNA: " + (campaign?.name || "") + " (" + (campaign?.tone || "") + ")\nMONDO: " + (campaign?.description || "") + "\nPG:\n" + pgs + "\nTRAME:\n" + ap + "\nULTIME SESSIONI:\n" + ls + "\nRispondi in italiano. Usa markdown.";
  };
  const send = async () => {
    if (!inp.trim() || loading) return;
    const m = { role: "user", content: inp.trim() }; const nm = [...msgs, m]; setMsgs(nm); setInp(""); setLoading(true);
    const r = await aiCall(nm, buildSys());
    setMsgs(prev => [...prev, { role: "assistant", content: r || "Errore API." }]); setLoading(false);
  };
  const sugg = ["🎯 Cosa potrebbe succedere nella prossima sessione?","🔗 Crea un hook narrativo per un PG","⚡ Suggerisci una complicazione","🎭 Presenta un nuovo PNG","🎲 Crea un incontro sorpresa"];
  return (
    <div className="flex flex-col h-full">
      {saving && <SaveSnippetModal text={saving} onSavePlot={onSavePlot} onSaveChar={onSaveChar} onSaveSession={onSaveSession} onSaveNote={onSaveNote} onClose={() => setSaving(null)} />}
      <div className="p-4 border-b border-zinc-700 shrink-0"><h2 className="text-xl font-bold text-yellow-400">🔮 Il Narratore</h2><p className="text-zinc-400 text-sm">{ruleset}</p></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {msgs.length === 0 && <div className="text-center py-10"><div className="text-5xl mb-4">🔮</div><p className="text-zinc-400 mb-5">Chiedi aiuto al narratore AI</p><div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">{sugg.map(s => <button key={s} onClick={() => setInp(s)} className="text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-2 rounded-lg transition-colors text-left">{s}</button>)}</div></div>}
        {msgs.map((m, i) => (
          <div key={i} className={"flex flex-col " + (m.role === "user" ? "items-end" : "items-start")}>
            <div className={"max-w-3xl rounded-xl px-4 py-3 text-sm " + (m.role === "user" ? "bg-red-800/80 text-zinc-100 font-medium" : "bg-zinc-700")}>{m.role === "assistant" ? <MD text={m.content} /> : <span className="whitespace-pre-wrap">{m.content}</span>}</div>
            {m.role === "assistant" && <button onClick={() => setSaving(m.content)} className="mt-1 text-xs text-zinc-600 hover:text-yellow-400 transition-colors px-1">💾 salva questa risposta...</button>}
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-zinc-700 rounded-xl px-4 py-3 text-zinc-400 text-sm animate-pulse">✨ Elaborando...</div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-zinc-700 flex gap-2 shrink-0">
        <textarea value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Chiedi al narratore... (Invio per inviare)" rows={2} className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-700 resize-none text-sm" />
        <Btn onClick={send} disabled={loading || !inp.trim()} className="self-end">Invia</Btn>
      </div>
    </div>
  );
}

function Characters({ characters, onSave, campaign }) {
  const blank = { name: "", type: "pg", race: "", class: "", level: "", background: "", notes: "", hp: "", maxHp: "", ac: "" };
  const [editing, setEditing] = useState(null); const [form, setForm] = useState(blank); const [viewing, setViewing] = useState(null);
  const [aiLoading, setAiLoading] = useState(false); const [aiResult, setAiResult] = useState(null);
  const [dismissedChars, setDismissedChars] = useState([]);
  const upd = k => v => setForm(p => ({ ...p, [k]: v }));
  const handleSave = () => { onSave(editing === "new" ? [...characters, { ...form, id: uid() }] : characters.map(c => c.id === editing ? form : c)); setEditing(null); };
  const generateChar = async () => {
    setAiLoading(true); setAiResult(null);
    const pgsCtx = characters.filter(c => c.type === "pg").map(c => c.name + " (" + (c.race||"") + " " + (c.class||"") + "): " + (c.background||"")).join("; ");
    const pngsCtx = characters.filter(c => c.type === "png").map(c => c.name + (c.background ? ": " + c.background.slice(0, 80) : "")).join("; ");
    const locsCtx = (campaign?.locations || []).map(l => l.name + " (" + (l.type||"") + ")").join(", ");
    const excludeStr = dismissedChars.length ? " NON creare nulla di simile a questi già scartati: " + dismissedChars.join(", ") + "." : "";
    const ctx = "Campagna: " + (campaign?.name || "") + " (tono: " + (campaign?.tone || "") + "). " + (campaign?.description || "") + (locsCtx ? "\nLuoghi: " + locsCtx : "") + (pgsCtx ? "\nPG presenti: " + pgsCtx : "") + (pngsCtx ? "\nPNG già presenti: " + pngsCtx : "");
    try {
      const resp = await aiCall([{ role: "user", content: ctx + excludeStr + "\nCrea UN PNG memorabile con contraddizione interna o segreto. SOLO JSON: {\"name\":\"...\",\"race\":\"...\",\"class\":\"\",\"background\":\"...\",\"notes\":\"verità nascosta\"}" }], "Sei un narratore esperto di RPG. Solo JSON puro.", 1000);
      const cleaned = resp.replace(/```[a-z]*/g, "").replace(/```/g, "").trim();
      const js = cleaned.indexOf("{"), je = cleaned.lastIndexOf("}");
      setAiResult(JSON.parse(js >= 0 ? cleaned.slice(js, je + 1) : cleaned));
    } catch {}
    setAiLoading(false);
  };
  const acceptChar = r => { onSave([...characters, { id: uid(), name: r.name, type: "png", race: r.race || "", class: r.class || "", level: "", background: r.background || "", notes: r.notes || "", hp: "", maxHp: "", ac: "", role: "ally" }]); setAiResult(null); };

  if (editing) return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-5"><Btn variant="ghost" onClick={() => setEditing(null)}>← Indietro</Btn><h2 className="text-xl font-bold text-yellow-400">{editing === "new" ? "Nuovo" : "Modifica: " + form.name}</h2></div>
      <div className="max-w-2xl space-y-4">
        <div className="flex gap-4">{[["pg","👤 PG"],["png","🎭 PNG"]].map(([val,lab]) => <label key={val} className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.type === val} onChange={() => upd("type")(val)} className="accent-red-700" /><span className="text-zinc-200">{lab}</span></label>)}</div>
        <Inp value={form.name} onChange={upd("name")} placeholder="Nome" />
        {form.type === "png" && (
          <div><label className="text-xs text-zinc-400 mb-2 block">Ruolo</label>
            <div className="flex gap-2 flex-wrap">{Object.entries({ ally:"🤝 Alleato", neutral:"⚖️ Neutrale", unknown:"❓ Misterioso", nemico:"💀 Nemico" }).map(([val,lab]) =>
              <button key={val} onClick={() => upd("role")(val)} className={"px-3 py-1.5 rounded-lg text-sm border transition-colors " + (form.role === val ? "bg-red-800 text-zinc-100 font-semibold border-red-700" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border-zinc-600")}>{lab}</button>
            )}</div>
          </div>
        )}
        {form.type === "pg" && <div className="grid grid-cols-3 gap-2">{[["Razza","race","Elfo"],["Classe","class","Mago"],["Livello","level","1"]].map(([lab,key,ph]) => <div key={key}><label className="text-xs text-zinc-400 mb-1 block">{lab}</label><Inp value={form[key]} onChange={upd(key)} placeholder={ph} /></div>)}</div>}
        {form.type === "pg" && <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-zinc-400 mb-1 block">HP Max</label><Inp value={form.maxHp} onChange={upd("maxHp")} placeholder="40" type="number" /></div><div><label className="text-xs text-zinc-400 mb-1 block">HP Attuali</label><Inp value={form.hp} onChange={upd("hp")} placeholder="40" type="number" /></div><div><label className="text-xs text-zinc-400 mb-1 block">CA</label><Inp value={form.ac} onChange={upd("ac")} placeholder="15" type="number" /></div></div>}
        <div><label className="text-xs text-zinc-400 mb-1 block">Background</label><Txta value={form.background} onChange={upd("background")} rows={5} placeholder="Storia, motivazioni..." /></div>
        <div><label className="text-xs text-zinc-400 mb-1 block">🔒 Note Master</label><Txta value={form.notes} onChange={upd("notes")} rows={2} placeholder="Appunti riservati..." /></div>
        <div className="flex gap-2"><Btn onClick={handleSave} disabled={!form.name}>Salva</Btn><Btn variant="secondary" onClick={() => setEditing(null)}>Annulla</Btn></div>
      </div>
    </div>
  );
  const pgs = characters.filter(c => c.type === "pg"), pngs = characters.filter(c => c.type === "png");
  const ROLE_BADGE = { ally: { label: "🤝 Alleato", color: "green" }, neutral: { label: "⚖️ Neutrale", color: "zinc" }, unknown: { label: "❓ Misterioso", color: "purple" }, nemico: { label: "💀 Nemico", color: "red" } };
  const CCard = ({ c }) => (
    <Card onClick={() => setViewing(c)}>
      <div className="flex items-start justify-between mb-1">
        <div><p className="font-bold text-zinc-200 text-sm">{c.name}</p>{c.type === "pg" && <p className="text-xs text-zinc-500">{[c.race,c.class,c.level && "Lv."+c.level].filter(Boolean).join(" / ")}</p>}{c.type === "png" && c.role && ROLE_BADGE[c.role] && <p className="text-xs text-zinc-500 mt-0.5">{ROLE_BADGE[c.role].label}</p>}</div>
        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}><Badge color={c.type === "pg" ? "gold" : "blue"}>{c.type === "pg" ? "👤 PG" : "🎭 PNG"}</Badge><Btn variant="ghost" size="sm" onClick={() => { setForm(c); setEditing(c.id); }}>✏️</Btn><Btn variant="ghost" size="sm" onClick={() => onSave(characters.filter(x => x.id !== c.id))}>🗑️</Btn></div>
      </div>
      {c.type === "pg" && (c.hp || c.maxHp || c.ac) && (<div className="flex gap-3 mt-1.5 mb-1">{(c.hp !== "" || c.maxHp !== "") && <span className="text-xs text-red-400">❤️ {c.hp || "—"}/{c.maxHp || "—"}</span>}{c.ac && <span className="text-xs text-blue-400">🛡️ {c.ac}</span>}</div>)}
      {c.background && <p className="text-zinc-400 text-xs line-clamp-2 mt-1">{c.background}</p>}
    </Card>
  );
  return (
    <div className="p-6 overflow-y-auto h-full">
      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge color={viewing.type === "pg" ? "gold" : "blue"}>{viewing.type === "pg" ? "👤 PG" : "🎭 PNG"}</Badge>
              {viewing.type === "png" && viewing.role && ROLE_BADGE[viewing.role] && <Badge color={ROLE_BADGE[viewing.role].color}>{ROLE_BADGE[viewing.role].label}</Badge>}
              {viewing.race && <Badge color="zinc">{viewing.race}</Badge>}
              {viewing.class && <Badge color="zinc">{viewing.class}</Badge>}
              {viewing.level && <Badge color="zinc">Lv. {viewing.level}</Badge>}
            </div>
            {(viewing.hp || viewing.maxHp || viewing.ac) && (<div className="flex gap-4 bg-zinc-800/60 rounded-xl px-4 py-3 border border-zinc-700">{(viewing.hp || viewing.maxHp) && <div className="text-center"><p className="text-xs text-zinc-500 mb-0.5">HP</p><p className="text-lg font-bold text-red-400">{viewing.hp || "—"}/{viewing.maxHp || "—"}</p></div>}{viewing.ac && <div className="text-center"><p className="text-xs text-zinc-500 mb-0.5">CA</p><p className="text-lg font-bold text-blue-400">{viewing.ac}</p></div>}</div>)}
            {viewing.background && <div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">📖 Background</p><MD text={viewing.background} /></div>}
            {viewing.notes && <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3"><p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">🔒 Note Master</p><MD text={viewing.notes} /></div>}
            <div className="pt-1"><Btn size="sm" onClick={() => { setForm(viewing); setViewing(null); setEditing(viewing.id); }}>✏️ Modifica</Btn></div>
          </div>
        </Modal>
      )}
      <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold text-yellow-400">👥 Personaggi</h2><div className="flex gap-2"><Btn variant="ai" size="sm" onClick={generateChar} disabled={aiLoading}>{aiLoading ? "✨..." : "✨ Genera PNG"}</Btn><Btn onClick={() => { setForm(blank); setEditing("new"); }}>+ Aggiungi</Btn></div></div>
      <AISuggestBox loading={aiLoading} result={aiResult} onAccept={acceptChar} onDismiss={() => { if (aiResult?.name) setDismissedChars(d => [...d, aiResult.name]); setAiResult(null); }} />
      {characters.length === 0 ? <div className="text-center py-16 text-zinc-400 mt-4"><div className="text-5xl mb-3">👤</div><p>Nessun personaggio.</p></div> : (
        <div className="space-y-5 mt-4">
          {pgs.length > 0 && <div><h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">👤 PG ({pgs.length})</h3><div className="grid grid-cols-2 gap-3">{pgs.map(c => <CCard key={c.id} c={c} />)}</div></div>}
          {pngs.length > 0 && <div><h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">🎭 PNG ({pngs.length})</h3><div className="grid grid-cols-2 gap-3">{pngs.map(c => <CCard key={c.id} c={c} />)}</div></div>}
        </div>
      )}
    </div>
  );
}

function PlotTracker({ plots, onSave, characters, campaign }) {
  const blank = { title: "", description: "", status: "active", tag: "", relatedChars: [], notes: "", sharedWithPlayers: false };
  const [editing, setEditing] = useState(null); const [form, setForm] = useState(blank);
  const [viewing, setViewing] = useState(null);
  const [aiLoading, setAiLoading] = useState(false); const [aiResult, setAiResult] = useState(null);
  const upd = k => v => setForm(p => ({ ...p, [k]: v }));
  const STATS = [{ id: "active", label: "🔥 Attive" },{ id: "pending", label: "⏸ Sospese" },{ id: "resolved", label: "Risolte" },{ id: "hidden", label: "Nascoste" }];
  const ORDER = ["active","pending","resolved","hidden"];
  const cycleStatus = (e, p) => { e.stopPropagation(); onSave(plots.map(x => x.id === p.id ? { ...x, status: ORDER[(ORDER.indexOf(p.status) + 1) % ORDER.length] } : x)); };
  const toggleChar = id => setForm(p => ({ ...p, relatedChars: p.relatedChars?.includes(id) ? p.relatedChars.filter(c => c !== id) : [...(p.relatedChars || []), id] }));
  const handleSave = () => { onSave(editing === "new" ? [...plots, { ...form, id: uid() }] : plots.map(p => p.id === editing ? form : p)); setEditing(null); };
  const generateSingle = async () => {
    setAiLoading(true); setAiResult(null);
    const allChars = characters;
    const pgs = allChars.filter(c => c.type === "pg");
    const pngs = allChars.filter(c => c.type === "png");
    const locs = campaign?.locations || [];
    const charFreq = {};
    allChars.forEach(c => { charFreq[c.id] = 0; });
    plots.forEach(p => (p.relatedChars || []).forEach(id => { if (charFreq[id] !== undefined) charFreq[id]++; }));
    const sortedPgs = [...pgs].sort((a, b) => (charFreq[a.id] || 0) - (charFreq[b.id] || 0));
    const sortedPngs = [...pngs].sort((a, b) => (charFreq[a.id] || 0) - (charFreq[b.id] || 0));
    const locText = plots.map(p => p.description + " " + p.title).join(" ").toLowerCase();
    const sortedLocs = [...locs].sort((a, b) => { const fa = (locText.match(new RegExp(a.name.toLowerCase(), "g")) || []).length; const fb = (locText.match(new RegExp(b.name.toLowerCase(), "g")) || []).length; return fa - fb; });
    const ARCHETYPES = ["conflitto tra due fazioni che non coinvolge direttamente i PG ma li mette in mezzo loro malgrado","un segreto del passato di un PNG torna a galla in modo concreto e visibile","una risorsa vitale sta per venire meno in modo misterioso","qualcuno che sembrava morto riappare, cambiato","una profezia inizia a manifestarsi in modo letterale e inquietante","un alleato si trova in una situazione impossibile","un evento apparentemente banale rivela una cospirazione più grande","due verità incompatibili: entrambe sembrano reali","un luogo cambia natura: ciò che era sicuro diventa pericoloso","qualcuno costruisce potere nell'ombra usando metodi inaspettati"];
    const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    const focusChar = sortedPgs.length && Math.random() > 0.4 ? sortedPgs[0] : sortedPngs[0] || null;
    const focusLoc = sortedLocs[0] || null;
    const pgList = pgs.map(c => c.name + " (" + (c.race || "") + " " + (c.class || "") + "): " + (c.background || "")).join("\n") || "nessuno";
    const pngList = pngs.map(c => c.name + ": " + (c.background || "")).join("\n") || "nessuno";
    const locList = locs.map(l => l.name + " (" + (l.type || "") + ")").join("; ") || "nessuno";
    const existingTitles = plots.map(p => p.title).join(", ");
    const prompt = "Campagna: " + (campaign?.name || "") + " (tono: " + (campaign?.tone || "") + ").\nPG:\n" + pgList + "\nPNG:\n" + pngList + "\nLUOGHI: " + locList + "\nTRAME GIÀ ESISTENTI: " + (existingTitles || "nessuna") + "\n\nArchetipo: «" + archetype + "»." + (focusChar ? "\nPersonaggio chiave: " + focusChar.name + "." : "") + (focusLoc ? "\nLuogo obbligatorio: " + focusLoc.name + "." : "") + "\nDescrivi SOLO la situazione di partenza. MAX 150 parole. SOLO JSON: {\"title\":\"...\",\"description\":\"...\",\"relatedCharNames\":[]}";
    try {
      const resp = await aiCall([{ role: "user", content: prompt }], "Sei un DM assistant creativo. Rispondi in italiano. Solo JSON puro.", 1000);
      const cleaned = resp.replace(/```[a-z]*/g, "").replace(/```/g, "").trim();
      const js = cleaned.indexOf("{"), je = cleaned.lastIndexOf("}");
      setAiResult(JSON.parse(js >= 0 ? cleaned.slice(js, je + 1) : cleaned));
    } catch {}
    setAiLoading(false);
  };
  const acceptPlot = r => { onSave([...plots, { id: uid(), title: r.title, description: r.description, status: "active", tag: "", notes: "", sharedWithPlayers: false, relatedChars: characters.filter(c => (r.relatedCharNames || []).includes(c.name)).map(c => c.id) }]); setAiResult(null); };
  if (editing) return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-5"><Btn variant="ghost" onClick={() => setEditing(null)}>← Indietro</Btn><h2 className="text-xl font-bold text-yellow-400">{editing === "new" ? "Nuova Trama" : "Modifica"}</h2></div>
      <div className="max-w-2xl space-y-4">
        <Inp value={form.title} onChange={upd("title")} placeholder="Titolo" />
        <Txta value={form.description} onChange={upd("description")} placeholder="Descrizione..." rows={4} />
        <div><label className="text-xs text-zinc-400 mb-2 block">Stato</label><div className="flex gap-2 flex-wrap">{STATS.map(s => <button key={s.id} onClick={() => upd("status")(s.id)} className={"px-3 py-1.5 rounded-lg text-sm transition-colors " + (form.status === s.id ? "bg-red-800 text-zinc-100 font-semibold" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600")}>{s.label}</button>)}</div></div>
        <div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!form.sharedWithPlayers} onChange={e => upd("sharedWithPlayers")(e.target.checked)} className="accent-blue-500" /><span className="text-sm text-zinc-300">👁 Visibile ai giocatori (Bacheca)</span></label></div>
        {characters.length > 0 && <div><label className="text-xs text-zinc-400 mb-2 block">Personaggi coinvolti</label><div className="flex flex-wrap gap-2">{characters.map(c => <button key={c.id} onClick={() => toggleChar(c.id)} className={"px-3 py-1 rounded-lg text-sm transition-colors " + (form.relatedChars?.includes(c.id) ? "bg-red-800 text-zinc-100" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600")}>{c.name}</button>)}</div></div>}
        <Txta value={form.notes} onChange={upd("notes")} placeholder="Note riservate..." rows={2} />
        <div className="flex gap-2"><Btn onClick={handleSave} disabled={!form.title}>Salva</Btn><Btn variant="secondary" onClick={() => setEditing(null)}>Annulla</Btn></div>
      </div>
    </div>
  );
  const grouped = STATS.map(s => ({ ...s, items: plots.filter(p => p.status === s.id) })).filter(g => g.items.length > 0);
  const statusColors = { active: "bg-green-500", pending: "bg-yellow-500", resolved: "bg-zinc-500", hidden: "bg-purple-500" };
  const statusLabels = { active: "🔥 Attiva", pending: "⏸ Sospesa", resolved: "✅ Risolta", hidden: "🔒 Nascosta" };
  return (
    <div className="p-6 overflow-y-auto h-full">
      {viewing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-zinc-700 shrink-0">
              <div className="flex-1 min-w-0"><h2 className="text-xl font-bold text-yellow-400 mb-1">{viewing.title}</h2><div className="flex gap-2 flex-wrap items-center"><Badge color={viewing.status === "active" ? "green" : viewing.status === "pending" ? "gold" : viewing.status === "hidden" ? "purple" : "zinc"}>{statusLabels[viewing.status] || viewing.status}</Badge>{viewing.sharedWithPlayers && <Badge color="cyan">👁 Visibile ai giocatori</Badge>}</div></div>
              <button onClick={() => setViewing(null)} className="text-zinc-500 hover:text-zinc-200 text-xl leading-none ml-4 shrink-0">✕</button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {viewing.description && <div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">📖 Descrizione</p><MD text={viewing.description} /></div>}
              {viewing.notes && <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3"><p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">🔒 Note Master</p><p className="text-zinc-300 text-sm whitespace-pre-wrap">{viewing.notes}</p></div>}
              {(() => { const rc = characters.filter(c => viewing.relatedChars?.includes(c.id)); return rc.length > 0 ? <div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">👥 Personaggi coinvolti</p><div className="flex flex-wrap gap-2">{rc.map(c => <Badge key={c.id} color={c.type === "pg" ? "gold" : "blue"}>{c.name}</Badge>)}</div></div> : null; })()}
              <div className="flex gap-2 pt-2 border-t border-zinc-700"><Btn size="sm" onClick={() => { setForm(viewing); setViewing(null); setEditing(viewing.id); }}>✏️ Modifica</Btn><Btn size="sm" variant="secondary" onClick={() => setViewing(null)}>Chiudi</Btn></div>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold text-yellow-400">📜 Trame</h2><div className="flex gap-2"><Btn variant="ai" size="sm" onClick={generateSingle} disabled={aiLoading}>{aiLoading ? "✨..." : "✨ Genera"}</Btn><Btn onClick={() => { setForm(blank); setEditing("new"); }}>+ Nuova</Btn></div></div>
      <AISuggestBox loading={aiLoading} result={aiResult} onAccept={acceptPlot} onDismiss={() => setAiResult(null)} />
      <p className="text-xs text-zinc-600 mb-4">💡 Clicca su una trama per leggerla in anteprima.</p>
      {plots.length === 0 ? <div className="text-center py-16 text-zinc-400 mt-4"><div className="text-5xl mb-3">📜</div><p>Nessuna trama.</p></div> : (
        <div className="grid grid-cols-2 gap-5 mt-2">{grouped.map(g => (
          <div key={g.id}>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{g.label} ({g.items.length})</h3>
            <div className="space-y-3">{g.items.map(p => {
              const rc = characters.filter(c => p.relatedChars?.includes(c.id));
              return (
                <div key={p.id} onClick={() => setViewing(p)} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 cursor-pointer hover:border-yellow-600/50 hover:bg-zinc-800/80 transition-all">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0"><h3 className="font-bold text-zinc-200 text-sm">{p.title}</h3>{p.sharedWithPlayers && <Badge color="cyan">👁 Visibile</Badge>}</div>
                    <div className="flex items-center gap-1 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={e => cycleStatus(e, p)} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 transition-colors"><span className={"w-1.5 h-1.5 rounded-full " + (statusColors[p.status] || "bg-zinc-500")}></span><span className="text-zinc-500">↻</span></button>
                      <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setForm(p); setEditing(p.id); }}>✏️</Btn>
                      <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onSave(plots.filter(x => x.id !== p.id)); }}>🗑️</Btn>
                    </div>
                  </div>
                  {p.description && <p className="text-zinc-400 text-xs line-clamp-2 mb-2">{p.description}</p>}
                  {rc.length > 0 && <div className="flex flex-wrap gap-1">{rc.map(c => <Badge key={c.id} color={c.type === "pg" ? "gold" : "blue"}>{c.name}</Badge>)}</div>}
                </div>
              );
            })}</div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

function SessionTracker({ sessions, onSave, campaign, characters, plots, shk }) {
  const blank = { title: "", date: new Date().toISOString().split("T")[0], summary: "", highlights: "", nextHooks: "" };
  const [editing, setEditing] = useState(null); const [form, setForm] = useState(blank);
  const [viewingSession, setViewingSession] = useState(null);
  const [recap, setRecap] = useState(""); const [recapLoading, setRecapLoading] = useState(false); const [copied, setCopied] = useState(false);
  const upd = k => v => setForm(p => ({ ...p, [k]: v }));
  const handleSave = () => { onSave(editing === "new" ? [...sessions, { ...form, id: uid() }] : sessions.map(s => s.id === editing ? form : s)); setEditing(null); };
  const generateRecap = async () => {
    if (!sessions.length) return; setRecapLoading(true); setRecap("");
    const recent = sessions.slice(-2);
    const older = sessions.slice(0, -2);
    const recentText = recent.map((s, i) => "SESSIONE " + (sessions.indexOf(s) + 1) + " — " + s.title + ":\n" + s.summary + (s.highlights ? "\nSalienti: " + s.highlights : "") + (s.nextHooks ? "\nHook: " + s.nextHooks : "")).join("\n\n");
    const olderText = older.length ? "SESSIONI PRECEDENTI:\n" + older.map((s, i) => (i + 1) + ". " + s.title + ": " + s.summary?.slice(0, 150)).join("\n") : "";
    const activePlots = plots?.filter(p => p.status === "active").map(p => p.title).join(", ") || "";
    const prompt = "Genera un RIEPILOGO DA LEGGERE AI GIOCATORI. Tono narrativo, seconda persona plurale. 150-250 parole. NO markdown.\n" + olderText + "\n\n" + recentText + (activePlots ? "\n\nTRAME APERTE: " + activePlots : "");
    const r = await aiCall([{ role: "user", content: prompt }], "Sei il narratore. Campagna: " + (campaign?.name || "") + ". Rispondi in italiano.", 1200);
    setRecap(r || "Errore."); setRecapLoading(false);
  };
  const publishRecap = async () => {
    if (!recap) return;
    await shSet(shk.recap, { text: recap, date: new Date().toISOString().split("T")[0], sessionNum: sessions.length });
    alert("✅ Recap pubblicato per i giocatori!");
  };
  const copyRecap = () => { navigator.clipboard?.writeText(recap).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  if (editing) return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-5"><Btn variant="ghost" onClick={() => setEditing(null)}>← Indietro</Btn><h2 className="text-xl font-bold text-yellow-400">{editing === "new" ? "📅 Sessione #" + (sessions.length + 1) : "Modifica"}</h2></div>
      <div className="max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-zinc-400 mb-1 block">Titolo</label><Inp value={form.title} onChange={upd("title")} placeholder="La notte dell'oracolo" /></div><div><label className="text-xs text-zinc-400 mb-1 block">Data</label><Inp type="date" value={form.date} onChange={upd("date")} /></div></div>
        <div><label className="text-xs text-zinc-400 mb-1 block">📖 Riassunto</label><Txta value={form.summary} onChange={upd("summary")} rows={5} placeholder="Cosa è successo..." /></div>
        <div><label className="text-xs text-zinc-400 mb-1 block">⭐ Momenti Salienti</label><Txta value={form.highlights} onChange={upd("highlights")} rows={2} placeholder="Scene memorabili..." /></div>
        <div><label className="text-xs text-zinc-400 mb-1 block">🔗 Hook Prossima</label><Txta value={form.nextHooks} onChange={upd("nextHooks")} rows={2} placeholder="Cliffhanger..." /></div>
        <div className="flex gap-2"><Btn onClick={handleSave} disabled={!form.summary}>Salva</Btn><Btn variant="secondary" onClick={() => setEditing(null)}>Annulla</Btn></div>
      </div>
    </div>
  );
  return (
    <div className="flex h-full overflow-hidden">
      {viewingSession && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingSession(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-zinc-700 shrink-0">
              <div><div className="flex items-center gap-3 mb-1"><span className="text-red-400 font-bold text-lg">#{sessions.indexOf(viewingSession) + 1}</span><h2 className="text-xl font-bold text-yellow-400">{viewingSession.title || "Senza titolo"}</h2></div>{viewingSession.date && <p className="text-zinc-500 text-sm">{new Date(viewingSession.date + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>}</div>
              <button onClick={() => setViewingSession(null)} className="text-zinc-500 hover:text-zinc-200 text-xl leading-none ml-4 shrink-0">✕</button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {viewingSession.summary && <div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">📖 Riassunto</p><MD text={viewingSession.summary} /></div>}
              {viewingSession.highlights && <div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">⭐ Momenti Salienti</p><MD text={viewingSession.highlights} /></div>}
              {viewingSession.nextHooks && <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3"><p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">🔗 Hook Prossima Sessione</p><MD text={viewingSession.nextHooks} /></div>}
              <div className="flex gap-2 pt-2 border-t border-zinc-700"><Btn size="sm" onClick={() => { setForm(viewingSession); setViewingSession(null); setEditing(viewingSession.id); }}>✏️ Modifica</Btn><Btn size="sm" variant="secondary" onClick={() => setViewingSession(null)}>Chiudi</Btn></div>
            </div>
          </div>
        </div>
      )}
      <div className="w-72 border-r border-zinc-700 flex flex-col bg-zinc-900/30 shrink-0">
        <div className="p-4 border-b border-zinc-700 shrink-0"><h3 className="text-yellow-400 font-bold text-sm">🎭 Riepilogo Giocatori</h3><p className="text-zinc-500 text-xs mt-0.5">Da leggere ad inizio sessione</p></div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {!recap && !recapLoading && <div className="text-center py-8 text-zinc-600 text-xs space-y-3 px-2"><div className="text-4xl">🎭</div><p>Genera un riassunto per i giocatori.</p></div>}
          {recapLoading && <div className="text-center py-8 text-purple-400 text-xs animate-pulse"><div className="text-4xl mb-2">✨</div><p>Generando...</p></div>}
          {recap && !recapLoading && (
            <div className="space-y-3">
              <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-3"><p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap">{recap}</p></div>
              <div className="flex gap-2"><Btn size="sm" variant="secondary" onClick={copyRecap} className="flex-1">{copied ? "✅ Copiato!" : "📋 Copia"}</Btn><Btn size="sm" variant="pSecondary" onClick={publishRecap}>📡 Pubblica</Btn><Btn size="sm" variant="ghost" onClick={() => setRecap("")}>✕</Btn></div>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-zinc-700 shrink-0"><Btn variant="ai" onClick={generateRecap} disabled={recapLoading || !sessions.length} className="w-full">{recapLoading ? "✨ Generando..." : "✨ Genera Riepilogo"}</Btn></div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5"><h2 className="text-2xl font-bold text-yellow-400">📅 Sessioni</h2><Btn onClick={() => { setForm(blank); setEditing("new"); }}>+ Nuova</Btn></div>
        {sessions.length === 0 ? <div className="text-center py-16 text-zinc-400"><div className="text-5xl mb-3">📅</div><p>Nessuna sessione.</p></div> : (
          <div className="space-y-4">{[...sessions].reverse().map((s, ri) => {
            const num = sessions.length - ri;
            return <Card key={s.id} onClick={() => setViewingSession(s)}>
              <div className="flex items-start justify-between mb-2"><div><div className="flex items-center gap-3"><span className="text-red-400 font-bold">#{num}</span><h3 className="font-bold text-zinc-200 text-sm">{s.title || "Senza titolo"}</h3></div>{s.date && <p className="text-xs text-zinc-500 mt-0.5">{new Date(s.date + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>}</div><div className="flex gap-1" onClick={e => e.stopPropagation()}><Btn variant="ghost" size="sm" onClick={() => { setForm(s); setEditing(s.id); }}>✏️</Btn><Btn variant="ghost" size="sm" onClick={() => onSave(sessions.filter(x => x.id !== s.id))}>🗑️</Btn></div></div>
              <p className="text-zinc-300 text-sm line-clamp-3">{s.summary}</p>
              {s.highlights && <p className="text-xs text-yellow-400/70 mt-1.5">⭐ {s.highlights}</p>}
              {s.nextHooks && <div className="border-t border-zinc-700 pt-2 mt-2"><p className="text-xs text-yellow-500/60">🔗 {s.nextHooks}</p></div>}
            </Card>;
          })}</div>
        )}
      </div>
    </div>
  );
}

function NotesTab({ notes, onSave }) {
  const [text, setText] = useState("");
  const [tag, setTag] = useState("generale");
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editTag, setEditTag] = useState("generale");
  const textareaRef = useRef(null);

  const addNote = () => {
    if (!text.trim()) return;
    onSave([{ id: uid(), text: text.trim(), tag, createdAt: new Date().toISOString(), pinned: false }, ...notes]);
    setText(""); textareaRef.current?.focus();
  };
  const deleteNote = id => onSave(notes.filter(n => n.id !== id));
  const togglePin = id => onSave(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const startEdit = n => { setEditingId(n.id); setEditText(n.text); setEditTag(n.tag || "generale"); };
  const saveEdit = id => { onSave(notes.map(n => n.id === id ? { ...n, text: editText, tag: editTag } : n)); setEditingId(null); };
  const cancelEdit = () => setEditingId(null);

  const fmtDate = iso => {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.text.toLowerCase().includes(search.toLowerCase());
    const matchTag = filterTag === "all" || n.tag === filterTag;
    return matchSearch && matchTag;
  });
  const pinned = filtered.filter(n => n.pinned);
  const rest = filtered.filter(n => !n.pinned);

  const [viewingNote, setViewingNote] = useState(null);

  const NoteCard = ({ n }) => {
    const tagDef = NOTE_TAGS.find(t => t.id === n.tag) || NOTE_TAGS[0];
    const isEditing = editingId === n.id;
    return (
      <div className={"rounded-xl border transition-all " + (n.pinned ? "bg-zinc-800 border-yellow-600/40" : "bg-zinc-800 border-zinc-700")}>
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {n.pinned && <span className="text-yellow-400 text-xs">📌</span>}
            <Badge color={tagDef.color}>{tagDef.label}</Badge>
            <span className="text-zinc-600 text-xs">{fmtDate(n.createdAt)}</span>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <button onClick={() => togglePin(n.id)} title={n.pinned ? "Rimuovi pin" : "Fissa in cima"} className={"w-6 h-6 rounded hover:bg-zinc-700 flex items-center justify-center text-xs transition-colors " + (n.pinned ? "text-yellow-400" : "text-zinc-600 hover:text-yellow-400")}>📌</button>
            <button onClick={() => startEdit(n)} title="Modifica" className="w-6 h-6 rounded hover:bg-zinc-700 flex items-center justify-center text-xs text-zinc-600 hover:text-zinc-300 transition-colors">✏️</button>
            <button onClick={() => deleteNote(n.id)} title="Elimina" className="w-6 h-6 rounded hover:bg-zinc-700 flex items-center justify-center text-xs text-zinc-600 hover:text-red-400 transition-colors">🗑️</button>
          </div>
        </div>
        {isEditing ? (
          <div className="px-4 pb-4 space-y-2">
            <div className="flex gap-1.5 flex-wrap mb-1">{NOTE_TAGS.map(t => <button key={t.id} onClick={() => setEditTag(t.id)} className={"px-2 py-0.5 rounded-md text-xs border transition-colors " + (editTag === t.id ? "border-red-700 bg-red-800/30 text-zinc-100 font-semibold" : "border-zinc-600 text-zinc-500 hover:border-zinc-400")}>{t.label}</button>)}</div>
            <Txta value={editText} onChange={setEditText} rows={4} />
            <div className="flex gap-2"><Btn size="sm" onClick={() => saveEdit(n.id)} disabled={!editText.trim()}>Salva</Btn><Btn size="sm" variant="secondary" onClick={cancelEdit}>Annulla</Btn></div>
          </div>
        ) : (
          <button onClick={() => setViewingNote(n)} className="w-full text-left px-4 pb-4 block hover:bg-zinc-700/30 rounded-b-xl transition-colors">
            <div className="line-clamp-4 pointer-events-none"><MD text={n.text} /></div>
            {n.text.split("\n").length > 4 || n.text.length > 300
              ? <p className="text-xs text-zinc-600 mt-1.5">leggi tutto →</p>
              : null}
          </button>
        )}
      </div>
    );
  };

  const usedTags = [...new Set(notes.map(n => n.tag).filter(Boolean))];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {viewingNote && (() => {
        const tagDef = NOTE_TAGS.find(t => t.id === viewingNote.tag) || NOTE_TAGS[0];
        return (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingNote(null)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-zinc-700 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {viewingNote.pinned && <span className="text-yellow-400">📌</span>}
                  <Badge color={tagDef.color}>{tagDef.label}</Badge>
                  <span className="text-zinc-500 text-xs">{fmtDate(viewingNote.createdAt)}</span>
                </div>
                <button onClick={() => setViewingNote(null)} className="text-zinc-500 hover:text-zinc-200 text-xl leading-none ml-4">✕</button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                <MD text={viewingNote.text} />
              </div>
              <div className="px-5 pb-4 flex gap-2 border-t border-zinc-700 pt-3 shrink-0">
                <Btn size="sm" onClick={() => { startEdit(viewingNote); setViewingNote(null); }}>✏️ Modifica</Btn>
                <Btn size="sm" variant="secondary" onClick={() => togglePin(viewingNote.id)}>
                  {viewingNote.pinned ? "📌 Rimuovi pin" : "📌 Fissa"}
                </Btn>
                <Btn size="sm" variant="danger" onClick={() => { deleteNote(viewingNote.id); setViewingNote(null); }} className="ml-auto">🗑️ Elimina</Btn>
              </div>
            </div>
          </div>
        );
      })()}
      <div className="p-4 border-b border-zinc-700 shrink-0 bg-zinc-900/40">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-yellow-400">📝 Note del Master</h2>
          <span className="text-xs text-zinc-500">{notes.length} nota{notes.length !== 1 ? "e" : ""}</span>
        </div>
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {NOTE_TAGS.map(t => (
            <button key={t.id} onClick={() => setTag(t.id)}
              className={"px-2.5 py-1 rounded-lg text-xs border transition-colors " + (tag === t.id ? "border-red-700 bg-red-800/30 text-zinc-100 font-semibold" : "border-zinc-700 text-zinc-400 hover:border-zinc-500")}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); addNote(); } }}
            placeholder="Aggiungi una nota... (Ctrl+Invio per salvare)" rows={2}
            className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-700 resize-none text-sm" />
          <Btn onClick={addNote} disabled={!text.trim()} className="self-end">+ Aggiungi</Btn>
        </div>
      </div>
      <div className="px-4 pt-3 pb-2 border-b border-zinc-700/50 shrink-0 flex gap-2 items-center flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cerca..." className="flex-1 min-w-32 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-700 text-sm" />
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterTag("all")} className={"px-2.5 py-1 rounded-lg text-xs border transition-colors " + (filterTag === "all" ? "border-zinc-500 bg-zinc-600 text-zinc-100 font-semibold" : "border-zinc-700 text-zinc-500 hover:border-zinc-500")}>Tutte</button>
          {usedTags.map(tid => { const t = NOTE_TAGS.find(x => x.id === tid); if (!t) return null; return (
            <button key={tid} onClick={() => setFilterTag(tid)} className={"px-2.5 py-1 rounded-lg text-xs border transition-colors " + (filterTag === tid ? "border-red-700 bg-red-800/30 text-zinc-100 font-semibold" : "border-zinc-700 text-zinc-500 hover:border-zinc-500")}>{t.label}</button>
          ); })}
        </div>
        {(search || filterTag !== "all") && <button onClick={() => { setSearch(""); setFilterTag("all"); }} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">✕ Pulisci</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {notes.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <div className="text-5xl mb-3">📝</div>
            <p className="font-medium">Nessuna nota ancora.</p>
            <p className="text-xs mt-1 text-zinc-600">Usa il campo sopra per aggiungerne una durante la giocata.</p>
          </div>
        )}
        {filtered.length === 0 && notes.length > 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">Nessun risultato per la ricerca corrente.</p>
        )}
        {pinned.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">📌 Fissate ({pinned.length})</p>
            {pinned.map(n => <NoteCard key={n.id} n={n} />)}
            {rest.length > 0 && <div className="border-t border-zinc-700/50 pt-2 mt-3"><p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-2">Tutte le note ({rest.length})</p></div>}
          </div>
        )}
        {rest.map(n => <NoteCard key={n.id} n={n} />)}
      </div>
    </div>
  );
}

function DeathSaveTracker({ c, onRoll, onManual }) {
  const succ = c.deathSaves?.successes || 0;
  const fail = c.deathSaves?.failures || 0;
  return (
    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
      <div className="flex flex-col gap-0.5">
        <div className="flex gap-0.5 items-center">{[0,1,2].map(i => <button key={i} onClick={() => onManual("successes", i)} className={"w-3.5 h-3.5 rounded-full border-2 transition-all " + (succ > i ? "bg-green-500 border-green-400" : "border-zinc-500 hover:border-green-400")} />)}</div>
        <div className="flex gap-0.5 items-center">{[0,1,2].map(i => <button key={i} onClick={() => onManual("failures", i)} className={"w-3.5 h-3.5 rounded-full border-2 transition-all " + (fail > i ? "bg-red-600 border-red-500" : "border-zinc-500 hover:border-red-400")} />)}</div>
      </div>
      <div className="flex flex-col text-center" style={{fontSize:"9px"}}><span className="text-green-500 font-bold leading-tight">{succ}/3</span><span className="text-red-500 font-bold leading-tight">{fail}/3</span></div>
      <button onClick={onRoll} className="px-1.5 py-1 rounded bg-purple-800/60 hover:bg-purple-700/70 border border-purple-600/50 text-purple-300 text-xs font-bold transition-colors">🎲</button>
    </div>
  );
}

function CombatScreen({ characters, campaign, shk, savedMonsters, onSaveMonsters, combatState, onSaveCombatState, onSaveChars }) {
  const ruleset = RULESETS.find(r => r.id === (campaign?.ruleset || "5e2014"))?.label || "D&D 5e";
  const [bestQuery, setBestQuery] = useState(""); const [bestLoading, setBestLoading] = useState(false); const [bestResult, setBestResult] = useState(null);
  const [bestView, setBestView] = useState("search");
  const [monsterModal, setMonsterModal] = useState(null);
  const [combatants, setCombatants] = useState(combatState?.combatants || []);
  const [turn, setTurn] = useState(combatState?.turn || 0);
  const [round, setRound] = useState(combatState?.round || 1);
  useEffect(() => { onSaveCombatState?.({ combatants, turn, round }); }, [combatants, turn, round]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", initiative: "", mod: "0", hp: "", maxHp: "", ac: "", type: "enemy" });
  const [condOpen, setCondOpen] = useState(null); const [liveShare, setLiveShare] = useState(false);
  const [rQuery, setRQuery] = useState(""); const [rMsgs, setRMsgs] = useState([]); const [rLoading, setRLoading] = useState(false);
  const [dsToast, setDsToast] = useState(null);
  const rBottomRef = useRef(null);
  useEffect(() => { rBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [rMsgs]);
  useEffect(() => {
    if (!liveShare) return;
    const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
    shSet(shk.initiative, { combatants: sorted, turn, round, active: true, updatedAt: Date.now() });
  }, [combatants, turn, round, liveShare]);
  const toggleLiveShare = () => {
    const going = !liveShare; setLiveShare(going);
    if (!going) shSet(shk.initiative, { active: false, updatedAt: Date.now() });
  };
  const BLANK_DS = { successes: 0, failures: 0 };
  const searchMonster = async () => {
    if (!bestQuery.trim() || bestLoading) return; setBestLoading(true); setBestResult(null);
    const prompt = `SOLO JSON per "${bestQuery}" in ${ruleset}: {"name":"","type":"","cr":"","ac":0,"maxHp":0,"speed":"9m","str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10,"saves":{},"skills":{},"damageImmunities":"","senses":"","traits":[{"name":"","desc":""}],"actions":[{"name":"","desc":""}],"legendaryActions":[]}`;
    try {
      const resp = await aiCall([{ role: "user", content: prompt }], "Sei un esperto di " + ruleset + ". SOLO JSON puro.", 2400);
      const cleaned = resp.replace(/```[a-z]*/g, "").replace(/```/g, "").trim();
      const js = cleaned.indexOf("{"), je = cleaned.lastIndexOf("}");
      setBestResult(JSON.parse(js >= 0 && je > js ? cleaned.slice(js, je + 1) : cleaned));
    } catch {}
    setBestLoading(false);
  };
  const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
  const isTrulyDead = c => c.hp === 0 && (c.type !== "player" || (c.deathSaves?.failures || 0) >= 3);
  const addFromMonster = m => {
    const dex = Math.floor(((m.dex || 10) - 10) / 2);
    setCombatants(prev => [...prev, { id: uid(), name: m.name, initiative: Math.floor(Math.random() * 20) + 1 + dex, hp: m.maxHp, maxHp: m.maxHp, ac: m.ac, type: "enemy", conditions: [], deathSaves: { ...BLANK_DS }, stabilized: false }]);
  };
  const saveMonster = m => { if (!savedMonsters.find(x => x.name === m.name)) { onSaveMonsters([...savedMonsters, m]); } };
  const removeMonster = name => onSaveMonsters(savedMonsters.filter(m => m.name !== name));
  const loadPGs = () => {
    const ex = combatants.map(c => c.name.toLowerCase());
    characters.filter(c => c.type === "pg" && !ex.includes(c.name.toLowerCase())).forEach(p => {
      const mhp = parseInt(p.maxHp) || parseInt(p.hp) || 20;
      setCombatants(prev => [...prev, { id: uid(), name: p.name, initiative: 0, hp: parseInt(p.hp) || mhp, maxHp: mhp, ac: parseInt(p.ac) || 10, type: "player", conditions: [], deathSaves: { ...BLANK_DS }, stabilized: false }]);
    });
  };
  const addManual = () => {
    if (!manualForm.name) return;
    const total = (parseInt(manualForm.initiative) || 0) + (parseInt(manualForm.mod) || 0);
    const mhp = parseInt(manualForm.maxHp) || parseInt(manualForm.hp) || 10;
    setCombatants(prev => [...prev, { id: uid(), name: manualForm.name, initiative: total, hp: parseInt(manualForm.hp) || mhp, maxHp: mhp, ac: parseInt(manualForm.ac) || 10, type: manualForm.type, conditions: [], deathSaves: { ...BLANK_DS }, stabilized: false }]);
    setManualForm(f => ({ ...f, name: "", initiative: "", hp: "", maxHp: "", ac: "" }));
  };
  const nextTurn = () => {
    const alive = sorted.filter(c => !isTrulyDead(c));
    if (!alive.length) return;
    let nx = (turn + 1) % sorted.length, att = 0;
    while (isTrulyDead(sorted[nx]) && att < sorted.length) { nx = (nx + 1) % sorted.length; att++; }
    if (nx <= turn) setRound(r => r + 1);
    setTurn(nx);
  };
  const syncHpToChars = (name, newHp) => {
    if (!onSaveChars) return;
    const updated = characters.map(ch => ch.type === "pg" && ch.name.toLowerCase() === name.toLowerCase() ? { ...ch, hp: String(newHp) } : ch);
    if (updated.some((ch, i) => ch.hp !== characters[i].hp)) onSaveChars(updated);
  };
  const chHp = (id, d) => {
    let syncName = null, syncHp = null;
    setCombatants(cs => {
      const updated = cs.map(x => {
        if (x.id !== id) return x;
        const newHp = Math.max(0, Math.min(x.maxHp, x.hp + d));
        const waking = newHp > 0 && x.hp === 0;
        if (x.type === "player") { syncName = x.name; syncHp = newHp; }
        return { ...x, hp: newHp, ...(waking ? { deathSaves: { ...BLANK_DS }, stabilized: false } : {}) };
      });
      return updated;
    });
    if (syncName !== null) syncHpToChars(syncName, syncHp);
  };
  const setHpD = (id, v) => {
    let syncName = null, syncHp = null;
    setCombatants(cs => {
      const updated = cs.map(x => {
        if (x.id !== id) return x;
        const newHp = Math.max(0, Math.min(x.maxHp, parseInt(v) || 0));
        const waking = newHp > 0 && x.hp === 0;
        if (x.type === "player") { syncName = x.name; syncHp = newHp; }
        return { ...x, hp: newHp, ...(waking ? { deathSaves: { ...BLANK_DS }, stabilized: false } : {}) };
      });
      return updated;
    });
    if (syncName !== null) syncHpToChars(syncName, syncHp);
  };
  const updInit = (id, v) => setCombatants(cs => cs.map(x => x.id === id ? { ...x, initiative: parseInt(v) || 0 } : x));
  const toggleCond = (id, cd) => setCombatants(cs => cs.map(x => x.id === id ? { ...x, conditions: x.conditions.includes(cd) ? x.conditions.filter(c => c !== cd) : [...x.conditions, cd] } : x));
  const rollDeathSave = (id) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    let msg = "";
    setCombatants(cs => cs.map(x => {
      if (x.id !== id || x.hp > 0 || x.stabilized) return x;
      const ds = { ...x.deathSaves };
      let newHp = x.hp, stabilized = x.stabilized;
      if (roll === 20) { newHp = 1; ds.successes = 0; ds.failures = 0; stabilized = false; msg = `${x.name}: NAT 20! 🌟`; }
      else if (roll === 1) { ds.failures = Math.min(3, ds.failures + 2); msg = `${x.name}: NAT 1 — 2 fallimenti! 💀`; }
      else if (roll >= 10) { ds.successes = Math.min(3, ds.successes + 1); if (ds.successes >= 3) { stabilized = true; msg = `${x.name}: Stabilizzato! ✅`; } else msg = `${x.name}: ${roll} — Successo (${ds.successes}/3) 💚`; }
      else { ds.failures = Math.min(3, ds.failures + 1); if (ds.failures >= 3) msg = `${x.name}: MORTO 💀`; else msg = `${x.name}: ${roll} — Fallimento (${ds.failures}/3) 🔴`; }
      return { ...x, hp: newHp, deathSaves: ds, stabilized };
    }));
    if (msg) { setDsToast(msg); setTimeout(() => setDsToast(null), 4000); }
  };
  const handleDeathSaveBubble = (id, type, bubbleIdx) => {
    setCombatants(cs => cs.map(x => {
      if (x.id !== id) return x;
      const ds = { ...x.deathSaves };
      const current = ds[type] || 0;
      ds[type] = bubbleIdx < current ? current - 1 : Math.min(3, bubbleIdx + 1);
      return { ...x, deathSaves: ds, stabilized: ds.successes >= 3 };
    }));
  };
  const resetCombat = () => { setCombatants([]); setTurn(0); setRound(1); onSaveCombatState?.({ combatants: [], turn: 0, round: 1 }); if (liveShare) shSet(shk.initiative, { active: false }); };
  const TB = { player: "border-yellow-600", ally: "border-blue-600", enemy: "border-red-700" };
  const TBadge = { player: "gold", ally: "blue", enemy: "red" };
  const TL = { player: "👤 PG", ally: "🤝 All.", enemy: "💀 Nem." };
  const doRulesSearch = async (q) => {
    const uq = q || rQuery; if (!uq.trim() || rLoading) return;
    setRQuery(""); const m = { role: "user", content: uq.trim() }; const nm = [...rMsgs, m]; setRMsgs(nm); setRLoading(true);
    const r = await aiCall(nm, "Sei un esperto di " + ruleset + ". Rispondi in italiano. Markdown.", 1600);
    setRMsgs(prev => [...prev, { role: "assistant", content: r || "Errore." }]); setRLoading(false);
  };
  const QUICK_Q = ["Grapple?","Copertura","Concentrazione","Azioni bonus","Tiri morte","Sorpresa"];
  const MonsterMini = ({ m }) => {
    const isSaved = !!savedMonsters.find(x => x.name === m.name);
    return (
      <div className="bg-zinc-800 border border-red-900/50 rounded-xl p-3 text-xs">
        <button className="w-full text-left mb-2" onClick={() => setMonsterModal(m)}>
          <div className="flex items-start justify-between"><div><p className="font-bold text-zinc-100 text-sm hover:text-yellow-400 transition-colors">{m.name}</p><p className="text-zinc-400">{m.type}</p></div><Badge color="red">CR {m.cr}</Badge></div>
          <div className="flex gap-3 text-zinc-400 mt-1.5"><span>🛡️ <span className="text-zinc-200 font-semibold">{m.ac}</span></span><span>❤️ <span className="text-zinc-200 font-semibold">{m.maxHp}</span></span><span className="text-zinc-600 ml-auto text-xs">scheda →</span></div>
        </button>
        <div className="flex gap-1.5 mt-1 border-t border-zinc-700 pt-2">
          <Btn size="sm" onClick={() => { addFromMonster(m); saveMonster(m); }} className="flex-1">⚔️ Aggiungi</Btn>
          {isSaved ? <Btn size="sm" variant="danger" onClick={() => removeMonster(m.name)}>🗑️</Btn> : <Btn size="sm" variant="secondary" onClick={() => saveMonster(m)}>💾</Btn>}
        </div>
      </div>
    );
  };
  return (
    <div className="flex h-full overflow-hidden" onClick={() => setCondOpen(null)}>
      {monsterModal && <MonsterModal monster={monsterModal} onClose={() => setMonsterModal(null)} onAddToCombat={addFromMonster} />}
      {dsToast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-600 rounded-xl px-4 py-2.5 text-sm text-zinc-200 shadow-xl pointer-events-none">🎲 {dsToast}</div>}
      <div className="w-60 border-r border-zinc-700 flex flex-col bg-zinc-900/30 shrink-0">
        <div className="p-3 border-b border-zinc-700 shrink-0"><h3 className="text-yellow-400 font-bold text-sm">🐉 Bestiario</h3></div>
        <div className="flex border-b border-zinc-700 shrink-0">{[["search","🔍 Cerca"],["saved","💾 ("+savedMonsters.length+")"]].map(([v,l]) => <button key={v} onClick={() => setBestView(v)} className={"flex-1 py-1.5 text-xs transition-colors " + (bestView === v ? "text-yellow-400 border-b-2 border-yellow-400 font-semibold" : "text-zinc-500 hover:text-zinc-300")}>{l}</button>)}</div>
        <div className="flex-1 overflow-y-auto p-3">
          {bestView === "search" && (
            <div className="space-y-3">
              <div className="flex gap-1.5"><input value={bestQuery} onChange={e => setBestQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") searchMonster(); }} placeholder="Goblin, Drago..." className="flex-1 min-w-0 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-700 text-xs" /><Btn size="sm" onClick={searchMonster} disabled={bestLoading || !bestQuery.trim()}>{bestLoading ? "⏳" : "🔍"}</Btn></div>
              {bestLoading && <div className="text-center py-6 text-zinc-400 text-xs animate-pulse">Consultando...</div>}
              {bestResult && !bestLoading && <MonsterMini m={bestResult} />}
              {!bestResult && !bestLoading && <div className="text-center py-8 text-zinc-600 text-xs"><div className="text-4xl mb-2">🐉</div><p>Cerca un mostro.</p></div>}
            </div>
          )}
          {bestView === "saved" && (
            <div className="space-y-2">{savedMonsters.length === 0 ? <div className="text-center py-8 text-zinc-600 text-xs"><div className="text-4xl">📚</div><p className="mt-2">Nessun mostro salvato.</p></div> : savedMonsters.map((m, i) => <MonsterMini key={i} m={m} />)}</div>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-zinc-700 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div><h2 className="text-lg font-bold text-yellow-400">⚔️ Iniziativa</h2><p className="text-zinc-400 text-xs">Round {round} · {sorted.filter(c => !isTrulyDead(c)).length} in gioco{sorted.filter(c => c.hp === 0 && c.type === "player" && !c.stabilized && (c.deathSaves?.failures||0) < 3).length > 0 && <span className="ml-2 text-orange-400 animate-pulse font-semibold">· ⚠️ {sorted.filter(c => c.hp === 0 && c.type === "player" && !c.stabilized && (c.deathSaves?.failures||0) < 3).length} morente/i</span>}</p></div>
          <div className="flex gap-1.5 flex-wrap">
            {characters.filter(c => c.type === "pg").length > 0 && <Btn variant="secondary" size="sm" onClick={loadPGs}>👤 PG</Btn>}
            {combatants.length > 0 && <Btn variant="secondary" size="sm" onClick={nextTurn}>▶ Turno</Btn>}
            <Btn variant="secondary" size="sm" onClick={() => setShowManualAdd(v => !v)}>{showManualAdd ? "✕" : "+ Manuale"}</Btn>
            <button onClick={toggleLiveShare} className={"px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border " + (liveShare ? "bg-red-600 border-red-500 text-white animate-pulse" : "bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600")}>📡 {liveShare ? "LIVE" : "Live"}</button>
            {combatants.length > 0 && <Btn variant="danger" size="sm" onClick={resetCombat}>🔄</Btn>}
          </div>
        </div>
        {showManualAdd && (
          <div className="p-3 border-b border-zinc-700 bg-zinc-800/60 shrink-0">
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-24"><label className="text-xs text-zinc-500 mb-1 block">Nome</label><Inp value={manualForm.name} onChange={v => setManualForm(f => ({...f, name: v}))} placeholder="Orco" /></div>
              <div className="w-40"><label className="text-xs text-zinc-500 mb-1 block">Init</label><div className="flex gap-1 items-center"><Inp value={manualForm.initiative} onChange={v => setManualForm(f => ({...f, initiative: v}))} placeholder="d20" type="number" className="w-14" /><span className="text-zinc-500 text-sm">+</span><Inp value={manualForm.mod} onChange={v => setManualForm(f => ({...f, mod: v}))} placeholder="mod" type="number" className="w-12" /><button onClick={() => setManualForm(f => ({...f, initiative: String(Math.floor(Math.random() * 20) + 1)}))} className="bg-zinc-600 hover:bg-zinc-500 px-1.5 rounded text-sm shrink-0">🎲</button></div></div>
              {[["❤️","hp","10"],["Max","maxHp","10"],["🛡️","ac","10"]].map(([lab,k,ph]) => <div key={k} className="w-16"><label className="text-xs text-zinc-500 mb-1 block">{lab}</label><Inp value={manualForm[k]} onChange={v => setManualForm(f => ({...f, [k]: v}))} placeholder={ph} type="number" /></div>)}
              <div><label className="text-xs text-zinc-500 mb-1 block">Tipo</label><select value={manualForm.type} onChange={e => setManualForm(f => ({...f, type: e.target.value}))} className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-2 text-zinc-200 text-sm"><option value="player">PG</option><option value="ally">All.</option><option value="enemy">Nem.</option></select></div>
              <Btn onClick={addManual} disabled={!manualForm.name}>+</Btn>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {combatants.length === 0 ? <div className="text-center py-12 text-zinc-400"><div className="text-5xl mb-3">⚔️</div><p>Cerca un mostro o carica i PG!</p></div> : sorted.map(c => {
            const isAct = c.id === sorted[turn]?.id;
            const isDying = c.hp === 0 && c.type === "player" && !c.stabilized && (c.deathSaves?.failures || 0) < 3;
            const isStabilized = c.hp === 0 && c.type === "player" && c.stabilized;
            const isDead = isTrulyDead(c);
            const pct = c.maxHp > 0 ? c.hp / c.maxHp * 100 : 0;
            const hpCol = pct > 50 ? "bg-green-600" : pct > 25 ? "bg-yellow-500" : "bg-red-600";
            const borderClass = isDying ? "border-orange-500 animate-pulse" : (TB[c.type] || "border-zinc-600");
            const bgClass = isDead ? "bg-zinc-800/40" : isAct ? "bg-zinc-700/80" : "bg-zinc-800";
            return (
              <div key={c.id} onClick={e => e.stopPropagation()} className={"rounded-xl border-2 px-3 py-2 transition-all " + borderClass + " " + bgClass + (isDead ? " opacity-35" : "")}>
                <div className="flex items-center gap-2">
                  <input type="number" value={c.initiative} onChange={e => updInit(c.id, e.target.value)} className={"w-9 h-9 rounded-full text-center font-bold text-sm border-0 focus:outline-none shrink-0 " + (isAct ? "bg-yellow-400 text-zinc-900 ring-2 ring-yellow-400" : "bg-zinc-600 text-zinc-300")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isAct && <span className="text-yellow-400 text-xs font-bold animate-pulse">▶</span>}
                      {isDying && <span className="text-orange-400 text-xs font-bold animate-pulse">⚠️</span>}
                      <span className={"font-bold text-sm " + (isDead ? "line-through text-zinc-500" : isDying ? "text-orange-300" : "text-zinc-200")}>{c.name}</span>
                      <span className="text-xs text-zinc-500">🛡️{c.ac}</span>
                      <Badge color={TBadge[c.type] || "zinc"}>{TL[c.type] || c.type}</Badge>
                      {isDying && <Badge color="red">Morente</Badge>}
                      {isStabilized && <Badge color="green">Stabile</Badge>}
                    </div>
                    {!isDying && !isStabilized && (<div className="flex items-center gap-2 mt-0.5"><div className="flex-1 h-1.5 bg-zinc-600 rounded-full overflow-hidden max-w-20"><div className={"h-full transition-all " + hpCol} style={{ width: pct + "%" }} /></div><span className="text-xs text-zinc-400">❤️ {c.hp}/{c.maxHp}</span></div>)}
                    {isStabilized && <div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-green-400">❤️ 0/{c.maxHp} — stabile</span></div>}
                    {c.conditions?.length > 0 && <div className="flex flex-wrap gap-0.5 mt-0.5">{c.conditions.map(cd => <Badge key={cd} color="red">{cd}</Badge>)}</div>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isDying ? (
                      <DeathSaveTracker c={c} onRoll={() => rollDeathSave(c.id)} onManual={(type, idx) => handleDeathSaveBubble(c.id, type, idx)} />
                    ) : (
                      <>
                        <button onClick={() => chHp(c.id, -1)} className="w-6 h-6 rounded bg-red-800/50 hover:bg-red-700/70 text-red-300 font-bold flex items-center justify-center">−</button>
                        <input type="number" value={c.hp} onChange={e => setHpD(c.id, e.target.value)} className="w-11 text-center bg-zinc-700 border border-zinc-600 rounded text-xs text-zinc-200 py-1" />
                        <button onClick={() => chHp(c.id, 1)} className="w-6 h-6 rounded bg-green-800/50 hover:bg-green-700/70 text-green-300 font-bold flex items-center justify-center">+</button>
                      </>
                    )}
                    <div className="relative ml-0.5">
                      <button onClick={e => { e.stopPropagation(); setCondOpen(condOpen === c.id ? null : c.id); }} className="w-6 h-6 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-300 text-xs flex items-center justify-center">🩹</button>
                      {condOpen === c.id && (
                        <div className="absolute right-0 top-8 z-20 bg-zinc-800 border border-zinc-600 rounded-xl p-2 shadow-xl w-52 flex flex-wrap gap-1" onClick={e => e.stopPropagation()}>
                          {CONDITIONS.map(cd => <button key={cd} onClick={() => toggleCond(c.id, cd)} className={"text-xs px-1.5 py-0.5 rounded-full border transition-colors " + (c.conditions?.includes(cd) ? "bg-red-700/40 border-red-600/50 text-red-300" : "border-zinc-600 text-zinc-400 hover:border-zinc-400")}>{cd}</button>)}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setCombatants(cs => cs.filter(x => x.id !== c.id))} className="w-6 h-6 rounded bg-zinc-600 hover:bg-red-800/60 text-zinc-400 hover:text-red-300 text-xs flex items-center justify-center ml-0.5">✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="w-56 border-l border-zinc-700 flex flex-col bg-zinc-900/30 shrink-0">
        <div className="p-3 border-b border-zinc-700 shrink-0 flex items-center justify-between"><h3 className="text-yellow-400 font-bold text-sm">📖 Regole</h3>{rMsgs.length > 0 && <Btn variant="ghost" size="sm" onClick={() => setRMsgs([])}>✕</Btn>}</div>
        {rMsgs.length === 0 && <div className="p-2 border-b border-zinc-700 shrink-0"><div className="flex flex-wrap gap-1">{QUICK_Q.map(q => <button key={q} onClick={() => doRulesSearch(q)} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-yellow-400 px-2 py-1 rounded-lg transition-colors">{q}</button>)}</div></div>}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">{rMsgs.length === 0 && <div className="text-center py-8 text-zinc-600 text-xs space-y-2"><div className="text-3xl">📖</div><p>Regole rapide.</p></div>}{rMsgs.map((m, i) => <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}><div className={"max-w-full rounded-xl px-2.5 py-2 " + (m.role === "user" ? "bg-red-800/80 text-zinc-100 text-xs font-medium" : "bg-zinc-700")}>{m.role === "assistant" ? <MD text={m.content} /> : <span className="text-xs">{m.content}</span>}</div></div>)}{rLoading && <div className="bg-zinc-700 rounded-xl px-2.5 py-2 text-zinc-400 text-xs animate-pulse">📖 Consultando...</div>}<div ref={rBottomRef} /></div>
        <div className="p-2 border-t border-zinc-700 shrink-0 flex gap-1.5"><input value={rQuery} onChange={e => setRQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") doRulesSearch(); }} placeholder="Cerca regola..." className="flex-1 min-w-0 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-700 text-xs" /><Btn size="sm" onClick={() => doRulesSearch()} disabled={rLoading || !rQuery.trim()}>↵</Btn></div>
      </div>
    </div>
  );
}

function RulesSearch({ campaign }) {
  const [query, setQuery] = useState(""); const [msgs, setMsgs] = useState([]); const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current && bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const ruleset = RULESETS.find(r => r.id === (campaign?.ruleset || "5e2014"))?.label || "D&D 5e";
  const SYS = "Sei un esperto di " + ruleset + ". Rispondi SEMPRE in italiano. Usa markdown.";
  const doSearch = async (q) => { const uq = q || query; if (!uq.trim() || loading) return; setQuery(""); const m = { role: "user", content: uq.trim() }; const nm = [...msgs, m]; setMsgs(nm); setLoading(true); const r = await aiCall(nm, SYS, 3200); setMsgs(prev => [...prev, { role: "assistant", content: r || "Errore API." }]); setLoading(false); };
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-52 border-r border-zinc-700 flex flex-col shrink-0 overflow-y-auto bg-zinc-900/50"><div className="p-3 border-b border-zinc-700 shrink-0"><h3 className="text-yellow-400 font-semibold text-sm">📖 Rapida</h3></div><div className="p-2">{QUICK_RULES.map(g => <div key={g.cat} className="mb-4"><p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">{g.cat}</p>{g.items.map(q => <button key={q} onClick={() => doSearch(q)} className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-700 hover:text-yellow-400 transition-colors">{q}</button>)}</div>)}</div></div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-700 shrink-0"><h2 className="text-xl font-bold text-yellow-400 mb-2">📖 Regole — {ruleset}</h2><div className="flex gap-2"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") doSearch(); }} placeholder="Cerca incantesimi, mostri, regole..." className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-700 text-sm" /><Btn onClick={() => doSearch()} disabled={loading || !query.trim()}>Cerca</Btn>{msgs.length > 0 && <Btn variant="secondary" onClick={() => setMsgs([])}>Pulisci</Btn>}</div></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">{msgs.length === 0 && <div className="text-center py-12 text-zinc-400"><div className="text-5xl mb-3">📖</div><p>Cerca qualsiasi cosa.</p></div>}{msgs.map((m, i) => <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}><div className={"max-w-3xl rounded-xl px-4 py-3 " + (m.role === "user" ? "bg-red-800/80 text-zinc-100 text-sm font-medium" : "bg-zinc-700")}>{m.role === "assistant" ? <MD text={m.content} /> : <span>{m.content}</span>}</div></div>)}{loading && <div className="flex justify-start"><div className="bg-zinc-700 rounded-xl px-4 py-3 text-zinc-400 text-sm animate-pulse">📖 Consultando...</div></div>}<div ref={bottomRef} /></div>
      </div>
    </div>
  );
}

function SharePanel({ campaign, sessions, plots, onSavePlots, shk, characters, onSaveChars }) {
  const [annText, setAnnText] = useState(""); const [announcements, setAnnouncements] = useState([]); const [pubCampaign, setPubCampaign] = useState(false); const [savedMsg, setSavedMsg] = useState(""); const [playerChars, setPlayerChars] = useState([]); const [expandedChar, setExpandedChar] = useState(null); const [syncing, setSyncing] = useState(false);
  const flash = msg => { setSavedMsg(msg); setTimeout(() => setSavedMsg(""), 2000); };
  const forceSyncPlots = async () => { setSyncing(true); await shSet(shk.plots, plots.filter(p => p.sharedWithPlayers)); setSyncing(false); flash("✅ Trame sincronizzate!"); };
  useEffect(() => { const load = async () => { const ann = await shGet(shk.ann); if (ann) setAnnouncements(ann); const sc = await shGet(shk.campaign); if (sc) setPubCampaign(true); }; load(); }, []);
  useEffect(() => {
    const poll = async () => {
      const results = [];
      try { const prefix = shk.pc(""); const listResult = await window.storage.list(prefix, true); if (listResult?.keys?.length) { for (const key of listResult.keys) { try { const r = await window.storage.get(key, true); if (r?.value) results.push(JSON.parse(r.value)); } catch {} } } } catch {}
      setPlayerChars(results);
    };
    poll(); const id = setInterval(poll, 30000); return () => clearInterval(id);
  }, []);
  const importToChars = (pc) => {
    const already = characters.some(c => c.name.toLowerCase() === (pc.name || "").toLowerCase() && c.type === "pg");
    if (already) { flash("Personaggio già presente!"); return; }
    onSaveChars([...characters, { id: uid(), name: pc.name || "PG", type: "pg", race: pc.race || "", class: pc.cls || "", level: pc.level || "1", background: pc.notes || "", notes: "", hp: pc.hp || pc.maxHp || "", maxHp: pc.maxHp || "", ac: pc.ac || "" }]);
    flash("✅ " + (pc.name || "PG") + " aggiunto!");
  };
  const toggleCampaignShare = async () => {
    if (pubCampaign) { await shSet(shk.campaign, null); setPubCampaign(false); flash("Info campagna rimosse."); }
    else { await shSet(shk.campaign, { name: campaign.name, tone: campaign.tone, description: campaign.description, locations: campaign.locations || [] }); setPubCampaign(true); flash("Info campagna pubblicate!"); }
  };
  const postAnnouncement = async () => {
    if (!annText.trim()) return;
    const newAnn = [...announcements, { id: uid(), text: annText.trim(), date: new Date().toLocaleDateString("it-IT") }];
    await shSet(shk.ann, newAnn); setAnnouncements(newAnn); setAnnText(""); flash("Annuncio pubblicato!");
  };
  const removeAnn = async (id) => { const na = announcements.filter(a => a.id !== id); await shSet(shk.ann, na); setAnnouncements(na); };
  const togglePlotShare = async (plotId) => {
    const updated = plots.map(p => p.id === plotId ? { ...p, sharedWithPlayers: !p.sharedWithPlayers } : p);
    onSavePlots(updated); await shSet(shk.plots, updated.filter(p => p.sharedWithPlayers));
  };
  const mod = v => { const m = Math.floor(((v || 10) - 10) / 2); return (m >= 0 ? "+" : "") + m; };
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6"><div><h2 className="text-2xl font-bold text-yellow-400">📡 Bacheca del Master</h2><p className="text-zinc-400 text-sm">Controlla cosa vedono i giocatori.</p></div><div className="flex items-center gap-3">{savedMsg && <span className="text-green-400 text-sm">{savedMsg}</span>}<button onClick={forceSyncPlots} disabled={syncing} className={"px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors " + (syncing ? "opacity-50 border-cyan-700/40 bg-cyan-900/20 text-cyan-300" : "border-cyan-700/50 bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300")}>📡 {syncing ? "Sync..." : "Sincronizza ora"}</button></div></div>
        <div className="grid grid-cols-2 gap-5">
          <Card><h3 className="text-yellow-500 font-semibold mb-3 text-sm">🌍 Info Campagna</h3><p className="text-zinc-400 text-xs mb-3">Mostra nome, tono e descrizione del mondo ai giocatori.</p><div className={"flex items-center justify-between p-3 rounded-xl border " + (pubCampaign ? "border-cyan-600/50 bg-cyan-900/20" : "border-zinc-700 bg-zinc-700/30")}><span className="text-sm text-zinc-200">{pubCampaign ? "👁 Visibile" : "🔒 Nascosta"}</span><button onClick={toggleCampaignShare} className={"px-3 py-1 rounded-lg text-sm font-semibold transition-colors " + (pubCampaign ? "bg-cyan-700 text-white hover:bg-cyan-600" : "bg-zinc-600 text-zinc-200 hover:bg-zinc-500")}>{pubCampaign ? "Rimuovi" : "Pubblica"}</button></div></Card>
          <Card><h3 className="text-yellow-500 font-semibold mb-3 text-sm">📢 Annunci</h3><div className="space-y-2 mb-3 max-h-32 overflow-y-auto">{announcements.length === 0 && <p className="text-zinc-600 text-xs italic">Nessun annuncio.</p>}{announcements.map(a => <div key={a.id} className="flex items-start gap-2 bg-zinc-700/50 rounded-lg px-3 py-2"><div className="flex-1"><p className="text-zinc-200 text-xs">{a.text}</p><p className="text-zinc-600 text-xs">{a.date}</p></div><button onClick={() => removeAnn(a.id)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button></div>)}</div><Txta value={annText} onChange={setAnnText} placeholder="Scrivi un annuncio..." rows={2} /><Btn size="sm" onClick={postAnnouncement} disabled={!annText.trim()} className="mt-2">📢 Pubblica</Btn></Card>
          <Card className="col-span-2"><h3 className="text-yellow-500 font-semibold mb-3 text-sm">📜 Trame Condivise</h3><p className="text-zinc-400 text-xs mb-3">Seleziona le trame visibili ai giocatori.</p>{plots.length === 0 ? <p className="text-zinc-600 text-xs italic">Nessuna trama.</p> : <div className="space-y-2">{plots.filter(p => p.status !== "hidden").map(p => (<div key={p.id} className={"flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors " + (p.sharedWithPlayers ? "border-cyan-600/50 bg-cyan-900/20" : "border-zinc-700 bg-zinc-700/30")}><input type="checkbox" checked={!!p.sharedWithPlayers} onChange={() => togglePlotShare(p.id)} className="accent-blue-500 shrink-0" /><div className="flex-1 min-w-0"><p className="text-zinc-200 text-sm font-medium truncate">{p.title}</p><p className="text-zinc-500 text-xs truncate">{p.description}</p></div>{p.sharedWithPlayers && <Badge color="cyan">👁 Visibile</Badge>}<Badge color={p.status === "active" ? "green" : "zinc"}>{p.status}</Badge></div>))}</div>}</Card>
          <Card className="col-span-2"><h3 className="text-yellow-500 font-semibold mb-1 text-sm">👤 Schede dei Giocatori</h3><p className="text-zinc-400 text-xs mb-3">Schede compilate dai giocatori — si aggiornano ogni 30 secondi.</p>{playerChars.length === 0 ? <p className="text-zinc-600 text-xs italic">Nessuna scheda ricevuta.</p> : <div className="space-y-3">{playerChars.map((pc, i) => { const isExpanded = expandedChar === i; return (<div key={i} className="bg-zinc-700/50 border border-zinc-600 rounded-xl overflow-hidden"><div className="flex items-center"><button onClick={() => setExpandedChar(isExpanded ? null : i)} className="flex-1 text-left p-3 flex items-center justify-between hover:bg-zinc-700/70 transition-colors"><div className="flex items-center gap-3"><span className="text-2xl">👤</span><div><p className="font-bold text-zinc-200">{pc.name}</p><p className="text-xs text-zinc-400">{[pc.race, pc.cls, pc.level && "Lv." + pc.level].filter(Boolean).join(" · ")}</p></div>{(pc.hp || pc.maxHp) && <span className="text-xs text-green-400 ml-2">❤️ {pc.hp}/{pc.maxHp} · 🛡️ {pc.ac || "?"}</span>}</div><span className="text-zinc-500 text-sm">{isExpanded ? "▲" : "▼"}</span></button><button onClick={() => importToChars(pc)} className="shrink-0 mr-3 px-2 py-1 rounded-lg bg-red-800/40 hover:bg-red-700/60 border border-red-700/40 text-red-300 text-xs font-semibold transition-colors">➕ PG</button></div>{isExpanded && <div className="border-t border-zinc-600 p-3 space-y-3"><div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">💪 Caratteristiche</p><div className="grid grid-cols-6 gap-1.5">{STATS_KEYS.map((k, si) => (<div key={k} className="bg-zinc-800 rounded-lg p-2 text-center border border-zinc-700"><p className="text-xs text-zinc-500 font-bold">{STATS_LABELS[si]}</p><p className="text-base font-bold text-blue-300">{mod(pc[k])}</p><p className="text-xs text-zinc-500">{pc[k] || 10}</p></div>))}</div></div>{pc.notes && <div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">📝 Note</p><p className="text-xs text-zinc-300 whitespace-pre-wrap">{pc.notes}</p></div>}</div>}</div>); })}</div>}</Card>
        </div>
      </div>
    </div>
  );
}

function AbilityLine({ line }) {
  if (!line.trim()) return <div className="h-1" />;
  if (line.startsWith("- ") || line.startsWith("* ")) return <div className="flex gap-2 items-start"><span className="text-blue-400 shrink-0 mt-0.5">•</span><span className="text-zinc-200 text-sm">{line.slice(2)}</span></div>;
  if (/^\d+\.\s/.test(line)) { const m = line.match(/^(\d+)\.\s(.*)/); return m ? <div className="flex gap-2 items-start"><span className="text-blue-400 shrink-0 font-bold text-sm">{m[1]}.</span><span className="text-zinc-200 text-sm">{m[2]}</span></div> : <p className="text-zinc-200 text-sm">{line}</p>; }
  if (line.startsWith("##") || line.startsWith("**")) return <p className="text-blue-300 font-bold text-sm mt-2">{line.replace(/^#+\s*|\*\*/g, "")}</p>;
  return <p className="text-zinc-300 text-sm">{line}</p>;
}
function AbilitiesDisplay({ text }) {
  if (!text?.trim()) return <p className="text-zinc-600 text-xs italic">Nessuna info.</p>;
  return <div className="space-y-0.5">{text.split("\n").map((l, i) => <AbilityLine key={i} line={l} />)}</div>;
}

function DiceRoller() {
  const [dieType, setDieType] = useState(20); const [diceCount, setDiceCount] = useState(1); const [modifier, setModifier] = useState(0);
  const [result, setResult] = useState(null); const [history, setHistory] = useState([]);
  const dice = [4,6,8,10,12,20,100];
  const roll = () => {
    const rolls = Array.from({length:diceCount},()=>Math.floor(Math.random()*dieType)+1);
    const total = rolls.reduce((a,b)=>a+b,0)+modifier;
    const isCrit = dieType===20&&diceCount===1&&rolls[0]===20, isFumble = dieType===20&&diceCount===1&&rolls[0]===1;
    const res = {rolls,modifier,total,diceCount,dieType,isCrit,isFumble,time:new Date().toLocaleTimeString("it-IT")};
    setResult(res); setHistory(h=>[res,...h].slice(0,15));
  };
  return (
    <div className="p-4 overflow-y-auto h-full">
      <h2 className="text-xl font-bold text-blue-400 mb-5">🎲 Lancia i Dadi</h2>
      <div className="max-w-lg mx-auto">
        <PCard className="mb-5">
          <div className="mb-4"><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Tipo di dado</p><div className="flex gap-2 flex-wrap">{dice.map(d=><button key={d} onClick={()=>setDieType(d)} className={"w-12 h-12 rounded-xl font-bold text-sm border-2 transition-all "+(dieType===d?"border-blue-500 bg-blue-800/40 text-blue-300":"border-zinc-600 bg-zinc-700 text-zinc-300 hover:border-blue-600/50")}>d{d}</button>)}</div></div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Numero di dadi</p><div className="flex items-center gap-2"><button onClick={()=>setDiceCount(c=>Math.max(1,c-1))} className="w-8 h-8 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold">−</button><span className="text-xl font-bold text-zinc-200 w-8 text-center">{diceCount}</span><button onClick={()=>setDiceCount(c=>Math.min(10,c+1))} className="w-8 h-8 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold">+</button></div></div>
            <div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Modificatore</p><div className="flex items-center gap-2"><button onClick={()=>setModifier(m=>m-1)} className="w-8 h-8 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold">−</button><span className="text-xl font-bold text-zinc-200 w-10 text-center">{modifier>=0?"+":""}{modifier}</span><button onClick={()=>setModifier(m=>m+1)} className="w-8 h-8 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold">+</button></div></div>
          </div>
          <button onClick={roll} className="w-full py-4 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xl rounded-xl transition-colors">🎲 Lancia {diceCount}d{dieType}{modifier!==0?(modifier>0?"+"+modifier:modifier):""}</button>
        </PCard>
        {result&&<PCard className={"mb-5 text-center border-2 "+(result.isCrit?"border-yellow-500 bg-yellow-900/20":result.isFumble?"border-red-600 bg-red-900/20":"border-blue-700/40")}>{result.isCrit&&<p className="text-yellow-400 font-bold text-sm mb-2">⭐ CRITICO!</p>}{result.isFumble&&<p className="text-red-400 font-bold text-sm mb-2">💀 FUMBLE!</p>}<p className={"font-bold mb-1 text-6xl "+(result.isCrit?"text-yellow-400":result.isFumble?"text-red-400":"text-blue-300")}>{result.total}</p><p className="text-zinc-400 text-sm">[{result.rolls.join(", ")}]{result.modifier!==0?" "+(result.modifier>0?"+":"")+result.modifier:""}</p></PCard>}
        {history.length>0&&<div><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Storico</p><div className="space-y-1">{history.map((r,i)=><div key={i} className="flex items-center gap-3 bg-zinc-700/40 rounded-lg px-3 py-2 text-xs"><span className="text-zinc-500">{r.time}</span><span className="text-zinc-400">{r.diceCount}d{r.dieType}{r.modifier!==0?(r.modifier>0?"+":"")+r.modifier:""}</span><span className="text-zinc-500 flex-1">[{r.rolls.join(", ")}]</span><span className={"font-bold text-sm "+(r.isCrit?"text-yellow-400":r.isFumble?"text-red-400":"text-blue-300")}>{r.total}</span></div>)}</div></div>}
      </div>
    </div>
  );
}

function PlayerBacheca({ shk }) {
  const [data, setData] = useState({ campaign: null, plots: [], announcements: [] }); const [loading, setLoading] = useState(true); const [modal, setModal] = useState(null); const [refreshing, setRefreshing] = useState(false);
  const manualRefresh = async () => { setRefreshing(true); const [camp,plots,ann] = await Promise.all([shGet(shk.campaign),shGet(shk.plots),shGet(shk.ann)]); setData({campaign:camp,plots:plots||[],announcements:ann||[]}); setRefreshing(false); };
  useEffect(() => { const load = async () => { setLoading(true); const [camp,plots,ann] = await Promise.all([shGet(shk.campaign),shGet(shk.plots),shGet(shk.ann)]); setData({campaign:camp,plots:plots||[],announcements:ann||[]}); setLoading(false); }; load(); const id=setInterval(load,30000); return ()=>clearInterval(id); }, []);
  const tone = TONES.find(t => t.id === data.campaign?.tone);
  if (loading) return <div className="flex items-center justify-center h-full text-blue-400 animate-pulse">Caricamento...</div>;
  if (!data.campaign && !data.announcements.length && !data.plots.length) return <div className="flex items-center justify-center h-full"><div className="text-center text-zinc-500"><div className="text-5xl mb-4">🔒</div><p className="text-lg">Nessuna informazione disponibile.</p></div></div>;
  return (
    <div className="p-4 overflow-y-auto h-full">
      {modal && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={()=>setModal(null)}><div className="bg-zinc-900 border border-blue-700/50 rounded-2xl max-w-lg w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between p-5 border-b border-zinc-700 shrink-0"><h2 className="text-lg font-bold text-blue-300">{modal.type==="campaign"&&"🌍 "+modal.data.name}{modal.type==="plot"&&"📜 "+modal.data.title}{modal.type==="ann"&&"📢 Annuncio"}</h2><button onClick={()=>setModal(null)} className="text-zinc-500 hover:text-zinc-200 text-xl">✕</button></div><div className="p-5 space-y-3 text-sm text-zinc-300 overflow-y-auto flex-1">{modal.type==="campaign"&&<>{tone&&<Badge color="cyan">{tone.icon} {tone.label}</Badge>}{modal.data.description&&<p className="mt-2 leading-relaxed">{modal.data.description}</p>}{modal.data.locations?.length>0&&<div className="mt-3"><p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">📍 Luoghi</p><div className="space-y-1.5">{modal.data.locations.map((l,i)=><div key={i} className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-1.5"><Badge color="zinc">{l.type}</Badge><span className="text-zinc-200">{l.name}</span>{l.desc&&<span className="text-zinc-500 text-xs">— {l.desc}</span>}</div>)}</div></div>}</>}{modal.type==="plot"&&<MD text={modal.data.description} />}{modal.type==="ann"&&<><p className="leading-relaxed">{modal.data.text}</p><p className="text-zinc-600 text-xs">{modal.data.date}</p></>}</div></div></div>)}
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-blue-400">📋 Bacheca</h2><button onClick={manualRefresh} disabled={refreshing} className={"text-xs px-2.5 py-1.5 rounded-lg border transition-colors "+(refreshing?"opacity-50 border-blue-700/40 text-blue-400":"border-blue-700/40 text-blue-400 hover:bg-blue-900/30")}>{refreshing?"⏳":"🔄 Aggiorna"}</button></div>
      <div className="space-y-4">
        {data.campaign&&<button onClick={()=>setModal({type:"campaign",data:data.campaign})} className="w-full text-left"><PCard className="hover:border-blue-500/60 transition-colors"><div className="flex items-center justify-between"><h3 className="text-blue-400 font-bold text-lg">{data.campaign.name}</h3><span className="text-zinc-600 text-xs">leggi →</span></div>{tone&&<div className="mt-1 mb-2"><Badge color="cyan">{tone.icon} {tone.label}</Badge></div>}{data.campaign.description&&<p className="text-zinc-300 text-sm line-clamp-2">{data.campaign.description}</p>}{data.campaign.locations?.length>0&&<div className="mt-2 flex flex-wrap gap-1.5">{data.campaign.locations.map((l,i)=><Badge key={i} color="zinc">{l.type} · {l.name}</Badge>)}</div>}</PCard></button>}
        {data.announcements.length>0&&<div><h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">📢 Annunci del Master</h3><div className="space-y-2">{data.announcements.map(a=><button key={a.id} onClick={()=>setModal({type:"ann",data:a})} className="w-full text-left"><div className="bg-zinc-700/60 border border-blue-700/30 hover:border-blue-500/50 rounded-xl px-4 py-3 transition-colors flex items-center justify-between gap-3"><p className="text-zinc-200 text-sm line-clamp-1">{a.text}</p><span className="text-zinc-600 text-xs shrink-0">leggi →</span></div></button>)}</div></div>}
        {data.plots.length>0&&<div><h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">📜 Trame Attive</h3><div className="grid grid-cols-1 gap-2">{data.plots.map((p,i)=><button key={i} onClick={()=>setModal({type:"plot",data:p})} className="w-full text-left"><PCard className="hover:border-blue-500/60 transition-colors"><div className="flex items-center justify-between"><h4 className="font-bold text-zinc-200 text-sm">{p.title}</h4><span className="text-zinc-600 text-xs shrink-0 ml-2">leggi →</span></div>{p.description&&<p className="text-zinc-400 text-xs mt-1 line-clamp-2">{p.description}</p>}</PCard></button>)}</div></div>}
      </div>
    </div>
  );
}

function LiveCombat({ shk }) {
  const [data, setData] = useState(null); const [lastUpdate, setLastUpdate] = useState(null);
  useEffect(() => { const load = async () => { const d = await shGet(shk.initiative); setData(d); if (d?.updatedAt) setLastUpdate(new Date(d.updatedAt).toLocaleTimeString("it-IT")); }; load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, []);
  const TB = { player: "border-yellow-600", ally: "border-blue-600", enemy: "border-red-700" };
  const TL = { player: "👤 PG", ally: "🤝 All.", enemy: "💀 Nem." };
  const TBadge = { player: "gold", ally: "blue", enemy: "red" };
  if (!data?.active) return <div className="flex items-center justify-center h-full"><div className="text-center py-16 text-zinc-500"><div className="text-5xl mb-4">⚔️</div><p className="text-lg font-medium">Nessun combattimento in corso</p><p className="text-xs text-zinc-700 mt-6">Aggiornamento ogni 5 secondi</p></div></div>;
  const sorted = data.combatants || [];
  const current = sorted[data.turn];
  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4"><div><div className="flex items-center gap-3"><h2 className="text-xl font-bold text-blue-400">⚔️ Combattimento</h2><span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">🔴 LIVE</span></div><p className="text-zinc-400 text-sm">Round {data.round} {lastUpdate&&<span className="text-zinc-600">· agg. {lastUpdate}</span>}</p></div>{current&&<div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl px-3 py-1.5 text-center"><p className="text-xs text-zinc-400">Turno di</p><p className="text-yellow-400 font-bold text-sm">{current.name}</p></div>}</div>
      <div className="space-y-2">{sorted.map((c,i)=>{const isAct=i===data.turn,isDying=c.hp===0&&c.type==="player"&&!c.stabilized&&(c.deathSaves?.failures||0)<3,isDead=c.hp===0&&(c.type!=="player"||(c.deathSaves?.failures||0)>=3);const pct=c.maxHp>0?c.hp/c.maxHp*100:0,hpCol=pct>50?"bg-green-600":pct>25?"bg-yellow-500":"bg-red-600";return <div key={c.id||i} className={"rounded-xl border-2 px-3 py-2.5 "+(TB[c.type]||"border-zinc-600")+" "+(isAct?"bg-zinc-700/80":"bg-zinc-800")+(isDead?" opacity-40":"")}><div className="flex items-center gap-3"><div className={"w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 "+(isAct?"bg-yellow-400 text-zinc-900 ring-2 ring-yellow-400":"bg-zinc-600 text-zinc-300")}>{c.initiative}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap">{isAct&&<span className="text-yellow-400 text-xs font-bold animate-pulse">▶ Turno</span>}{isDying&&<span className="text-orange-400 text-xs font-bold animate-pulse">⚠️ Morente</span>}<span className={"font-bold "+(isDead?"line-through text-zinc-500":isDying?"text-orange-300":"text-zinc-200")}>{c.name}</span><Badge color={TBadge[c.type]||"zinc"}>{TL[c.type]||c.type}</Badge>{c.type==="player"&&!isDying&&!isDead&&<span className="text-xs text-zinc-500">🛡️ {c.ac}</span>}</div>{!isDying&&c.type==="player"&&<div className="flex items-center gap-3 mt-1"><div className="flex-1 h-2 bg-zinc-600 rounded-full overflow-hidden max-w-28"><div className={"h-full transition-all "+hpCol} style={{width:pct+"%"}} /></div><span className="text-sm text-zinc-400">❤️ {c.hp}/{c.maxHp}</span></div>}{isDying&&<div className="flex items-center gap-2 mt-1"><span className="text-xs text-zinc-500">Tiri: </span><div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className={"w-3 h-3 rounded-full "+((c.deathSaves?.successes||0)>i?"bg-green-500":"bg-zinc-600")} />)}</div><div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className={"w-3 h-3 rounded-full "+((c.deathSaves?.failures||0)>i?"bg-red-600":"bg-zinc-600")} />)}</div></div>}{c.conditions?.length>0&&<div className="flex flex-wrap gap-1 mt-1">{c.conditions.map(cd=><Badge key={cd} color="red">{cd}</Badge>)}</div>}</div>{isDead&&<span className="text-zinc-600 text-lg">💀</span>}</div></div>;})}
      </div>
    </div>
  );
}

function PlayerRecap({ shk }) {
  const [recap, setRecap] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { const load = async () => { setLoading(true); const r = await shGet(shk.recap); setRecap(r); setLoading(false); }; load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, []);
  if (loading) return <div className="flex items-center justify-center h-full text-blue-400 animate-pulse">Caricamento...</div>;
  if (!recap?.text) return <div className="flex items-center justify-center h-full"><div className="text-center text-zinc-500"><div className="text-5xl mb-4">📅</div><p>Nessun recap disponibile.</p></div></div>;
  return (<div className="flex items-center justify-center h-full p-4"><div className="max-w-2xl w-full"><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-blue-400">📅 Recap Sessione</h2>{recap.date&&<Badge color="zinc">Sessione #{recap.sessionNum} · {recap.date}</Badge>}</div><PCard><div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-700"><p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm italic">{recap.text}</p></div></PCard></div></div>);
}

// ── CHANGE 2/5: PlayerRules — usa localRuleset se fornito, poi tenta shk.campaign ──
function PlayerRules({ shk, localRuleset }) {
  const [ruleset, setRuleset] = useState(() => {
    if (localRuleset) { const f = RULESETS.find(r => r.id === localRuleset); return f ? f.label : "D&D 5e (2014)"; }
    return "D&D 5e (2014)";
  });
  const [query, setQuery] = useState(""); const [msgs, setMsgs] = useState([]);  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => {
    // Se non abbiamo un ruleset locale, proviamo a leggerlo dalla stanza (se esiste)
    if (!localRuleset) {
      shGet(shk.campaign).then(c => {
        if (c?.ruleset) { const found = RULESETS.find(r => r.id === c.ruleset); if (found) setRuleset(found.label); }
      });
    }
  }, [localRuleset]);
  const SYS = "Sei un esperto di " + ruleset + ". Rispondi SEMPRE in italiano. Usa markdown.";
  const doSearch = async (q) => { const uq = q || query; if (!uq.trim() || loading) return; setQuery(""); const m = { role: "user", content: uq.trim() }; const nm = [...msgs, m]; setMsgs(nm); setLoading(true); const r = await aiCall(nm, SYS, 3200); setMsgs(prev => [...prev, { role: "assistant", content: r || "Errore API." }]); setLoading(false); };
  const QUICK_P = [{ cat: "✨ Incantesimi", items: ["Palla di Fuoco","Cura Ferite","Scudo","Maleficio"] },{ cat: "📋 Regole base", items: ["Grapple?","Copertura","Concentrazione","Tiri morte"] },{ cat: "⚔️ Combattimento", items: ["Attacchi di opportunità","Nascondersi","Due armi"] },{ cat: "💎 Oggetti", items: ["Pozione di Guarigione","Sacca Conservante"] }];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-zinc-700 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-blue-400">📖 Regole — {ruleset}</h2>
          {localRuleset && <Badge color="blue">{RULESETS.find(r=>r.id===localRuleset)?.short || localRuleset}</Badge>}
        </div>
        <div className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") doSearch(); }} placeholder="Cerca incantesimi, regole, oggetti..." className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 text-sm" />
          <Btn variant="player" onClick={() => doSearch()} disabled={loading || !query.trim()}>Cerca</Btn>
          {msgs.length > 0 && <Btn variant="secondary" onClick={() => setMsgs([])}>✕</Btn>}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-40 shrink-0 border-r border-zinc-700 overflow-y-auto bg-zinc-900/50 hidden sm:block">
          <div className="p-2">{QUICK_P.map(g => <div key={g.cat} className="mb-3"><p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">{g.cat}</p>{g.items.map(q => <button key={q} onClick={() => doSearch(q)} className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-700 hover:text-blue-400 transition-colors">{q}</button>)}</div>)}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {msgs.length === 0 && <div className="text-center py-8 text-zinc-400"><div className="text-4xl mb-3">📖</div><p>Cerca qualsiasi regola, incantesimo o oggetto.</p></div>}
          {msgs.map((m, i) => <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}><div className={"max-w-full rounded-xl px-3 py-2.5 " + (m.role === "user" ? "bg-blue-800/80 text-zinc-100 text-sm font-medium" : "bg-zinc-700")}>{m.role === "assistant" ? <MD text={m.content} /> : <span>{m.content}</span>}</div></div>)}
          {loading && <div className="flex justify-start"><div className="bg-zinc-700 rounded-xl px-3 py-2.5 text-zinc-400 text-sm animate-pulse">📖 Consultando...</div></div>}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 600); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return isMobile;
}

const PLAYER_TABS = [
  { id: "bacheca",       label: "Bacheca",      icon: "📋" },
  { id: "scheda",        label: "Scheda",        icon: "👤" },
  { id: "combattimento", label: "Combattimento", icon: "⚔️" },
  { id: "dadi",          label: "Dadi",          icon: "🎲" },
  { id: "note",          label: "Note",          icon: "📝" },
  { id: "recap",         label: "Recap",         icon: "📅" },
  { id: "regole",        label: "Regole",        icon: "📖" },
];

// ── CHANGE 3/5: PlayerSheet — localRuleset come prop, priorità su shk.campaign ──
function PlayerSheet({ playerName, shk, localRuleset }) {
  const isMobile = useIsMobile();
  const blankForm = {
    name: playerName, race: "", cls: "", level: "1",
    hp: "", maxHp: "", ac: "",
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    conditions: [], notes: "", homebrewNotes: "",
    abilities: "", traits: "", proficiencies: "",
    weapons: [], spells: [],
    slotMax: [...BLANK_SLOTS], slotUsed: [...BLANK_SLOTS],
    skillProf: {},
  };
  const [form, setForm] = useState(blankForm);
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sheetTab, setSheetTab] = useState("base");
  const [notesModal, setNotesModal] = useState(false);
  const [weaponModal, setWeaponModal] = useState(null);
  const [spellModal, setSpellModal] = useState(null);
  const [abilityModal, setAbilityModal] = useState(null);
  const [abilityModalEditing, setAbilityModalEditing] = useState(false);

  // 4d6 scarta il minimo, distribuisce per classe
  const calcHp = (cls, level, conScore) => {
    const c = (cls || "").toLowerCase();
    const hd =
      ["barbaro","barbarian"].some(x=>c.includes(x))                          ? 12 :
      ["guerriero","fighter","paladino","paladin","ranger"].some(x=>c.includes(x)) ? 10 :
      ["mago","wizard","stregone","sorcerer"].some(x=>c.includes(x))           ? 6  : 8;
    const avg = Math.floor(hd / 2) + 1; // media arrotondata per eccesso
    const conMod = Math.floor(((conScore || 10) - 10) / 2);
    const lvl = Math.max(1, parseInt(level) || 1);
    return hd + conMod + (lvl - 1) * (avg + conMod);
  };

  const rollStatsForClass = (cls) => {
    const c = (cls || "").toLowerCase();
    // priority[i] = indice in STATS_KEYS che riceve il risultato in posizione i (dal più alto)
    const priority =
      ["barbaro","barbarian"].some(x=>c.includes(x))        ? [0,2,1,4,5,3] :
      ["guerriero","fighter"].some(x=>c.includes(x))         ? [0,2,1,4,5,3] :
      ["paladino","paladin"].some(x=>c.includes(x))          ? [0,5,2,4,1,3] :
      ["ranger"].some(x=>c.includes(x))                      ? [1,4,2,0,5,3] :
      ["ladro","rogue"].some(x=>c.includes(x))               ? [1,5,2,3,4,0] :
      ["monaco","monk"].some(x=>c.includes(x))               ? [1,4,2,0,5,3] :
      ["mago","wizard"].some(x=>c.includes(x))               ? [3,2,1,4,5,0] :
      ["stregone","sorcerer"].some(x=>c.includes(x))         ? [5,2,1,3,4,0] :
      ["warlock"].some(x=>c.includes(x))                     ? [5,2,1,3,4,0] :
      ["bardo","bard"].some(x=>c.includes(x))                ? [5,1,2,3,4,0] :
      ["chierico","cleric"].some(x=>c.includes(x))           ? [4,2,0,5,1,3] :
      ["druido","druid"].some(x=>c.includes(x))              ? [4,2,1,5,0,3] :
      [0,1,2,3,4,5];
    const rolls = Array.from({length:6}, () => {
      const dice = Array.from({length:4}, () => Math.floor(Math.random()*6)+1).sort((a,b)=>a-b);
      return dice[1]+dice[2]+dice[3];
    }).sort((a,b)=>b-a);
    const stats = {};
    rolls.forEach((val, i) => { stats[STATS_KEYS[priority[i]]] = val; });
    return stats;
  };

  // Ruleset: localRuleset ha priorità; se assente, si legge dalla stanza
  const [rulesetLabel, setRulesetLabel] = useState(() => {
    if (localRuleset) { const f = RULESETS.find(r => r.id === localRuleset); return f ? f.label : "D&D 5e (2014)"; }
    return "D&D 5e (2014)";
  });
  const key = shk.pc(playerName);
  useEffect(() => {
    dbGet(key).then(d => { if (d) setForm(f => ({ ...blankForm, ...d })); setLoaded(true); });
    if (!localRuleset) {
      shGet(shk.campaign).then(c => {
        if (c?.ruleset) { const found = RULESETS.find(r => r.id === c.ruleset); if (found) setRulesetLabel(found.label); }
      });
    }
  }, []);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Autosalvataggio con debounce: 2s dopo l'ultima modifica
  const autoSaveTimer = useRef(null);
  const [autoSaved, setAutoSaved] = useState(false);
  useEffect(() => {
    if (!loaded) return; // non salvare il form vuoto iniziale
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await shSet(key, form);
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 1500);
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [form]);

  const [loaded, setLoaded] = useState(false);
  const save = async () => { await shSet(key, form); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const mod = v => { const m = Math.floor(((v || 10) - 10) / 2); return (m >= 0 ? "+" : "") + m; };
  const toggleCond = cd => setForm(f => ({ ...f, conditions: f.conditions?.includes(cd) ? f.conditions.filter(c => c !== cd) : [...(f.conditions || []), cd] }));
  const addWeapon = () => setForm(f => ({ ...f, weapons: [...(f.weapons || []), { id: uid(), name: "", damage: "", bonus: "", type: "" }] }));
  const updWeapon = (id, k, v) => setForm(f => ({ ...f, weapons: (f.weapons || []).map(w => w.id === id ? { ...w, [k]: v } : w) }));
  const removeWeapon = id => { setForm(f => ({ ...f, weapons: (f.weapons || []).filter(w => w.id !== id) })); if (weaponModal?.id === id) setWeaponModal(null); };
  const addSpell = () => { const s = { id: uid(), name: "", level: 0, school: "", desc: "" }; setForm(f => ({ ...f, spells: [...(f.spells || []), s] })); };
  const updSpell = (id, k, v) => setForm(f => ({ ...f, spells: (f.spells || []).map(s => s.id === id ? { ...s, [k]: v } : s) }));
  const removeSpell = id => { setForm(f => ({ ...f, spells: (f.spells || []).filter(s => s.id !== id) })); if (spellModal?.id === id) setSpellModal(null); };
  const updSpellModal = (k, v) => { updSpell(spellModal.id, k, v); setSpellModal(m => ({ ...m, [k]: v })); };
  const updWeaponModal = (k, v) => { updWeapon(weaponModal.id, k, v); setWeaponModal(m => ({ ...m, [k]: v })); };
  const showRestMsg = msg => { setForm(f => ({ ...f, _restMsg: msg })); setTimeout(() => setForm(f => ({ ...f, _restMsg: "" })), 4000); };
  const shortRest = () => {
    const hdMap = { mago:6,wizard:6,stregone:6,sorcerer:6,warlock:8,barbaro:12,barbarian:12,guerriero:10,fighter:10,paladino:10,paladin:10,ranger:10,bardo:8,bard:8,chierico:8,cleric:8,druido:8,druid:8,monaco:8,monk:8,ladro:8,rogue:8 };
    const clsLow = (form.cls || "").toLowerCase();
    const hd = Object.entries(hdMap).find(([k]) => clsLow.includes(k))?.[1] || 8;
    const conMod = Math.floor(((form.con || 10) - 10) / 2);
    const roll = Math.max(1, Math.floor(Math.random() * hd) + 1 + conMod);
    const newHp = Math.min(parseInt(form.maxHp || 0), parseInt(form.hp || 0) + roll);
    setForm(f => ({ ...f, hp: String(newHp) }));
    showRestMsg(`😴 Riposo Breve — 1d${hd}${conMod >= 0 ? "+" : ""}${conMod} = ${roll} HP → ${newHp}/${form.maxHp}`);
  };
  const longRest = () => { setForm(f => ({ ...f, hp: f.maxHp, slotUsed: [...BLANK_SLOTS], conditions: [] })); showRestMsg("🌙 Riposo Lungo — HP, slot e condizioni ripristinati!"); };
  const toggleSlot = (lvlIdx, bubbleIdx) => {
    setForm(f => {
      const nu = [...(f.slotUsed || [...BLANK_SLOTS])];
      nu[lvlIdx] = bubbleIdx < nu[lvlIdx] ? nu[lvlIdx] - 1 : nu[lvlIdx] + 1;
      nu[lvlIdx] = Math.max(0, Math.min((f.slotMax || BLANK_SLOTS)[lvlIdx], nu[lvlIdx]));
      return { ...f, slotUsed: nu };
    });
  };
  const safeJSON = (raw) => {
    let s = raw.replace(/```[\w]*\n?/gi, "").replace(/```/g, "").trim();
    const start = s.indexOf("{"), end = s.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no JSON");
    s = s.slice(start, end + 1);
    s = s.replace(/"((?:[^"\\]|\\.)*)"/g, (_, inner) => '"' + inner.replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, " ") + '"');
    return JSON.parse(s);
  };
  const generateWithAI = async () => {
    if (!form.race || !form.cls) { alert("Inserisci prima razza e classe!"); return; }
    setAiLoading(true);
    // Tiro 4d6-scarta-minimo, distribuito per classe — fatto qui, non delegato all'AI
    const rolledStats = rollStatsForClass(form.cls);
    const computedHp = calcHp(form.cls, form.level, rolledStats.con);
    const subject = `${form.race} ${form.cls} livello ${form.level || 1}`;
    const statsLine = STATS_KEYS.map(k => k.toUpperCase() + "=" + rolledStats[k]).join(", ");
    const homebrewCtx = form.homebrewNotes?.trim() ? `\nNOTE HOMEBREW/PERSONALIZZATE: ${form.homebrewNotes}` : "";
    const promptA = `Compila la scheda di un ${subject} seguendo le regole RAW di ${rulesetLabel}.${homebrewCtx}
Le caratteristiche sono già state tirate con il metodo 4d6-scarta-minimo: ${statsLine}. NON cambiarle, usale così.
Gli HP massimi sono già calcolati: ${computedHp}. NON cambiarli.
REGOLE OBBLIGATORIE:
- CA di base secondo le regole di ${rulesetLabel}.
- Slot incantesimo: usa la progressione ESATTA della classe al lv${form.level || 1} in ${rulesetLabel}.
- Armi: solo quelle con cui la classe ha competenza. I nomi delle armi DEVONO essere in italiano (es. "Spada lunga", "Pugnale", "Arco lungo", "Ascia da guerra", "Bastone"). Il campo "type" deve essere in italiano (es. "Tagliente", "Perforante", "Contundente").
- Gli incantesimi DEVONO avere nome e descrizione in italiano.
SOLO JSON valido:
{"str":${rolledStats.str},"dex":${rolledStats.dex},"con":${rolledStats.con},"int":${rolledStats.int},"wis":${rolledStats.wis},"cha":${rolledStats.cha},"maxHp":${computedHp},"ac":0,"slotMax":[0,0,0,0,0,0,0,0,0],"weapons":[{"name":"","damage":"","bonus":"","type":""}],"spells":[{"name":"","level":0,"school":"","desc":""}]}`;
    const promptB = `Elenca le capacità RAW di un ${subject} al lv${form.level || 1} secondo ${rulesetLabel}.${homebrewCtx}\nTraduzione SOLO in italiano.\nSOLO JSON:\n{"abilities":["Capacità in italiano"],"traits":["Tratto razziale in italiano"],"proficiencies":"Armature: ...; Armi: ...; Attrezzi: ...; Tiri salvezza: ..."}`;
    try {
      const [respA, respB] = await Promise.all([
        aiCall([{ role: "user", content: promptA }], `Sei un esperto di ${rulesetLabel}. Solo JSON puro.`, 1800),
        aiCall([{ role: "user", content: promptB }], `Sei un esperto di ${rulesetLabel}. Solo JSON puro.`, 1200),
      ]);
      const dA = safeJSON(respA);
      const parseTextArr = (val) => {
        if (!val) return "";
        if (Array.isArray(val)) return val.filter(Boolean).map(v => "- " + String(v).replace(/^[-•*]\s*/, "")).join("\n");
        return String(val).split("\n").filter(Boolean).map(v => "- " + v.replace(/^[-•*]\s*/, "")).join("\n");
      };
      let dB = {};
      try { dB = safeJSON(respB); } catch {}
      const newForm = {
        ...form,
        // stat già tirate localmente, non dall'AI
        str: rolledStats.str, dex: rolledStats.dex, con: rolledStats.con,
        int: rolledStats.int, wis: rolledStats.wis, cha: rolledStats.cha,
        // HP calcolati localmente, non dall'AI
        maxHp: String(computedHp),
        hp: String(computedHp),
        ac: dA.ac ? String(dA.ac) : form.ac,
        slotMax: getSpellSlots(form.cls, form.level),
        slotUsed: [...BLANK_SLOTS],
        abilities: dB.abilities ? parseTextArr(dB.abilities) : form.abilities,
        traits: dB.traits ? parseTextArr(dB.traits) : form.traits,
        proficiencies: dB.proficiencies ? formatProficiencies(String(dB.proficiencies)) : form.proficiencies,
        weapons: (dA.weapons || []).map(w => ({ id: uid(), ...w })),
        spells: (dA.spells || []).map(s => ({ id: uid(), ...s })),
      };
      setForm(newForm); await shSet(key, newForm);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { alert("Errore nella generazione AI. Riprova."); }
    setAiLoading(false);
  };
  const SHEET_TABS = [{ id: "base", label: "📋 Base" },{ id: "combat", label: "⚔️ Combat" },{ id: "skills", label: "🎯 Abilità" },{ id: "abilities", label: "⚡ Capacità" },{ id: "spells", label: "✨ Magie" }];
  const ABILITY_SECTIONS = [{ key: "abilities", label: "⚡ Capacità di Classe", empty: "Nessuna capacità." },{ key: "traits", label: "🧬 Tratti Razziali", empty: "Nessun tratto." },{ key: "proficiencies", label: "📋 Competenze", empty: "Nessuna competenza." }];
  const spellsByLevel = [0,1,2,3,4,5,6,7,8,9].map(l => ({ l, items: (form.spells||[]).filter(s => s.level === l) })).filter(g => g.items.length > 0);
  const hasAnySlot = (form.slotMax || BLANK_SLOTS).some(v => v > 0);
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {notesModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setNotesModal(false)}>
          <div className="bg-zinc-900 border border-blue-700/50 rounded-2xl max-w-lg w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-700 shrink-0"><h3 className="text-lg font-bold text-blue-300">📝 Note / Background</h3><button onClick={() => setNotesModal(false)} className="text-zinc-500 hover:text-zinc-200 text-xl">✕</button></div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1"><PTxta value={form.notes} onChange={v => upd("notes", v)} rows={14} placeholder="Background, inventario, obiettivi, appunti..." /><div className="flex justify-end"><Btn variant="player" size="sm" onClick={() => setNotesModal(false)}>✓ Chiudi</Btn></div></div>
          </div>
        </div>
      )}
      {spellModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSpellModal(null)}>
          <div className="bg-zinc-900 border border-purple-700/50 rounded-2xl max-w-md w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-zinc-700 shrink-0"><div><h3 className="text-xl font-bold text-purple-300">{spellModal.name || "Senza nome"}</h3><div className="flex gap-2 mt-1"><Badge color="purple">{spellModal.level === 0 ? "Trucchetto" : "Livello " + spellModal.level}</Badge>{spellModal.school && <Badge color="zinc">{spellModal.school}</Badge>}</div></div><button onClick={() => setSpellModal(null)} className="text-zinc-500 hover:text-zinc-200 text-xl ml-4">✕</button></div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              {spellModal.desc ? <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{spellModal.desc}</p> : <p className="text-zinc-500 text-sm italic">Nessuna descrizione.</p>}
              <div className="border-t border-zinc-700 pt-3 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">✏️ Modifica</p>
                <PInp value={spellModal.name} onChange={v => updSpellModal("name", v)} placeholder="Nome incantesimo" />
                <div className="flex gap-2"><select value={spellModal.level} onChange={e => updSpellModal("level", parseInt(e.target.value))} className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-2 text-zinc-200 text-sm focus:outline-none focus:border-blue-600"><option value={0}>Trucchetto</option>{[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>Lv.{l}</option>)}</select><PInp value={spellModal.school} onChange={v => updSpellModal("school", v)} placeholder="Scuola" /></div>
                <PTxta value={spellModal.desc} onChange={v => updSpellModal("desc", v)} rows={4} placeholder="Descrizione, gittata, componenti..." />
                <div className="flex gap-2 pt-1"><Btn variant="player" size="sm" onClick={() => setSpellModal(null)}>✓ Chiudi</Btn><Btn variant="danger" size="sm" onClick={() => removeSpell(spellModal.id)}>🗑️ Rimuovi</Btn></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {weaponModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setWeaponModal(null)}>
          <div className="bg-zinc-900 border border-red-700/50 rounded-2xl max-w-sm w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-700 shrink-0"><h3 className="text-lg font-bold text-red-300">{weaponModal.name || "Arma"}</h3><button onClick={() => setWeaponModal(null)} className="text-zinc-500 hover:text-zinc-200 text-xl">✕</button></div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 bg-zinc-800/60 rounded-xl p-3"><div className="text-center"><p className="text-xs text-zinc-500 mb-1">Danno</p><p className="text-xl font-bold text-red-400">{weaponModal.damage || "—"}</p></div><div className="text-center"><p className="text-xs text-zinc-500 mb-1">Bonus att.</p><p className="text-xl font-bold text-yellow-400">{weaponModal.bonus || "—"}</p></div></div>
              {weaponModal.type && <p className="text-zinc-400 text-sm text-center">{weaponModal.type}</p>}
              <div className="border-t border-zinc-700 pt-3 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">✏️ Modifica</p>
                <PInp value={weaponModal.name} onChange={v => updWeaponModal("name", v)} placeholder="Nome arma" />
                <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-zinc-500 mb-1 block">Danno</label><PInp value={weaponModal.damage} onChange={v => updWeaponModal("damage", v)} placeholder="1d8+3" /></div><div><label className="text-xs text-zinc-500 mb-1 block">Bonus</label><PInp value={weaponModal.bonus} onChange={v => updWeaponModal("bonus", v)} placeholder="+5" /></div><div><label className="text-xs text-zinc-500 mb-1 block">Tipo</label><PInp value={weaponModal.type} onChange={v => updWeaponModal("type", v)} placeholder="Tagl." /></div></div>
                <div className="flex gap-2 pt-1"><Btn variant="player" size="sm" onClick={() => setWeaponModal(null)}>✓ Chiudi</Btn><Btn variant="danger" size="sm" onClick={() => removeWeapon(weaponModal.id)}>🗑️ Rimuovi</Btn></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {abilityModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => { setAbilityModal(null); setAbilityModalEditing(false); }}>
          <div className="bg-zinc-900 border border-blue-700/50 rounded-2xl max-w-lg w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-700 shrink-0"><h3 className="text-lg font-bold text-blue-300">{ABILITY_SECTIONS.find(s => s.key === abilityModal)?.label}</h3><button onClick={() => { setAbilityModal(null); setAbilityModalEditing(false); }} className="text-zinc-500 hover:text-zinc-200 text-xl">✕</button></div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {!abilityModalEditing ? (
                <><div className="bg-zinc-800/60 rounded-xl p-4 min-h-20">{form[abilityModal]?.trim() ? <AbilitiesDisplay text={form[abilityModal]} /> : <p className="text-zinc-600 text-sm italic">Nessun contenuto.</p>}</div><div className="flex gap-2"><Btn variant="player" size="sm" onClick={() => setAbilityModalEditing(true)}>✏️ Modifica</Btn><Btn variant="secondary" size="sm" onClick={() => { setAbilityModal(null); setAbilityModalEditing(false); }}>Chiudi</Btn></div></>
              ) : (
                <><PTxta value={form[abilityModal]} onChange={v => upd(abilityModal, v)} rows={10} placeholder="Una voce per riga, usa - per i punti elenco..." /><div className="flex gap-2"><Btn variant="player" size="sm" onClick={() => setAbilityModalEditing(false)}>✓ Fatto</Btn><Btn variant="secondary" size="sm" onClick={() => { setAbilityModal(null); setAbilityModalEditing(false); }}>Chiudi</Btn></div></>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="p-3 border-b border-zinc-700 flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div><h2 className="text-lg font-bold text-blue-400">👤 La Mia Scheda</h2><p className="text-xs text-zinc-500">{rulesetLabel}</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          {form.race && form.cls && <button onClick={generateWithAI} disabled={aiLoading} className={"px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border " + (aiLoading ? "opacity-50 cursor-not-allowed border-purple-700/40 bg-purple-900/20 text-purple-300" : "border-purple-600/60 bg-purple-900/40 hover:bg-purple-800/60 text-purple-200")}>{aiLoading ? "✨ Generando..." : "✨ Compila con AI"}</button>}
          {autoSaved && <span className="text-zinc-500 text-xs">✓ salvato</span>}
          {saved && <span className="text-green-400 text-sm font-semibold">✅ Salvato!</span>}
          <Btn variant="player" onClick={save}>Salva</Btn>
        </div>
      </div>
      {!form.race && !form.cls && <div className="mx-3 mt-2 bg-purple-900/20 border border-purple-700/30 rounded-xl px-3 py-2 text-xs text-purple-300 shrink-0">💡 Inserisci razza e classe, poi premi <strong>✨ Compila con AI</strong>.</div>}
      <div className="flex border-b border-zinc-700 shrink-0 overflow-x-auto">{SHEET_TABS.map(t => <button key={t.id} onClick={() => setSheetTab(t.id)} className={"px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors " + (sheetTab === t.id ? "text-blue-400 border-b-2 border-blue-400" : "text-zinc-500 hover:text-zinc-300")}>{t.label}</button>)}</div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {sheetTab === "base" && <>
            <PCard><h3 className="text-blue-400 font-semibold text-sm mb-3">📋 Info Base</h3><div className={`grid gap-3 mb-3 ${isMobile ? "grid-cols-1" : "grid-cols-4"}`}><div className={isMobile ? "" : "col-span-2"}><label className="text-xs text-zinc-400 mb-1 block">Nome PG</label><PInp value={form.name} onChange={v => upd("name", v)} placeholder="Kael" /></div><div><label className="text-xs text-zinc-400 mb-1 block">Razza</label><PInp value={form.race} onChange={v => upd("race", v)} placeholder="Elfo" /></div><div><label className="text-xs text-zinc-400 mb-1 block">Livello</label><PInp value={form.level} onChange={v => upd("level", v)} placeholder="1" type="number" /></div></div><div><label className="text-xs text-zinc-400 mb-1 block">Classe</label><PInp value={form.cls} onChange={v => upd("cls", v)} placeholder="Ranger" /></div></PCard>
            <PCard><h3 className="text-blue-400 font-semibold text-sm mb-3">💪 Caratteristiche</h3><div className={`grid gap-2 ${isMobile ? "grid-cols-3" : "grid-cols-6"}`}>{STATS_KEYS.map((k, i) => <div key={k} className="bg-zinc-700/50 rounded-xl p-2 text-center border border-zinc-600"><p className="text-xs text-zinc-500 font-bold mb-1">{STATS_LABELS[i]}</p><p className="text-lg font-bold text-blue-300">{mod(form[k])}</p><input type="number" value={form[k]} onChange={e => upd(k, parseInt(e.target.value) || 10)} className="w-full text-center bg-transparent text-xs text-zinc-400 focus:outline-none" min="1" max="30" /></div>)}</div><p className="text-xs text-zinc-600 mt-2">💡 Premi <strong className="text-purple-400">✨ Compila con AI</strong> per tirare automaticamente le stat con il metodo 4d6 e compilare la scheda.</p></PCard>
            <PCard><div className="flex items-center justify-between mb-2"><h3 className="text-blue-400 font-semibold text-sm">📝 Note / Background</h3><Btn variant="pSecondary" size="sm" onClick={() => setNotesModal(true)}>↗ Espandi</Btn></div><PTxta value={form.notes} onChange={v => upd("notes", v)} rows={4} placeholder="Background, inventario, obiettivi, appunti..." /></PCard>
            <PCard><h3 className="text-blue-400 font-semibold text-sm mb-1">🧪 Note Homebrew / AI</h3><p className="text-zinc-500 text-xs mb-2">Descrivi razza o classe personalizzata.</p><PTxta value={form.homebrewNotes} onChange={v => upd("homebrewNotes", v)} rows={2} placeholder="Es: razza Draconico con +2 FOR e immunità al fuoco..." /></PCard>
          </>}
          {sheetTab === "combat" && <>
            {aiLoading && <div className="bg-purple-900/30 border border-purple-700/40 rounded-xl p-4 text-center text-purple-300 text-sm animate-pulse">✨ Generando con AI...</div>}
            <PCard><h3 className="text-blue-400 font-semibold text-sm mb-3">❤️ Punti Ferita & Difesa</h3><div className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}><div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-center"><p className="text-xs text-zinc-500 mb-1">HP Attuali</p><div className="flex items-center justify-center gap-2"><button onClick={() => upd("hp", Math.max(0, parseInt(form.hp || 0) - 1))} className="w-7 h-7 rounded-full bg-red-800/50 text-red-300 font-bold hover:bg-red-700/70">−</button><input type="number" value={form.hp} onChange={e => upd("hp", e.target.value)} className="w-14 text-center bg-transparent text-2xl font-bold text-red-400 focus:outline-none" /><button onClick={() => upd("hp", Math.min(parseInt(form.maxHp || 999), parseInt(form.hp || 0) + 1))} className="w-7 h-7 rounded-full bg-green-800/50 text-green-300 font-bold hover:bg-green-700/70">+</button></div>{form.maxHp && <div className="h-1.5 bg-zinc-600 rounded-full mt-2 overflow-hidden"><div className="h-full bg-red-500 transition-all" style={{ width: Math.min(100, (parseInt(form.hp || 0) / parseInt(form.maxHp)) * 100) + "%" }} /></div>}</div><div className="bg-zinc-700/40 border border-zinc-600 rounded-xl p-3 text-center"><p className="text-xs text-zinc-500 mb-1">HP Max</p><PInp value={form.maxHp} onChange={v => upd("maxHp", v)} placeholder="40" type="number" className="text-center text-xl font-bold" /></div><div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 text-center"><p className="text-xs text-zinc-500 mb-1">CA</p><PInp value={form.ac} onChange={v => upd("ac", v)} placeholder="15" type="number" className="text-center text-xl font-bold text-blue-400" /></div></div></PCard>
            <PCard>
              <div className="flex items-center justify-between mb-2"><h3 className="text-blue-400 font-semibold text-sm">✨ Slot Incantesimo</h3><div className="flex gap-1.5"><button onClick={shortRest} className="text-xs px-2.5 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border border-zinc-600 transition-colors">😴 Riposo Breve</button><button onClick={longRest} className="text-xs px-2.5 py-1 rounded-lg bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 border border-blue-700/50 transition-colors">🌙 Riposo Lungo</button></div></div>
              {form._restMsg && <div className="mb-2 bg-green-900/30 border border-green-700/40 rounded-lg px-3 py-1.5 text-green-300 text-xs">{form._restMsg}</div>}
              {hasAnySlot ? (
                <div className="space-y-1.5 mb-3">{(form.slotMax || BLANK_SLOTS).map((max, i) => { if (!max) return null; const used = (form.slotUsed || BLANK_SLOTS)[i] || 0; return (<div key={i} className="flex items-center gap-2"><span className="text-xs text-zinc-500 w-8 shrink-0 font-mono">Lv.{i+1}</span><div className="flex gap-1 flex-1">{Array.from({length:max},(_,j) => <button key={j} onClick={() => toggleSlot(i,j)} className={"w-4 h-4 rounded-full border-2 transition-all "+(j<used?"bg-purple-600 border-purple-500 hover:bg-purple-700":"bg-zinc-700 border-zinc-500 hover:border-purple-400")} />)}</div><span className="text-xs text-zinc-500 shrink-0 w-10 text-right font-mono">{max-used}/{max}</span></div>); })}
                </div>
              ) : <p className="text-zinc-600 text-xs italic mb-3">Nessuno slot configurato.</p>}
              <details className="group"><summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none list-none flex items-center gap-1"><span className="group-open:rotate-90 transition-transform inline-block">▶</span>⚙️ Configura slot manualmente</summary><div className="mt-2 pt-2 border-t border-zinc-700"><p className="text-xs text-zinc-600 mb-2">Max slot per livello (1–9):</p><div className="grid grid-cols-9 gap-1">{Array.from({length:9},(_,i) => <div key={i} className="text-center"><p className="text-xs text-zinc-600 mb-0.5">{i+1}</p><input type="number" min="0" max="9" value={(form.slotMax||BLANK_SLOTS)[i]||0} onChange={e=>{const nm=[...(form.slotMax||[...BLANK_SLOTS])];nm[i]=Math.max(0,Math.min(9,parseInt(e.target.value)||0));upd("slotMax",nm);}} className="w-full text-center bg-zinc-700 border border-zinc-600 rounded text-xs text-zinc-200 py-0.5 focus:outline-none focus:border-blue-600" /></div>)}</div></div></details>
            </PCard>
            <PCard><h3 className="text-blue-400 font-semibold text-sm mb-3">🩹 Condizioni</h3><div className="flex flex-wrap gap-1.5">{CONDITIONS.map(cd => <button key={cd} onClick={() => toggleCond(cd)} className={"text-xs px-2.5 py-1 rounded-full border transition-colors "+(form.conditions?.includes(cd)?"bg-red-700/40 border-red-600/50 text-red-300":"border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:text-zinc-300")}>{cd}</button>)}</div></PCard>
            <PCard><div className="flex items-center justify-between mb-3"><h3 className="text-blue-400 font-semibold text-sm">⚔️ Armi & Attacchi</h3><div className="flex gap-2">{form.cls && <button onClick={generateWithAI} disabled={aiLoading} className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40">✨ Genera</button>}<Btn variant="pSecondary" size="sm" onClick={addWeapon}>+ Aggiungi</Btn></div></div>{(form.weapons||[]).length===0&&!aiLoading&&<div className="text-center py-6 text-zinc-500 text-sm"><div className="text-3xl mb-2">⚔️</div><p>Nessuna arma.</p></div>}<div className="space-y-2">{(form.weapons||[]).map(w=><button key={w.id} onClick={()=>setWeaponModal({...w})} className="w-full text-left bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 hover:border-red-600/50 rounded-xl px-4 py-2.5 transition-all"><div className="flex items-center gap-3"><span className="font-semibold text-zinc-200 flex-1">{w.name||"Senza nome"}</span>{w.damage&&<Badge color="red">{w.damage}</Badge>}{w.bonus&&<Badge color="gold">{w.bonus}</Badge>}{w.type&&<span className="text-zinc-500 text-xs">{w.type}</span>}<span className="text-zinc-600 text-xs">→</span></div></button>)}</div></PCard>
          </>}
          {sheetTab === "skills" && (() => {
            const lvl = parseInt(form.level) || 1;
            const profBonus = Math.floor((lvl - 1) / 4) + 2;
            const STAT_LABELS_MAP = { str:"FOR", dex:"DES", con:"COS", int:"INT", wis:"SAG", cha:"CAR" };
            const cycleProf = key => { const cur = form.skillProf?.[key] || 0; upd("skillProf", { ...form.skillProf, [key]: (cur + 1) % 3 }); };
            const PROF_STYLES = [{ label: "—", cls: "bg-zinc-700 border-zinc-500 text-zinc-500" },{ label: "◆", cls: "bg-blue-700 border-blue-500 text-white" },{ label: "◆◆", cls: "bg-yellow-500 border-yellow-400 text-zinc-900 text-xs" }];
            const percProf = form.skillProf?.["perception"] || 0;
            const percMod = Math.floor(((form.wis || 10) - 10) / 2);
            const passivePerc = 10 + percMod + (percProf >= 1 ? profBonus * percProf : 0);
            return (
              <div className="space-y-4">
                <PCard><div className="flex items-center justify-between flex-wrap gap-3"><div className="text-center"><p className="text-xs text-zinc-500 mb-1">Bonus Competenza</p><p className="text-2xl font-bold text-blue-300">+{profBonus}</p><p className="text-xs text-zinc-600">Lv. {lvl}</p></div><div className="text-center"><p className="text-xs text-zinc-500 mb-1">Percezione Passiva</p><p className="text-2xl font-bold text-yellow-400">{passivePerc}</p><p className="text-xs text-zinc-600">10 + Percezione</p></div><div className="text-xs text-zinc-500 text-right leading-relaxed"><p>◆ = Competenza (+{profBonus})</p><p className="text-yellow-500">◆◆ = Expertise (+{profBonus * 2})</p><p className="mt-1 text-zinc-600">Tocca per ciclare</p></div></div></PCard>
                <PCard><div className="space-y-1">{SKILLS.map(sk => { const statMod = Math.floor(((form[sk.stat] || 10) - 10) / 2); const prof = form.skillProf?.[sk.key] || 0; const total = statMod + (prof >= 1 ? profBonus * prof : 0); const ps = PROF_STYLES[prof]; return (<div key={sk.key} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-700/40 transition-colors"><button onClick={() => cycleProf(sk.key)} className={"w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold transition-all text-xs shrink-0 " + ps.cls}>{ps.label}</button><span className="flex-1 text-sm text-zinc-200">{sk.label}</span><Badge color="zinc">{STAT_LABELS_MAP[sk.stat]}</Badge><span className={"w-10 text-right font-bold text-sm " + (total >= 0 ? "text-blue-300" : "text-red-400")}>{total >= 0 ? "+" : ""}{total}</span></div>); })}</div></PCard>
              </div>
            );
          })()}
          {sheetTab === "abilities" && (
            <div className="space-y-3">
              {aiLoading && <div className="bg-purple-900/30 border border-purple-700/40 rounded-xl p-4 text-center text-purple-300 text-sm animate-pulse">✨ Generando con AI...</div>}
              <div className="flex justify-end">{form.cls && <button onClick={generateWithAI} disabled={aiLoading} className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40">✨ Genera tutto con AI</button>}</div>
              {ABILITY_SECTIONS.map(sec => <button key={sec.key} onClick={() => { setAbilityModal(sec.key); setAbilityModalEditing(false); }} className="w-full text-left bg-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-blue-600/50 hover:bg-zinc-800/80 transition-all"><div className="flex items-center justify-between mb-3"><h3 className="text-blue-400 font-semibold text-sm">{sec.label}</h3><span className="text-xs text-zinc-500 bg-zinc-700/60 px-2 py-0.5 rounded-full">leggi →</span></div>{form[sec.key]?.trim() ? <div className="max-h-28 overflow-hidden relative pointer-events-none"><AbilitiesDisplay text={form[sec.key]} /><div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-zinc-800 to-transparent" /></div> : <p className="text-zinc-600 text-xs italic">{sec.empty}</p>}</button>)}
            </div>
          )}
          {sheetTab === "spells" && (
            <PCard>
              <div className="flex items-center justify-between mb-3"><h3 className="text-blue-400 font-semibold text-sm">✨ Incantesimi</h3><div className="flex gap-2">{form.cls && <button onClick={generateWithAI} disabled={aiLoading} className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40">✨ Genera con AI</button>}<Btn variant="pSecondary" size="sm" onClick={addSpell}>+ Aggiungi</Btn></div></div>
              {aiLoading && <div className="text-center py-4 text-purple-300 text-sm animate-pulse">✨ Generando...</div>}
              {(form.spells||[]).length===0&&!aiLoading&&<div className="text-center py-8 text-zinc-500 text-sm"><div className="text-3xl mb-2">✨</div><p>Nessun incantesimo.</p></div>}
              {spellsByLevel.map(({l,items})=><div key={l} className="mb-4"><p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{l===0?"Trucchetti":"Livello "+l}</p><div className="grid grid-cols-2 gap-2">{items.map(s=><button key={s.id} onClick={()=>setSpellModal({...s})} className="text-left bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 hover:border-purple-600/50 rounded-xl p-3 transition-all"><div className="flex items-center justify-between mb-1"><span className="font-semibold text-purple-300 text-sm truncate">{s.name||"Senza nome"}</span><span className="text-zinc-600 text-xs shrink-0 ml-1">→</span></div>{s.school&&<p className="text-zinc-500 text-xs">{s.school}</p>}{s.desc&&<p className="text-zinc-400 text-xs mt-0.5 line-clamp-1">{s.desc}</p>}</button>)}</div></div>)}
            </PCard>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CHANGE 4/5: PlayerNotesTab ────────────────────────────────────────────────
function PlayerNotesTab({ playerName, roomCode }) {
  const storageKey = roomCode + "_pnotes_" + playerName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [tag, setTag] = useState("generale");
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editTag, setEditTag] = useState("generale");
  const [viewingNote, setViewingNote] = useState(null);
  const textareaRef = useRef(null);
  useEffect(() => { dbGet(storageKey).then(d => { if (d) setNotes(d); setLoaded(true); }); }, []);
  const persist = d => { setNotes(d); dbSet(storageKey, d); };
  const addNote = () => { if (!text.trim()) return; persist([{ id: uid(), text: text.trim(), tag, createdAt: new Date().toISOString(), pinned: false }, ...notes]); setText(""); textareaRef.current?.focus(); };
  const deleteNote = id => persist(notes.filter(n => n.id !== id));
  const togglePin  = id => persist(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const startEdit  = n  => { setEditingId(n.id); setEditText(n.text); setEditTag(n.tag || "generale"); };
  const saveEdit   = id => { persist(notes.map(n => n.id === id ? { ...n, text: editText, tag: editTag } : n)); setEditingId(null); };
  const cancelEdit = ()  => setEditingId(null);
  const fmtDate = iso => { const d = new Date(iso); return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }); };
  const filtered = notes.filter(n => { const matchSearch = !search || n.text.toLowerCase().includes(search.toLowerCase()); const matchTag = filterTag === "all" || n.tag === filterTag; return matchSearch && matchTag; });
  const pinned = filtered.filter(n => n.pinned);
  const rest   = filtered.filter(n => !n.pinned);
  const usedTags = [...new Set(notes.map(n => n.tag).filter(Boolean))];
  const NoteCard = ({ n }) => {
    const tagDef = NOTE_TAGS.find(t => t.id === n.tag) || NOTE_TAGS[0];
    const isEditing = editingId === n.id;
    return (
      <div className={"rounded-xl border transition-all " + (n.pinned ? "bg-zinc-800 border-blue-600/40" : "bg-zinc-800 border-zinc-700")}>
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">{n.pinned && <span className="text-blue-400 text-xs">📌</span>}<Badge color={tagDef.color}>{tagDef.label}</Badge><span className="text-zinc-600 text-xs">{fmtDate(n.createdAt)}</span></div>
          <div className="flex gap-0.5 shrink-0">
            <button onClick={() => togglePin(n.id)} className={"w-6 h-6 rounded hover:bg-zinc-700 flex items-center justify-center text-xs transition-colors " + (n.pinned ? "text-blue-400" : "text-zinc-600 hover:text-blue-400")}>📌</button>
            <button onClick={() => startEdit(n)} className="w-6 h-6 rounded hover:bg-zinc-700 flex items-center justify-center text-xs text-zinc-600 hover:text-zinc-300 transition-colors">✏️</button>
            <button onClick={() => deleteNote(n.id)} className="w-6 h-6 rounded hover:bg-zinc-700 flex items-center justify-center text-xs text-zinc-600 hover:text-red-400 transition-colors">🗑️</button>
          </div>
        </div>
        {isEditing ? (
          <div className="px-4 pb-4 space-y-2"><div className="flex gap-1.5 flex-wrap mb-1">{NOTE_TAGS.map(t => <button key={t.id} onClick={() => setEditTag(t.id)} className={"px-2 py-0.5 rounded-md text-xs border transition-colors " + (editTag === t.id ? "border-blue-600 bg-blue-800/30 text-zinc-100 font-semibold" : "border-zinc-600 text-zinc-500 hover:border-zinc-400")}>{t.label}</button>)}</div><PTxta value={editText} onChange={setEditText} rows={4} /><div className="flex gap-2"><Btn variant="player" size="sm" onClick={() => saveEdit(n.id)} disabled={!editText.trim()}>Salva</Btn><Btn size="sm" variant="secondary" onClick={cancelEdit}>Annulla</Btn></div></div>
        ) : (
          <button onClick={() => setViewingNote(n)} className="w-full text-left px-4 pb-4 block hover:bg-zinc-700/30 rounded-b-xl transition-colors"><div className="line-clamp-4 pointer-events-none"><MD text={n.text} /></div>{(n.text.split("\n").length > 4 || n.text.length > 300) && <p className="text-xs text-zinc-600 mt-1.5">leggi tutto →</p>}</button>
        )}
      </div>
    );
  };
  if (!loaded) return <div className="flex items-center justify-center h-full text-blue-400 animate-pulse">Caricamento...</div>;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {viewingNote && (() => { const tagDef = NOTE_TAGS.find(t => t.id === viewingNote.tag) || NOTE_TAGS[0]; return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingNote(null)}>
          <div className="bg-zinc-900 border border-blue-700/50 rounded-2xl max-w-2xl w-full flex flex-col" style={{maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-700 shrink-0"><div className="flex items-center gap-2 flex-wrap">{viewingNote.pinned && <span className="text-blue-400">📌</span>}<Badge color={tagDef.color}>{tagDef.label}</Badge><span className="text-zinc-500 text-xs">{fmtDate(viewingNote.createdAt)}</span></div><button onClick={() => setViewingNote(null)} className="text-zinc-500 hover:text-zinc-200 text-xl leading-none ml-4">✕</button></div>
            <div className="p-5 overflow-y-auto flex-1"><MD text={viewingNote.text} /></div>
            <div className="px-5 pb-4 flex gap-2 border-t border-zinc-700 pt-3 shrink-0"><Btn variant="player" size="sm" onClick={() => { startEdit(viewingNote); setViewingNote(null); }}>✏️ Modifica</Btn><Btn size="sm" variant="pSecondary" onClick={() => { togglePin(viewingNote.id); setViewingNote(n => n ? { ...n, pinned: !n.pinned } : null); }}>{viewingNote.pinned ? "📌 Rimuovi pin" : "📌 Fissa"}</Btn><Btn size="sm" variant="danger" onClick={() => { deleteNote(viewingNote.id); setViewingNote(null); }} className="ml-auto">🗑️ Elimina</Btn></div>
          </div>
        </div>
      ); })()}
      <div className="p-4 border-b border-zinc-700 shrink-0 bg-zinc-900/40">
        <div className="flex items-center justify-between mb-3"><h2 className="text-xl font-bold text-blue-400">📝 Le Mie Note</h2><span className="text-xs text-zinc-500">{notes.length} nota{notes.length !== 1 ? "e" : ""} · solo tue</span></div>
        <div className="flex gap-1.5 mb-2.5 flex-wrap">{NOTE_TAGS.map(t => <button key={t.id} onClick={() => setTag(t.id)} className={"px-2.5 py-1 rounded-lg text-xs border transition-colors " + (tag === t.id ? "border-blue-600 bg-blue-800/30 text-zinc-100 font-semibold" : "border-zinc-700 text-zinc-400 hover:border-zinc-500")}>{t.label}</button>)}</div>
        <div className="flex gap-2"><textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); addNote(); } }} placeholder="Aggiungi una nota... (Ctrl+Invio per salvare)" rows={2} className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 resize-none text-sm" /><Btn variant="player" onClick={addNote} disabled={!text.trim()} className="self-end">+ Aggiungi</Btn></div>
      </div>
      <div className="px-4 pt-3 pb-2 border-b border-zinc-700/50 shrink-0 flex gap-2 items-center flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cerca..." className="flex-1 min-w-32 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 text-sm" />
        <div className="flex gap-1 flex-wrap"><button onClick={() => setFilterTag("all")} className={"px-2.5 py-1 rounded-lg text-xs border transition-colors " + (filterTag === "all" ? "border-zinc-500 bg-zinc-600 text-zinc-100 font-semibold" : "border-zinc-700 text-zinc-500 hover:border-zinc-500")}>Tutte</button>{usedTags.map(tid => { const t = NOTE_TAGS.find(x => x.id === tid); if (!t) return null; return <button key={tid} onClick={() => setFilterTag(tid)} className={"px-2.5 py-1 rounded-lg text-xs border transition-colors " + (filterTag === tid ? "border-blue-600 bg-blue-800/30 text-zinc-100 font-semibold" : "border-zinc-700 text-zinc-500 hover:border-zinc-500")}>{t.label}</button>; })}</div>
        {(search || filterTag !== "all") && <button onClick={() => { setSearch(""); setFilterTag("all"); }} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">✕ Pulisci</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {notes.length === 0 && <div className="text-center py-16 text-zinc-500"><div className="text-5xl mb-3">📝</div><p className="font-medium">Nessuna nota ancora.</p><p className="text-xs mt-1 text-zinc-600">Solo tu puoi vedere queste note — il Master non le vede.</p></div>}
        {filtered.length === 0 && notes.length > 0 && <p className="text-zinc-500 text-sm text-center py-8">Nessun risultato.</p>}
        {pinned.length > 0 && <div className="space-y-2"><p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">📌 Fissate ({pinned.length})</p>{pinned.map(n => <NoteCard key={n.id} n={n} />)}{rest.length > 0 && <div className="border-t border-zinc-700/50 pt-2 mt-3"><p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-2">Tutte ({rest.length})</p></div>}</div>}
        {rest.map(n => <NoteCard key={n.id} n={n} />)}
      </div>
    </div>
  );
}

// ── CHANGE 5/5: PlayerApp — riceve localRuleset e lo passa ai figli ───────────
function PlayerApp({ playerName, roomCode, localRuleset, onChangeRole }) {
  const isSolo = roomCode === "SOLO";
  const [tab, setTab] = useState(isSolo ? "scheda" : "bacheca");
  const [sheetKey, setSheetKey] = useState(0);
  const isMobile = useIsMobile();
  // Per modalità solo, usiamo una stanza virtuale basata sul nome per la storage key
  const effectiveRoom = isSolo ? ("SOLO_" + playerName.toLowerCase().replace(/[^a-z0-9]/g, "_")) : roomCode;
  const shk = mkSHK(effectiveRoom);
  const fileInputRef = useRef(null);
  const downloadCharBackup = async () => {
    const charData = await shGet(shk.pc(playerName));
    if (!charData) { alert("Nessuna scheda da scaricare. Compila prima la scheda!"); return; }
    const content = JSON.stringify({ character: charData, playerName, roomCode, localRuleset, exportedAt: new Date().toISOString(), version: 1 }, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "personaggio-" + (playerName || "pg").replace(/\s+/g, "-") + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const restoreCharBackup = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const charData = data.character || data;
        if (!charData || typeof charData !== "object") throw new Error("Formato non valido");
        await shSet(shk.pc(playerName), charData);
        setSheetKey(k => k + 1); setTab("scheda");
        alert("✅ Scheda ripristinata con successo!");
      } catch { alert("❌ File non valido o danneggiato."); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  // In modalità solo mostriamo tab ridotti
  const visibleTabs = isSolo
    ? PLAYER_TABS.filter(t => ["scheda","dadi","note","regole"].includes(t.id))
    : PLAYER_TABS;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 overflow-hidden" style={{ flexDirection: isMobile ? "column" : "row" }}>
      {isMobile && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-bold text-sm">🎮 Lo Scudiero</span>
              {!isSolo && <span className="text-xs text-yellow-500 font-mono font-bold bg-zinc-800 px-1.5 py-0.5 rounded">{roomCode}</span>}
              {isSolo && <Badge color="purple">Solo</Badge>}
            </div>
            <p className="text-zinc-400 text-xs truncate max-w-[180px]">{playerName}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={downloadCharBackup} className="p-2 rounded-lg text-zinc-500 hover:text-blue-400 transition-colors">📥</button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-zinc-500 hover:text-blue-400 transition-colors">📂</button>
            <button onClick={onChangeRole} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">🔄</button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={restoreCharBackup} className="hidden" />
          </div>
        </div>
      )}
      {!isMobile && (
        <div className="flex flex-col w-44 bg-zinc-900 border-r border-zinc-800 shrink-0">
          <div className="p-3 border-b border-zinc-800">
            <h1 className="text-blue-400 font-bold text-base">🎮 Lo Scudiero</h1>
            <p className="text-zinc-400 text-xs mt-0.5 truncate">{playerName}</p>
            {isSolo
              ? <div className="mt-1"><Badge color="purple">Modalità Solo</Badge></div>
              : <div className="flex items-center gap-1 mt-1"><span className="text-xs text-zinc-600">Stanza:</span><span className="text-xs text-yellow-500 font-mono font-bold">{roomCode}</span></div>
            }
            {localRuleset && <div className="mt-1"><Badge color="blue">{RULESETS.find(r=>r.id===localRuleset)?.short || localRuleset}</Badge></div>}
          </div>
          <nav className="flex-1 p-2 overflow-y-auto">
            {visibleTabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={"w-full text-left px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors flex items-center gap-2 " + (tab === t.id ? "bg-blue-800 text-zinc-100 font-semibold" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")}><span className="text-base leading-none">{t.icon}</span><span>{t.label}</span></button>)}
            {isSolo && (
              <div className="mt-3 px-2 py-2 bg-blue-900/20 border border-blue-700/30 rounded-xl">
                <p className="text-xs text-blue-300 font-semibold mb-1">🔗 Hai il codice?</p>
                <p className="text-xs text-zinc-500">Torna alla home e usa "Entra nella Stanza" per collegarti al Master.</p>
              </div>
            )}
          </nav>
          <div className="p-2 border-t border-zinc-800 space-y-0.5">
            <button onClick={downloadCharBackup} className="block w-full text-left text-xs text-zinc-500 hover:text-blue-400 py-1 px-1 rounded transition-colors">📥 Backup scheda</button>
            <button onClick={() => fileInputRef.current?.click()} className="w-full text-left text-xs text-zinc-500 hover:text-blue-400 py-1 px-1 rounded transition-colors">📂 Carica scheda</button>
            <button onClick={onChangeRole} className="w-full text-left text-xs text-zinc-600 hover:text-zinc-400 py-1 px-1 rounded transition-colors">🔄 Cambia stanza</button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={restoreCharBackup} className="hidden" />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          {tab === "bacheca"       && !isSolo && <PlayerBacheca shk={shk} />}
          {tab === "scheda"        && <PlayerSheet key={sheetKey} playerName={playerName} shk={shk} localRuleset={localRuleset} />}
          {tab === "combattimento" && !isSolo && <LiveCombat shk={shk} />}
          {tab === "dadi"          && <DiceRoller />}
          {tab === "note"          && <PlayerNotesTab playerName={playerName} roomCode={effectiveRoom} />}
          {tab === "recap"         && !isSolo && <PlayerRecap shk={shk} />}
          {tab === "regole"        && <PlayerRules shk={shk} localRuleset={localRuleset} />}
        </div>
        {isMobile && (
          <div className="flex border-t border-zinc-800 bg-zinc-900 shrink-0">
            {visibleTabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={"flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors " + (tab === t.id ? "text-blue-400 font-semibold" : "text-zinc-500")}>
                <span className="text-lg leading-none">{t.icon}</span>
                <span className="truncate max-w-full px-0.5">{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IlDemiurgo({ roomCode, onChangeRole }) {
  const shk = mkSHK(roomCode);
  const [tab, setTab] = useState("hub");
  const [campaign, setCampaign] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [plots, setPlots] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [savedMonsters, setSavedMonsters] = useState([]);
  const [combatState, setCombatState] = useState({ combatants: [], turn: 0, round: 1 });
  const [loaded, setLoaded] = useState(false);
  const [showReset, setShowReset] = useState(false); const [resetStep, setResetStep] = useState(1);
  const fileInputRef = useRef(null);
  const NS = roomCode + "_";
  useEffect(() => {
    Promise.allSettled([shGet(NS+"camp"), shGet(NS+"chars"), shGet(NS+"plots"), shGet(NS+"sess"), shGet(NS+"notes"), shGet(NS+"monsters"), shGet(NS+"combat")])
      .then(([c,ch,p,s,n,m,cs]) => {
        if (c.value) setCampaign(c.value);
        if (ch.value) setCharacters(ch.value);
        if (p.value) setPlots(p.value);
        if (s.value) setSessions(s.value);
        if (n.value) setNotes(n.value);
        if (m.value) setSavedMonsters(m.value);
        if (cs.value) setCombatState(cs.value);
        setLoaded(true);
      });
  }, []);
  const saveCampaign = d => { setCampaign(d); shSet(NS+"camp", d); };
  const saveChars    = d => { setCharacters(d); shSet(NS+"chars", d); };
  const savePlots    = d => { setPlots(d); shSet(NS+"plots", d); shSet(shk.plots, d.filter(p => p.sharedWithPlayers)); };
  const saveSessions = d => { setSessions(d); shSet(NS+"sess", d); };
  const saveNotes    = d => { setNotes(d); shSet(NS+"notes", d); };
  const saveMonsters = d => { setSavedMonsters(d); shSet(NS+"monsters", d); };
  const saveCombatState = d => { setCombatState(d); shSet(NS+"combat", d); };
  const handleWizardComplete = ({ campaign: c, characters: ch, plots: p }) => { saveCampaign(c); saveChars(ch); savePlots(p); setTab("hub"); };
  const downloadBackup = () => {
    const content = JSON.stringify({ campaign, characters, plots, sessions, notes, savedMonsters, combatState, roomCode, exportedAt: new Date().toISOString(), version: 12 }, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "demiurgo-backup-" + ((campaign?.name || "campagna").replace(/\s+/g, "-")) + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const restoreBackup = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.campaign) { data.campaign.locations = data.campaign.locations || []; saveCampaign(data.campaign); }
        if (Array.isArray(data.characters)) saveChars(data.characters.map(c => ({ ...c, role: c.role || (c.notes?.includes("ANTAGONISTA") ? "nemico" : c.type === "pg" ? "" : "ally"), hp: c.hp || "", maxHp: c.maxHp || "", ac: c.ac || "" })));
        if (Array.isArray(data.plots)) savePlots(data.plots);
        if (Array.isArray(data.sessions)) saveSessions(data.sessions);
        if (Array.isArray(data.notes)) saveNotes(data.notes);
        if (Array.isArray(data.savedMonsters)) saveMonsters(data.savedMonsters);
        if (data.combatState) saveCombatState(data.combatState);
        setTab("hub");
      } catch { alert("File non valido."); }
    };
    reader.readAsText(file); e.target.value = "";
  };
  const handleResetConfirm = () => {
    setShowReset(false);
    saveCampaign(null); saveChars([]); savePlots([]); saveSessions([]); saveNotes([]);
    saveMonsters([]); saveCombatState({ combatants: [], turn: 0, round: 1 });
  };
  if (!loaded) return <div className="flex items-center justify-center h-screen bg-zinc-950 text-yellow-400">⏳ Caricamento...</div>;
  if (!campaign) return <div className="h-screen bg-zinc-950 text-zinc-200"><Wizard onComplete={handleWizardComplete} onRestore={restoreBackup} /></div>;
  const isHomebrew = campaign.ruleset === "homebrew";
  const visibleTabs = DM_TABS.filter(t => !(t.id === "rules" && isHomebrew));
  const handleSaveNoteFromStory = text => saveNotes([{ id: uid(), text, tag: "generale", createdAt: new Date().toISOString(), pinned: false }, ...notes]);
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 overflow-hidden">
      {showReset && resetStep === 1 && <ConfirmModal message="Prima di cancellare, vuoi fare un backup?" extra={<button onClick={downloadBackup} className="w-full text-left px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-yellow-400 text-sm border border-zinc-700 transition-colors mt-1">📥 Scarica Backup JSON</button>} onConfirm={() => setResetStep(2)} onCancel={() => setShowReset(false)} />}
      {showReset && resetStep === 2 && <ConfirmModal message="Sei sicuro di voler cancellare tutti i dati?" onConfirm={handleResetConfirm} onCancel={() => setShowReset(false)} />}
      <div className="w-44 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-zinc-800"><h1 className="text-yellow-400 font-bold text-base">🎲 Il Demiurgo</h1><p className="text-zinc-400 text-xs mt-0.5 truncate">{campaign.name}</p><p className="text-zinc-600 text-xs">Master</p><div className="flex items-center gap-1 mt-1"><span className="text-xs text-zinc-600">Stanza:</span><span className="text-xs text-yellow-500 font-mono font-bold">{roomCode}</span></div></div>
        <nav className="flex-1 p-2 overflow-y-auto">{visibleTabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={"w-full text-left px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors flex items-center gap-2 " + (tab === t.id ? (t.id === "share" ? "bg-blue-800 text-zinc-100 font-semibold" : t.id === "notes" ? "bg-amber-800/70 text-zinc-100 font-semibold" : "bg-red-800 text-zinc-100 font-semibold") : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")}><span className="text-base leading-none">{t.icon}</span><span>{t.label}</span>{t.id === "notes" && notes.length > 0 && <span className="ml-auto text-xs bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-full">{notes.length}</span>}</button>)}</nav>
        <div className="p-2 border-t border-zinc-800 space-y-0.5">
          <button onClick={downloadBackup} className="block w-full text-left text-xs text-zinc-500 hover:text-yellow-400 py-1 px-1 rounded transition-colors">📥 Backup</button>
          <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="w-full text-left text-xs text-zinc-500 hover:text-yellow-400 py-1 px-1 rounded transition-colors">📂 Carica Backup</button>
          <button onClick={() => { setShowReset(true); setResetStep(1); }} className="w-full text-left text-xs text-zinc-600 hover:text-red-500 py-1 px-1 rounded transition-colors">🔄 Nuova Campagna</button>
          <button onClick={onChangeRole} className="w-full text-left text-xs text-zinc-600 hover:text-blue-400 py-1 px-1 rounded transition-colors">🎮 Cambia stanza</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={restoreBackup} className="hidden" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "hub"        && <CampaignHub campaign={campaign} sessions={sessions} characters={characters} plots={plots} />}
        {tab === "world"      && <WorldEditor campaign={campaign} onSave={saveCampaign} />}
        {tab === "story"      && <StoryEngine campaign={campaign} characters={characters} plots={plots} sessions={sessions} onSavePlot={p => savePlots([...plots, p])} onSaveChar={c => saveChars([...characters, c])} onSaveSession={s => saveSessions([...sessions, s])} onSaveNote={handleSaveNoteFromStory} />}
        {tab === "characters" && <Characters characters={characters} onSave={saveChars} campaign={campaign} />}
        {tab === "plots"      && <PlotTracker plots={plots} onSave={savePlots} characters={characters} campaign={campaign} />}
        {tab === "sessions"   && <SessionTracker sessions={sessions} onSave={saveSessions} campaign={campaign} characters={characters} plots={plots} shk={shk} />}
        {tab === "notes"      && <NotesTab notes={notes} onSave={saveNotes} />}
        {tab === "initiative" && <CombatScreen characters={characters} campaign={campaign} shk={shk} savedMonsters={savedMonsters} onSaveMonsters={saveMonsters} combatState={combatState} onSaveCombatState={saveCombatState} onSaveChars={saveChars} />}
        {tab === "rules"      && !isHomebrew && <RulesSearch campaign={campaign} />}
        {tab === "share"      && <SharePanel campaign={campaign} sessions={sessions} plots={plots} onSavePlots={savePlots} shk={shk} characters={characters} onSaveChars={saveChars} />}
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [localRuleset, setLocalRuleset] = useState(null); // solo per modalità senza codice
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    Promise.all([dbGet("dem_role"), dbGet("dem_room_code"), dbGet("dem_player_name"), dbGet("dem_local_ruleset")])
      .then(([r, rc, pn, lr]) => {
        if (r) setRole(r); if (rc) setRoomCode(rc); if (pn) setPlayerName(pn); if (lr) setLocalRuleset(lr);
        setLoaded(true);
      });
  }, []);
  const selectDM = (code) => { setRole("dm"); setRoomCode(code); dbSet("dem_role", "dm"); dbSet("dem_room_code", code); };
  // localRulesetOverride è null quando il giocatore entra con codice (usa quello del master),
  // oppure è l'id del ruleset scelto in autonomia
  const selectPlayer = (code, name, lrs) => {
    setRole("player"); setRoomCode(code); setPlayerName(name); setLocalRuleset(lrs);
    dbSet("dem_role", "player"); dbSet("dem_room_code", code);
    dbSet("dem_player_name", name); dbSet("dem_local_ruleset", lrs);
  };
  const changeRole = () => {
    setRole(null); setRoomCode(""); setLocalRuleset(null);
    dbSet("dem_role", null); dbSet("dem_room_code", null); dbSet("dem_local_ruleset", null);
  };
  if (!loaded) return <div className="flex items-center justify-center h-screen bg-zinc-950 text-yellow-400 text-lg">⏳ Caricamento...</div>;
  if (!role || !roomCode) return <RoleSelector onSelectDM={selectDM} onSelectPlayer={selectPlayer} />;
  if (role === "player") return <PlayerApp playerName={playerName} roomCode={roomCode} localRuleset={localRuleset} onChangeRole={changeRole} />;
  return <IlDemiurgo roomCode={roomCode} onChangeRole={changeRole} />;
}