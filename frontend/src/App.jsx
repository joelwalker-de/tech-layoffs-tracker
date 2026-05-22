import { useState, useEffect } from "react";
import Papa from "papaparse";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CSV_URL = "https://joel-walker-portfolio.s3.eu-west-2.amazonaws.com/cleaned/layoffs/layoffs_cleaned.csv";
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const BLUE = "#3b82f6";
const GREEN = "#10b981";
const PURPLE = "#a855f7";
const ORANGE = "#f97316";
const TT = { backgroundColor: "#0d1117", border: "1px solid #1e2d45", borderRadius: "8px", color: "#94a3b8", fontSize: "12px" };

function MetricCard({ label, value, accent, sub }) {
  return (
    <div style={{ border: "1px solid #1e2d45", borderRadius: "12px", padding: "20px", backgroundColor: "#0d1117", borderTop: `2px solid ${accent}` }}>
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, color: accent, marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#4a6080", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ border: "1px solid #1e2d45", borderRadius: "12px", padding: "20px", backgroundColor: "#0d1117" }}>
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, color: "#4a6080", marginBottom: "16px" }}>{title}</div>
      {children}
    </div>
  );
}

function InsightCard({ insight, accent }) {
  return (
    <div style={{ border: "1px solid #1e2d45", borderLeft: `3px solid ${accent}`, borderRadius: "8px", padding: "14px 16px", backgroundColor: "#0a0f1a" }}>
      <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.6" }}>{insight}</div>
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

  const filtered = data.filter(r => {
    return (selectedYear === "All" || r.year === selectedYear) &&
           (selectedIndustry === "All" || r.industry === selectedIndustry) &&
           (selectedCountry === "All" || r.country === selectedCountry) &&
           (selectedStage === "All" || r.stage === selectedStage);
  });

  const totalLaidOff = filtered.reduce((s, r) => s + (parseInt(r.total_laid_off) || 0), 0);
  const uniqueCompanies = new Set(filtered.map(r => r.company)).size;
  const uniqueCountries = new Set(filtered.map(r => r.country)).size;

  // Country map data
  const countryMap = {};
  filtered.forEach(r => { if (r.country) countryMap[r.country] = (countryMap[r.country] || 0) + (parseInt(r.total_laid_off) || 0); });
  const maxCountry = Math.max(...Object.values(countryMap));
  const colorScale = scaleLinear().domain([0, maxCountry]).range(["#1e2d45", "#3b82f6"]);

  // Timeline
  const timelineMap = {};
  filtered.forEach(r => { if (r.year_month) timelineMap[r.year_month] = (timelineMap[r.year_month] || 0) + (parseInt(r.total_laid_off) || 0); });
  const timelineData = Object.entries(timelineMap).sort(([a],[b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }));

  // Industry
  const indMap = {};
  filtered.forEach(r => { if (r.industry) indMap[r.industry] = (indMap[r.industry] || 0) + (parseInt(r.total_laid_off) || 0); });
  const industryData = Object.entries(indMap).sort(([,a],[,b]) => b-a).slice(0,8).map(([industry, total]) => ({ industry: industry.length > 16 ? industry.slice(0,16)+"…" : industry, total }));

  // Company
  const compMap = {};
  filtered.forEach(r => { if (r.company) compMap[r.company] = (compMap[r.company] || 0) + (parseInt(r.total_laid_off) || 0); });
  const companyData = Object.entries(compMap).sort(([,a],[,b]) => b-a).slice(0,10).map(([company, total]) => ({ company: company.length > 14 ? company.slice(0,14)+"…" : company, total }));

  // Country bar
  const countryBarData = Object.entries(countryMap).sort(([,a],[,b]) => b-a).slice(0,8).map(([country, total]) => ({ country: country.length > 12 ? country.slice(0,12)+"…" : country, total }));

  // Insights
  const peakMonth = timelineData.reduce((a, b) => a.total > b.total ? a : b, { month: "N/A", total: 0 });
  const topCompany = companyData[0];
  const topCountry = countryBarData[0];
  const usTotal = countryMap["United States"] || 0;
  const usPct = totalLaidOff > 0 ? Math.round((usTotal / totalLaidOff) * 100) : 0;

  const insights = [
    { text: `Peak layoff month was ${peakMonth.month} with ${peakMonth.total.toLocaleString()} workers cut — driven by mass restructuring across major tech firms.`, accent: BLUE },
    { text: `${topCompany?.company || "N/A"} led all companies with ${(topCompany?.total || 0).toLocaleString()} total layoffs across the selected period.`, accent: PURPLE },
    { text: `The United States accounts for ${usPct}% of all layoffs in this view — confirming Silicon Valley's outsized role in the global tech workforce.`, accent: ORANGE },
    { text: `${uniqueCompanies} companies across ${uniqueCountries} countries reported workforce reductions — this is a structural shift, not isolated events.`, accent: GREEN },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#080c14", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }}></div>
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
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10b981" }}></div>
            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#10b981", fontWeight: 600 }}>Live · Layoffs.fyi</span>
          </div>
          <div style={{ width: "1px", height: "16px", backgroundColor: "#1e2d45" }}></div>
          <h1 style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "17px", margin: 0, letterSpacing: "-0.02em" }}>Tech Layoffs Intelligence</h1>
        </div>
        <div style={{ fontSize: "11px", color: "#2d4060" }}>2020–2026 · Joel Walker · github.com/joelwalker-de</div>
      </div>

      <div style={{ padding: "20px 32px", display: "flex", flexDirection: "column", gap: "18px" }}>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a6080", fontWeight: 600 }}>Filter</span>
          <div style={{ width: "1px", height: "12px", backgroundColor: "#1e2d45" }}></div>
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

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          <MetricCard label="Total Laid Off" value={totalLaidOff.toLocaleString()} accent={BLUE} sub="across all selected filters" />
          <MetricCard label="Companies Affected" value={uniqueCompanies.toLocaleString()} accent={PURPLE} sub="unique companies" />
          <MetricCard label="Countries" value={uniqueCountries.toLocaleString()} accent={GREEN} sub="global reach" />
          <MetricCard label="Layoff Events" value={filtered.length.toLocaleString()} accent={ORANGE} sub="reported incidents" />
        </div>

        {/* Insights */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          {insights.map((ins, i) => <InsightCard key={i} insight={ins.text} accent={ins.accent} />)}
        </div>

        {/* Map */}
        <Card title="Global Layoff Distribution — Click a country to filter">
          <div style={{ position: "relative" }}>
            <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: "340px" }}>
              <ZoomableGroup>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map(geo => {
                      const name = geo.properties.name;
                      const value = countryMap[name] || 0;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={value > 0 ? colorScale(value) : "#111827"}
                          stroke="#1e2d45"
                          strokeWidth={0.5}
                          style={{ default: { outline: "none" }, hover: { fill: "#60a5fa", outline: "none", cursor: "pointer" }, pressed: { outline: "none" } }}
                          onMouseEnter={() => setTooltip({ name, value })}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => setSelectedCountry(selectedCountry === name ? "All" : name)}
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

        {/* Timeline */}
        <Card title="Layoffs Over Time">
          <ResponsiveContainer width="100%" height={180}>
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
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="total" stroke={BLUE} fill="url(#blueGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Card title="Top Industries">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={industryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="industry" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="total" fill={PURPLE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Top Companies">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={companyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="company" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="total" fill={GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Country bar */}
        <Card title="Layoffs by Country">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={countryBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
              <XAxis dataKey="country" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: "#4a6080", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="total" fill={ORANGE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ textAlign: "center", fontSize: "11px", color: "#1e2d45", paddingBottom: "20px" }}>
          Built by Joel Walker · Data Engineering Portfolio · github.com/joelwalker-de
        </div>

      </div>
    </div>
  );
}
