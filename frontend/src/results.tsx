import "./results.css"
import { useEffect, useState } from "react"
import uknow_logo from "./assets/logo.png"
import { useSearchParams } from "react-router-dom"

function Results(){
    const [cards, setCard] = useState<Record<string, Record<string, { Float64: number, Valid: boolean }>>>({})
    const [searchParams] = useSearchParams()
    console.log(searchParams.get("University"), searchParams.get("Program"))
    const yourgpa = parseFloat(searchParams.get("GPA") ?? "0.0")
    useEffect(() => {
        async function getCards() {
            const rawCards = await fetch(`http://localhost:8080/results?University=${searchParams.get("University") ?? ""}&Program=${searchParams.get("Program") ?? ""}`)
            console.log(rawCards)
            const data = await rawCards.json()
            setCard(data["Search Results"])
        }
        getCards()
    }, [])
    const token = localStorage.getItem("tokenstring")
    const username = token ? JSON.parse(atob(token.split('.')[1])).sub : null
    console.log(cards)
    console.log(yourgpa)
    return (
        <>
        <header>
            <div className="headerRow">
            <a className="logoLink" href="/Search" aria-label="UKNOW home">
                <img
                className="siteLogo"
                src={uknow_logo}
                alt="UKNOW logo"
                />
            </a>
            <div className="topActions">
                {username ? <a className="pillLink" onClick={(e) =>{
                e.preventDefault()
                localStorage.removeItem("tokenstring")
                window.location.href="/Search"
                }}>Log out as {username}</a> : <a className="pillLink" href="/Auth">Log in</a>}
            </div>
            </div>
        </header>
        <a className="pillLink bottomAction bottomLeft" href="/Search">
            New search
        </a>
        <a className="pillLink bottomAction bottomRight" href="/submit/">
            Submit a record
        </a>
        <main>
            {Object.entries(cards).flatMap(([University, Programs]) =>
                Object.entries(Programs).map(([program, avg]) => ({ University, program, avg }))
            )
            .sort((a, b) => (b.avg.Valid ? 1 : 0) - (a.avg.Valid ? 1 : 0))
            .map(({ University, program, avg }) => (
                <div key={`${University}-${program}`} className="result-card">
                    <div className="result-left">
                            <div className="avg">Average GPA: <strong>{avg.Valid !== false ? avg.Float64 : "N/A"}</strong></div>
                            <div className="risk">Risk rating (compared to average last year): <em>{avg.Valid !== false ? (isNaN(yourgpa) || yourgpa === 0 ? "Not Applicable" : yourgpa - avg.Float64 > 0.0 ? (yourgpa - avg.Float64 > 2.0 ? "Safe" : "Match") : (avg.Float64 - yourgpa > 2.0 ? "Risky" : "Match")) : "Not Applicable"}</em></div>
                    </div>
                    <div className="result-right">
                        <a target="_blank" className="program-link" onClick={(e) =>{
                            e.preventDefault()
                            window.location.href=`detail?University=${encodeURIComponent(University)}&Program=${encodeURIComponent(program)}&GPA=${yourgpa}`
                        }}><b>{program}</b></a>
                        <div className="university">{University}</div>
                    </div>
                </div>
            ))}
            
        </main>
        </>

    )
}
export default Results