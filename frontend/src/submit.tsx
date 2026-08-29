import "./submit.css"
import uknow_logo from "./assets/logo.png"
import { useEffect, useState } from "react"


function Submit(){
    // const [Year, setYear] = useState<number | null>(null)
    const [Program, setProgram] = useState<string> ("")
    const [University, setUniversity] = useState<string> ("")
    const [Grade, setGrade] = useState<number> (-1)
    const [programs, setprograms] = useState<string[]> ([])
    const [universities, setuniversities] = useState<string[]> ([])
    const [Error, setError] = useState<string> ("")
    const [Success, setSuccess] = useState<boolean>(false)
    const token = localStorage.getItem("tokenstring")
    const username = token ? JSON.parse(atob(token.split('.')[1])).sub : null

    useEffect(()=> {
        async function getUnis() {
            const rawUnis = await fetch(`https://uknow-ugo.onrender.com/universities`)
            const uniJson = await rawUnis.json()
            setuniversities(uniJson["Universities"] ?? [])
        }
        getUnis()
        
    }, [])

    useEffect(() => {
        async function getPrograms() {
            const rawProgs = await fetch(`https://uknow-ugo.onrender.com/programs?University=${University}`)
            const progJson = await rawProgs.json()
            setprograms(progJson["Programs"] ?? [])
        }
        getPrograms()
    }, [University])
    return (
        <>
        <header>
            <div className="headerRow">
            <a className="logoLink" href="/Search">
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
            Back to search
        </a>
        <div className="page">
            <main>
            <div className="heading">
                <h3>Submit a new program record</h3>
            </div>
            <form className="submitForm">
                <div className="fieldRow">
                <div>
                    <label htmlFor="uni">University</label>
                    <select value={University} onChange={(e) => {setUniversity(e.target.value)}}>
                        <option value="">Select a University</option>
                        {universities.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <div className="error">
                    </div>
                </div>
                </div>
                <div className="fieldFull">
                <label htmlFor="name">Program Name</label>
                    <select value={Program} onChange={(e) => {setProgram(e.target.value)}}>
                        <option value="">Select a Program</option>
                        {programs.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                <div className="error">
                </div>
                </div>
                <div className="fieldFull">
                <label htmlFor="gpa">GPA</label>
                <input
                    id="gpa"
                    name="gpa"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    placeholder="e.g. 90"
                    onChange={(e) => {setGrade(parseFloat(e.target.value))}}
                />
                <div className="error">
                </div>
                </div>
                <div className="actions">
                <button className="submitBtn" type="button" onClick={() => {
                    const tokenstring = localStorage.getItem("tokenstring")
                    if(tokenstring == null){
                        window.location.href = "/Auth"
                    }
                    async function submitAttempt(){
                        const submission_response = await fetch(`https://uknow-ugo.onrender.com/submit`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${tokenstring}`
                            },
                            body: JSON.stringify({University: University, Program: Program, GPA: Grade, UserId: username})
                        })
                        const json_reponse = await submission_response.json()
                        if(json_reponse["Status"] != null){
                            setSuccess(true)
                        }else{
                            setError(json_reponse["Error"])
                        }
                    } 
                    submitAttempt()
                }}>
                    Submit
                </button>
                </div>
            </form>
            {Success && <div className="success">
                <strong>Form received.</strong>
            </div>}
            {Error != "" && <div className="error">
                <strong>Something went wrong:</strong>
                <p>{Error}</p>
                </div>}
            </main>
        </div>
        </>
    )
}
export default Submit