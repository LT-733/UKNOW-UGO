import { useSearchParams } from "react-router-dom"
import uknow_logo from "./assets/logo.png"
import "./details.css"
import { useEffect, useState, useMemo } from "react"
import Plot from "react-plotly.js"

interface GradeRecord {
    Year: number
    GPA: number
}

function Details() {
    const [searchParams] = useSearchParams()
    const University = searchParams.get("University") ?? ""
    const Program = searchParams.get("Program") ?? ""
    const yourgpa = parseFloat(searchParams.get("GPA") ?? "0.0")

    const [grades, setGrades] = useState<GradeRecord[]>([])
    const [year, setYear] = useState<number | null>(null)

    const token = localStorage.getItem("tokenstring")
    const username = token ? JSON.parse(atob(token.split('.')[1])).sub : null

    useEffect(() => {
        async function getGrades() {
            if (University && Program) {
                try {
                    const rawGrades = await fetch(`https://uknow-ugo-np1s.vercel.app/details?University=${encodeURIComponent(University)}&Program=${encodeURIComponent(Program)}`)
                    const parsedGrades = await rawGrades.json()
                    setGrades(parsedGrades["Results"] ?? [])
                } catch (err) {
                    console.error("Failed to fetch grades:", err)
                    setGrades([])
                }
            } else {
                setGrades([])
            }
        }
        getGrades()
    }, [University, Program])

    const uniqueYears = useMemo(() => {
        return Array.from(new Set(grades.map(g => g.Year))).sort((a, b) => a - b)
    }, [grades])

    useEffect(() => {
        if (uniqueYears.length > 0) {
            setYear(Math.max(...uniqueYears))
        }
    }, [uniqueYears])

    const filteredGrades = useMemo(() => {
        return year ? grades.filter(g => g.Year === year) : grades
    }, [grades, year])

    // --- ZERO-SCRAPE IN-MEMORY ANALYTICS ---
    const stats = useMemo(() => {
        if (filteredGrades.length === 0) return { median: 0, min: 0, max: 0, percentile: 0, count: 0 }
        
        const sorted = [...filteredGrades.map(g => g.GPA)].sort((a, b) => a - b)
        const count = sorted.length
        const min = sorted[0]
        const max = sorted[count - 1]
        
        const mid = Math.floor(count / 2)
        const median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2

        const belowUser = sorted.filter(gpa => gpa <= yourgpa).length
        const percentile = Math.round((belowUser / count) * 100)

        return { median, min, max, percentile, count }
    }, [filteredGrades, yourgpa])

    // Jitter points on X-axis around the selected year line
    const xValues = useMemo(() => {
        return filteredGrades.map(g => g.Year + (Math.random() - 0.5) * 0.25)
    }, [filteredGrades])

    const yValues = useMemo(() => filteredGrades.map(g => g.GPA), [filteredGrades])

    return (
        <>
            <header>
                <div className="headerRow">
                    <a className="logoLink" href="/Search" aria-label="UKNOW home">
                        <img className="siteLogo" src={uknow_logo} alt="UKNOW logo" />
                    </a>
                    <div className="topActions">
                        {username ? (
                            <a className="pillLink" onClick={(e) => {
                                e.preventDefault()
                                localStorage.removeItem("tokenstring")
                                window.location.href = "/Search"
                            }}>Log out as {username}</a>
                        ) : (
                            <a className="pillLink" href="/Auth">Log in</a>
                        )}
                    </div>
                </div>
            </header>

            <a className="pillLink submitCorner" href="/submit/">
                Submit a record
            </a>

            {/* MAIN DASHBOARD CONTAINER MATCHING YOUR .tables SCALLOP */}
            <div className="tables" style={{ flexDirection: "column", gap: "24px" }}>
                
                {/* TOP CONTROL BAR: YEAR BUTTONS & PROGRAM TITLE */}
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#0f172a" }}>{Program || "Program Search"}</h1>
                        <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#64748b", fontWeight: "normal" }}>{University || "University"}</h2>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {uniqueYears.map((y) => (
                            <button 
                                key={y} 
                                onClick={() => setYear(y)} 
                                className="year-btn"
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: year === y ? "#8c1515" : "white",
                                    color: year === y ? "white" : "#0f172a",
                                    borderColor: year === y ? "#8c1515" : "#d4d8e2"
                                }}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MIDDLE ROW: SCATTERPLOT + ANALYTICS TABLE */}
                <div style={{ display: "flex", width: "100%", gap: "24px", alignItems: "stretch", flexWrap: "wrap" }}>
                    
                    {/* SCATTERPLOT BOX */}
                    <div className="chart-container" style={{ 
                        flex: "2", 
                        minWidth: "320px", 
                        background: "rgba(255, 255, 255, 0.9)", 
                        borderRadius: "16px", 
                        border: "1px solid #d4d8e2", 
                        padding: "16px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
                    }}>
                        <Plot
                            data={[
                                {
                                    x: xValues,
                                    y: yValues,
                                    type: "scatter",
                                    mode: "markers",
                                    marker: { color: "#007bff", size: 8, opacity: 0.75 },
                                    name: "Reported Grades"
                                },
                                {
                                    x: [year ?? new Date().getFullYear()],
                                    y: [yourgpa],
                                    type: "scatter",
                                    mode: "markers",
                                    marker: { color: "#8c1515", size: 16, symbol: "diamond" },
                                    name: "You are here"
                                },
                            ]}
                            layout={{
                                title: { text: `${Program} Admissions Scatter (${year ?? 'All'})` },
                                xaxis: { 
                                    title: "Year",
                                    dtick: 1,
                                    range: year ? [year - 0.4, year + 0.4] : undefined
                                },
                                yaxis: { 
                                    title: "Average (%)", 
                                    range: [Math.max(60, Math.min(...(yValues.length ? yValues : [80]), yourgpa || 80) - 5), 100] 
                                },
                                autosize: true,
                                margin: { l: 45, r: 25, t: 40, b: 40 },
                                paper_bgcolor: "transparent",
                                plot_bgcolor: "transparent"
                            }}
                            useResizeHandler={true}
                            style={{ width: "100%", height: "380px" }}
                        />
                    </div>

                    {/* METRICS SIDE TABLE USING YOUR EXISTING table.info CLASS */}
                    <table className="info" style={{ flex: "1", minWidth: "260px" }}>
                        <tbody>
                            <tr>
                                <td>
                                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Class Sample Size</div>
                                    <strong>{stats.count} Records</strong>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Median Admitted Average</div>
                                    <strong>{stats.median ? `${stats.median.toFixed(1)}%` : "N/A"}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Lowest Admitted Average</div>
                                    <strong>{stats.min ? `${stats.min.toFixed(1)}%` : "N/A"}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style={{ backgroundColor: "rgba(140, 21, 21, 0.03)" }}>
                                    <div style={{ fontSize: "0.85rem", color: "#8c1515", fontWeight: "bold" }}>Your Standing</div>
                                    <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: "#8c1515" }}>
                                        {yourgpa > 0 ? `${stats.percentile}%` : "N/A"}
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                        Higher than historical entries in this cohort.
                                    </div>
                                </td>
                            </tr>
                            
                        </tbody>
                    </table>

                    {/* BOTTOM ROW: VERTICALLY STACKED CARD UNDER BOTH PLOT AND FIRST SIDEBAR */}
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255, 255, 255, 0.9)", padding: "20px", borderRadius: "16px", border: "1px solid #d4d8e2", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                        <div>
                            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "6px" }}>Admissions Category</div>
                            <span style={{
                                display: "inline-block",
                                padding: "6px 14px",
                                borderRadius: "999px",
                                fontWeight: "bold",
                                fontSize: "0.95rem",
                                backgroundColor: !yourgpa ? "#f8fafc" : stats.percentile >= 75 ? "#f0fdf4" : stats.percentile >= 40 ? "#eff6ff" : "#fef2f2",
                                color: !yourgpa ? "#64748b" : stats.percentile >= 75 ? "#166534" : stats.percentile >= 40 ? "#1e40af" : "#991b1b",
                                border: `1px solid ${!yourgpa ? "#cbd5e1" : stats.percentile >= 75 ? "#bbf7d0" : stats.percentile >= 40 ? "#bfdbfe" : "#fecaca"}`
                            }}>
                                {!yourgpa ? "Unknown" : stats.percentile >= 75 ? "Safety Target" : stats.percentile >= 40 ? "Competitive Match" : "Hard Reach"}
                            </span>
                        </div>

                        <div>
                            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Distance to Median</div>
                            <strong style={{ fontSize: "1.1rem", color: !yourgpa ? "#64748b" : (yourgpa - stats.median) >= 0 ? "#166534" : "#8c1515" }}>
                                {!yourgpa ? "Unknown" : (yourgpa - stats.median) >= 0 ? `+${(yourgpa - stats.median).toFixed(1)}%` : `${(yourgpa - stats.median).toFixed(1)}%`}
                            </strong>
                        </div>

                        <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: "1.5", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                            <strong>Strategic Takeaway:</strong>{" "}
                            {!yourgpa
                                ? "Unknown. Provide your GPA to receive personalized chancing metrics and strategic takeaways."
                                : stats.percentile >= 75 
                                ? "Your academic profile is strong for this program. Ensure basic prerequisite thresholds are verified. Note that for Ontario Universities Out of Province Candidates could experience different results."
                                : stats.percentile >= 40
                                ? "You meet historical standards. Focus heavily on supplementary profiles and personal statements. Note that for Ontario Universities Out of Province Candidates could experience different results."
                                : "Historically, fewer than 25% of admitted applicants fall at or below this average. Prepare strong backup options. Note that for Ontario Universities Out of Province Candidates could experience different results."}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Details