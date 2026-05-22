import { useState, useEffect } from "react";
import Papa from "papaparse";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CSV_URL = "https://joel-walker-portfolio.s3.eu-west-2.amazonaws.com/cleaned/layoffs/layoffs_cleaned.csv";
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const BLUE = "#3b82f6";
const GREEN = "#10b981";
const PURPLE = "#a855f7";
const ORANGE = "#f97316";
const CYAN = "#06b6d4";
const DONUT_COLORS = ["#3b82f6", "#a855f7", "#10b981", "#f97316", "#ef4444", "#06b6d4", "#eab308", "#8b5cf6"];
const EVENT_ACCENTS = [BLUE, PURPLE, ORANGE, GREEN, CYAN];
const TT = { backgroundColor: "#0d1117", border: "1px solid #1e2d45", borderRadius: "8px", color: "#94a3b8", fontSize: "12px" };

// Map geography names (world-atlas) → CSV country names
const GEO_TO_CSV = {
  "United States of America": "United States",
  "Czech Rep.": "Czech Republic",
  "Czechia": "Czech Republic",
  "Hong Kong S.A.R.": "Hong Kong",
  "S. Korea": "South Korea",
  "Burma": "Myanmar",
  "Macedonia": "North Macedonia",
};
const geoToCSV = name => GEO_TO_CSV[name] || name;

function MetricCard({ label, value, accent, sub }) {
  return (
    <div style={{ border: "1px solid #1e2d45", borderTop: `3px solid ${accent}`, borderRadius: "12px", padding: "20px", backgroundColor: "#0d1117" }}>
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, color: accent, marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#4a6080", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function Card({ title, children, accent }) {
  return (
    <div style={{ border: "1px solid #1e2d45", borderTop: `3px solid ${accent || "#1e2d45"}`, borderRadius: "12px", padding: "20px", backgroundColor: "#0d1117" }}>
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, color: "#4a6080", marginBottom: "16px" }}>{title}</div>
      {children}
    </div>
  );
}

function InsightCard({ stat, statLabel, text, accent }) {
  return (
    <div style={{ border: "1px solid #1e2d45", borderTop: `3px solid ${accent}`, borderRadius: "10px", padding: "18px", backgroundColor: "#0a0f1a" }}>
      <div style={{ fontSize: "34px", fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace", lineHeight: 1 }}>{stat}</div>
      <div style={{ fontSize: "10px", color: accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "6px", marginBottom: "10px" }}>{statLabel}</div>
      <div style={{ fontSize: "12px", color: "#4a6080", lineHeight: "1.6" }}>{text}</div>
    </div>
  );
}

function EventCard({ event, rank, accent }) {
  const laidOff = parseInt(event.total_laid_off) || 0;
  return (
    <div style={{ border: "1px solid #1e2d45", borderTop: `3px solid ${accent}`, borderRadius: "10px", padding: "16px 20px", backgroundColor: "#0a0f1a", display: "flex", alignItems: "center", gap: "20px" }}>
      <div style={{ fontSize: "28px", fontWeight: 700, color: "#1e2d45", fontFamily: "monospace", minWidth: "36px", textAlign: "right" }}>#{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#e2e8f0" }}>{event.company}</span>
          <span style={{ fontSize: "22px", fontWeight: 700, color: accent, fontFamily: "monospace" }}>{laidOff.toLocaleString()}</span>
          <span style={{ fontSize: "11px", color: "#4a6080" }}>laid off</span>
        </div>
        <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "#4a6080", flexWrap: "wrap" }}>
          {event.industry && <span>{event.industry}</span>}
          {event.industry && event.date && <span style={{ color: "#1e2d45" }}>·</span>}
          {event.date && <span>{event.date}</span>}
          {event.date && event.country && <span style={{ color: "#1e2d45" }}>·</span>}
          {event.country && <span>{event.country}</span>}
        </div>
      </div>
    </div>
  );
}

const selectStyle = { backgroundColor: "#0d1117", border: "1px solid #1e2d45", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: "#94a3b8", outline: "none" };

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedStage, setSelectedStage] = useState("All");
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true, header: true,
      complete: (results) => {
        setData(results.data.filter(r => r.company && r.total_laid_off));
        setLoading(false);
      }
    });
  }, []);

  const years = ["All", ...Array.from(new Set(data.map(r => r.year))).filter(Boolean).sort()];
  const industries = ["All", ...Array.from(new Set(data.map(r => r.industry))).filter(Boolean).sort()];
  const countries = ["All", ...Array.from(new Set(data.map(r => r.country))).filter(Boolean).sort()];
  const stages = ["All", ...Array.from(new Set(data.map(r => r.stage))).filter(Boolean).sort()];

  const filtered = data.filter(r =>
    (selectedYear === "All" || r.year === selectedYear) &&
    (selectedIndustry === "All" || r.industry === selectedIndustry) &&
    (selectedCountry === "All" || r.country === selectedCountry) &&
    (selectedStage === "All" || r.stage === selectedStage)
  );

  const totalLaidOff = filtered.reduce((s, r) => s + (parseInt(r.total_laid_off) || 0), 0);
  const uniqueCompanies = new Set(filtered.map(r => r.company)).size;
  const uniqueCountries = new Set(filtered.map(r => r.country)).size;

  // Country map
  const countryMap = {};
  filtered.forEach(r => { if (r.country) countryMap[r.country] = (countryMap[r.country] || 0) + (parseInt(r.total_laid_off) || 0); });
  const maxCountry = Math.max(...Object.values(countryMap), 1);
  const colorScale = scaleLinear()
    .domain([0, maxCountry * 0.08, maxCountry * 0.35, maxCountry])
    .range(["#0d2140", "#1e3a8a", "#2563eb", "#93c5fd"]);

  // Timeline
  const timelineMap = {};
  filtered.forEach(r => { if (r.year_month) timelineMap[r.year_month] = (timelineMap[r.year_month] || 0) + (parseInt(r.total_laid_off) || 0); });
  const timelineData = Object.entries(timelineMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }));

  // Industry
  const indMap = {};
  filtered.forEach(r => { if (r.industry) indMap[r.industry] = (indMap[r.industry] || 0) + (parseInt(r.total_laid_off) || 0); });
  const industryData = Object.entries(indMap).sort(([, a], [, b]) => b - a).slice(0, 8).map(([industry, total]) => ({ industry: industry.length > 16 ? industry.slice(0, 16) + "…" : industry, total }));

  // Company
  const compMap = {};
  filtered.forEach(r => { if (r.company) compMap[r.company] = (compMap[r.company] || 0) + (parseInt(r.total_laid_off) || 0); });
  const companyData = Object.entries(compMap).sort(([, a], [, b]) => b - a).slice(0, 10).map(([company, total]) => ({ company: company.length > 14 ? company.slice(0, 14) + "…" : company, total }));

  // Funding stage donut
  const stageMap = {};
  filtered.forEach(r => { if (r.stage) stageMap[r.stage] = (stageMap[r.stage] || 0) + (parseInt(r.total_laid_off) || 0); });
  const stageData = Object.entries(stageMap).sort(([, a], [, b]) => b - a).slice(0, 8).map(([stage, total]) => ({ stage, total }));

  // Top 5 individual events
  const topEvents = [...filtered].sort((a, b) => (parseInt(b.total_laid_off) || 0) - (parseInt(a.total_laid_off) || 0)).slice(0, 5);

  // Insights
  const peakMonth = timelineData.reduce((a, b) => a.total > b.total ? a : b, { month: "N/A", total: 0 });
  const topCompany = companyData[0];
  const usTotal = countryMap["United States"] || 0;
  const usPct = totalLaidOff > 0 ? Math.round((usTotal / totalLaidOff) * 100) : 0;

  const insights = [
    { stat: peakMonth.total.toLocaleString(), statLabel: "workers cut in peak month", text: `Peak month: ${peakMonth.month} — driven by mass restructuring across major tech firms.`, accent: BLUE },
    { stat: (topCompany?.total || 0).toLocaleString(), statLabel: "laid off by top company", text: `${topCompany?.company?.replace("…", "") || "N/A"} led all companies in the selected period.`, accent: PURPLE },
    { stat: `${usPct}%`, statLabel: "of layoffs in the US", text: "Silicon Valley's outsized role in the global tech workforce confirmed.", accent: ORANGE },
    { stat: uniqueCompanies.toLocaleString(), statLabel: "companies affected", text: `Across ${uniqueCountries} countries — a structural shift, not isolated events.`, accent: GREEN },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#080c14", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
        <div style={{ color: "#4a6080", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>Loading intelligence data...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#080c14", color: "#94a3b8", fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e2d45", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10b981" }} />
            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#10b981", fontWeight: 600 }}>Live · Layoffs.fyi</span>
          </div>
          <div style={{ width: "1px", height: "16px", backgroundColor: "#1e2d45" }} />
          <h1 style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "17px", margin: 0, letterSpacing: "-0.02em" }}>Tech Layoffs Intelligence</h1>
        </div>
        <div style={{ fontSize: "11px", color: "#2d4060" }}>2020–2026 · Joel Walker · github.com/joelwalker-de</div>
      </div>

      <div style={{ padding: "20px 32px", display: "flex", flexDirection: "column", gap: "18px" }}>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a6080", fontWeight: 600 }}>Filter</span>
          <div style={{ width: "1px", height: "12px", backgroundColor: "#1e2d45" }} />
          <select style={selectStyle} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y === "All" ? "All Years" : y}</option>)}
          </select>
          <select style={selectStyle} value={selectedIndustry} onChange={e => setSelectedIndustry(e.target.value)}>
            {industries.map(i => <option key={i} value={i}>{i === "All" ? "All Industries" : i}</option>)}
          </select>
          <select style={selectStyle} value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}>
            {countries.map(c => <option key={c} value={c}>{c === "All" ? "All Countries" : c}</option>)}
          </select>
          <select style={selectStyle} value={selectedStage} onChange={e => setSelectedStage(e.target.value)}>
            {stages.map(s => <option key={s} value={s}>{s === "All" ? "All Stages" : s}</option>)}
          </select>
          {(selectedYear !== "All" || selectedIndustry !== "All" || selectedCountry !== "All" || selectedStage !== "All") && (
            <button onClick={() => { setSelectedYear("All"); setSelectedIndustry("All"); setSelectedCountry("All"); setSelectedStage("All"); }}
              style={{ backgroundColor: "transparent", border: "1px solid #1e2d45", borderRadius: "8px", padding: "6px 12px", fontSize: "11px", color: "#4a6080", cursor: "pointer" }}>
              Reset
            </button>
          )}
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          <MetricCard label="Total Laid Off" value={totalLaidOff.toLocaleString()} accent={BLUE} sub="across all selected filters" />
          <MetricCard label="Companies Affected" value={uniqueCompanies.toLocaleString()} accent={PURPLE} sub="unique companies" />
          <MetricCard label="Countries" value={uniqueCountries.toLocaleString()} accent={GREEN} sub="global reach" />
          <MetricCard label="Layoff Events" value={filtered.length.toLocaleString()} accent={ORANGE} sub="reported incidents" />
        </div>

        {/* Insight stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          {insights.map((ins, i) => (
            <InsightCard key={i} stat={ins.stat} statLabel={ins.statLabel} text={ins.text} accent={ins.accent} />
          ))}
        </div>

        {/* World map — full width, vibrant */}
        <Card title="Global Layoff Distribution — Click a country to filter" accent={BLUE}>
          <div style={{ position: "relative", backgroundColor: "#020408", borderRadius: "8px", overflow: "hidden" }}>
            <ComposableMap projectionConfig={{ scale: 158 }} style={{ width: "100%", height: "500px" }}>
              <defs>
                <filter id="countryGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <ZoomableGroup>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map(geo => {
                      const name = geo.properties.name;
                      const csvName = geoToCSV(name);
                      const value = countryMap[csvName] || 0;
                      const hasData = value > 0;
                      const isHigh = value > maxCountry * 0.25;
                      const isSelected = selectedCountry !== "All" && csvName === selectedCountry;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={isSelected ? "#22d3ee" : (hasData ? colorScale(value) : "#020408")}
                          stroke={isSelected ? "#ffffff" : (hasData ? "#1a3a6e" : "#0a1020")}
                          strokeWidth={isSelected ? 2 : 0.4}
                          filter={isHigh && !isSelected ? "url(#countryGlow)" : undefined}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: isSelected ? "#38bdf8" : "#60a5fa", outline: "none", cursor: "pointer", filter: "url(#countryGlow)" },
                            pressed: { outline: "none" },
                          }}
                          onMouseEnter={() => setTooltip({ name, value })}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => setSelectedCountry(selectedCountry === csvName ? "All" : csvName)}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
            {tooltip && (
              <div style={{ position: "absolute", top: "16px", left: "16px", backgroundColor: "#0d1117", border: "1px solid #1e2d45", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", pointerEvents: "none" }}>
                <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: "2px" }}>{tooltip.name}</div>
                <div style={{ color: "#4a6080" }}>{tooltip.value > 0 ? `${tooltip.value.toLocaleString()} laid off` : "No data"}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Timeline — full width */}
        <Card title="Layoffs Over Time" accent={BLUE}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="month" tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} interval={5} />
              <YAxis tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="total" stroke={BLUE} fill="url(#blueGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* 3-column: Industries · Companies · Funding Stage */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <Card title="Top Industries" accent={PURPLE}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={industryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="industry" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="total" fill={PURPLE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Top Companies" accent={GREEN}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={companyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="company" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="total" fill={GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Layoffs by Funding Stage" accent={ORANGE}>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={stageData} dataKey="total" nameKey="stage" cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={3} strokeWidth={0}>
                  {stageData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={v => v.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginTop: "6px" }}>
              {stageData.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#4a6080" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.stage}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top Layoff Events */}
        <div>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: "#4a6080", marginBottom: "12px" }}>Top Layoff Events</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topEvents.map((event, i) => (
              <EventCard key={i} event={event} rank={i + 1} accent={EVENT_ACCENTS[i]} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: "11px", color: "#1e2d45", paddingBottom: "20px" }}>
          Built by Joel Walker · Data Engineering Portfolio · github.com/joelwalker-de
        </div>

      </div>
    </div>
  );
}
