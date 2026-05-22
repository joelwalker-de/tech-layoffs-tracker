import { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const CSV_URL = "https://joel-walker-portfolio.s3.eu-west-2.amazonaws.com/cleaned/layoffs/layoffs_cleaned.csv";

const BLUE = "#3b82f6";
const GREEN = "#10b981";
const PURPLE = "#a855f7";
const ORANGE = "#f97316";

// --- Tooltip styles ---
const TooltipStyle = {
  backgroundColor: "#0d1117",
  border: "1px solid #1e2d45",
  borderRadius: "8px",
  color: "#94a3b8",
  fontSize: "12px",
};

// --- Metric Card ---
function MetricCard({ label, value, accent }) {
  return (
    <div className="border border-[#1e2d45] rounded-xl p-5 bg-[#0d1117] flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: accent || "#4a6080" }}>
        {label}
      </span>
      <span className="text-2xl font-bold text-slate-100 font-mono">{value}</span>
    </div>
  );
}

// --- Section Card ---
function Card({ title, children }) {
  return (
    <div className="border border-[#1e2d45] rounded-xl p-5 bg-[#0d1117]">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-[#4a6080] mb-4">{title}</p>
      {children}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedIndustry, setSelectedIndustry] = useState("All");

  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const clean = results.data.filter(r => r.company && r.total_laid_off);
        setData(clean);
        setLoading(false);
      }
    });
  }, []);

  // --- Filter ---
  const years = ["All", ...Array.from(new Set(data.map(r => r.year))).filter(Boolean).sort()];
  const industries = ["All", ...Array.from(new Set(data.map(r => r.industry))).filter(Boolean).sort()];

  const filtered = data.filter(r => {
    const yearOk = selectedYear === "All" || r.year === selectedYear;
    const indOk = selectedIndustry === "All" || r.industry === selectedIndustry;
    return yearOk && indOk;
  });

  // --- Metrics ---
  const totalLaidOff = filtered.reduce((s, r) => s + (parseInt(r.total_laid_off) || 0), 0);
  const companies = new Set(filtered.map(r => r.company)).size;
  const countries = new Set(filtered.map(r => r.country)).size;
  const events = filtered.length;

  // --- Timeline chart ---
  const timelineMap = {};
  filtered.forEach(r => {
    if (!r.year_month) return;
    timelineMap[r.year_month] = (timelineMap[r.year_month] || 0) + (parseInt(r.total_laid_off) || 0);
  });
  const timelineData = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  // --- Industry chart ---
  const industryMap = {};
  filtered.forEach(r => {
    if (!r.industry) return;
    industryMap[r.industry] = (industryMap[r.industry] || 0) + (parseInt(r.total_laid_off) || 0);
  });
  const industryData = Object.entries(industryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([industry, total]) => ({ industry: industry.length > 16 ? industry.slice(0, 16) + "…" : industry, total }));

  // --- Company chart ---
  const companyMap = {};
  filtered.forEach(r => {
    if (!r.company) return;
    companyMap[r.company] = (companyMap[r.company] || 0) + (parseInt(r.total_laid_off) || 0);
  });
  const companyData = Object.entries(companyMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([company, total]) => ({ company: company.length > 14 ? company.slice(0, 14) + "…" : company, total }));

  // --- Country chart ---
  const countryMap = {};
  filtered.forEach(r => {
    if (!r.country) return;
    countryMap[r.country] = (countryMap[r.country] || 0) + (parseInt(r.total_laid_off) || 0);
  });
  const countryData = Object.entries(countryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([country, total]) => ({ country: country.length > 12 ? country.slice(0, 12) + "…" : country, total }));

  if (loading) return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#4a6080] text-sm font-mono tracking-widest uppercase">Loading data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-300" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div className="border-b border-[#1e2d45] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest text-green-500 font-semibold">Live</span>
          </div>
          <div className="w-px h-4 bg-[#1e2d45]"></div>
          <h1 className="text-white font-bold text-lg tracking-tight">Tech Layoffs Intelligence</h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#4a6080]">
          <span className="font-mono">2020–2026</span>
          <div className="w-px h-3 bg-[#1e2d45]"></div>
          <span>Joel Walker · github.com/joelwalker-de</span>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* Filters */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-[#4a6080] font-semibold">Filter</span>
          <div className="w-px h-3 bg-[#1e2d45]"></div>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-[#0d1117] border border-[#1e2d45] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {years.map(y => <option key={y} value={y}>{y === "All" ? "All Years" : y}</option>)}
          </select>
          <select
            value={selectedIndustry}
            onChange={e => setSelectedIndustry(e.target.value)}
            className="bg-[#0d1117] border border-[#1e2d45] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {industries.map(i => <option key={i} value={i}>{i === "All" ? "All Industries" : i}</option>)}
          </select>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard label="Total Laid Off" value={totalLaidOff.toLocaleString()} accent={BLUE} />
          <MetricCard label="Companies Affected" value={companies.toLocaleString()} accent={PURPLE} />
          <MetricCard label="Countries" value={countries.toLocaleString()} accent={GREEN} />
          <MetricCard label="Layoff Events" value={events.toLocaleString()} accent={ORANGE} />
        </div>

        {/* Timeline */}
        <Card title="Layoffs Over Time">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="month" tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} interval={5} />
              <YAxis tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TooltipStyle} />
              <Area type="monotone" dataKey="total" stroke={BLUE} fill="url(#blueGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-4">
          <Card title="Top Industries">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={industryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="industry" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey="total" fill={PURPLE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Top Companies">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={companyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="company" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey="total" fill={GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Row 3 */}
        <Card title="Layoffs by Country">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={countryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
              <XAxis dataKey="country" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TooltipStyle} />
              <Bar dataKey="total" fill={ORANGE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

      </div>
    </div>
  );
}