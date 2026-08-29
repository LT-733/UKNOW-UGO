import "./auth.css"
import { useState } from "react"
import uknow_logo from "./assets/logo.png"

function Auth() {
    const [activeTab, setActiveTab] = useState<'login'|'register'>('login')
    const [Username, setUsername] = useState<string> ("")
    const [Email, setEmail] = useState<string> ("")
    const [Password, setPassword] = useState<string> ("")
    const [Error, setError] = useState<string> ("")
    const token = localStorage.getItem("tokenstring")
    if(token != null){
        window.location.href = "/Search"
    }
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
            </div>
        </header>
        <div className="page">
            <section className="authCard" aria-live="polite">
            <div className="authHeading">
                <h1>UKNOW</h1>
                <p>Welcome to UKNOW. Sign in or create a new account.</p>
            </div>
            <div
                className="tabRow"
                role="tablist"
                aria-label="Authentication options"
            >
                <button
                className="tabButton"
                type="button"
                role="tab"
                aria-selected={activeTab === 'login' ? 'true' : 'false'}
                data-target="login-panel"
                onClick={() => {setActiveTab('login')}}
                >
                Login
                </button>
                <button
                className="tabButton"
                type="button"
                role="tab"
                aria-selected={activeTab === 'register' ? 'true' : 'false'}
                data-target="register-panel"
                onClick={() => {setActiveTab('register')}}
                >
                Create account
                </button>
            </div>
            <div
                className={activeTab === 'register' ? 'formPanel is-active' : 'formPanel'}
                id="register-panel"
                role="tabpanel"
            >
                <form>
                    <label htmlFor="text">Username</label>
                    <input
                    type="text"
                    onChange={(e) => setUsername(e.target.value)}
                    />
                    <p>This is your userName. They are unique!</p>
                    <label htmlFor="email">Email</label>
                    <input 
                    type="email"
                    onChange={(e) => setEmail(e.target.value)}
                    />
                    <p>Email must be a real Email. No, we don't send you stuff.</p>
                    <label htmlFor="password"> Password</label>
                    <input 
                    type="password"
                    onChange={(e) => setPassword(e.target.value)}
                    />
                    <p>Password must be at least 8 characters long. That's it for now.</p>
                    <button name="Submit" className="submitBtn" onClick={(e)=>{
                        e.preventDefault()
                        async function registerAttempt(){
                            const rawRegister = await fetch(`https://uknow-ugo.onrender.com/register`, {
                                method: "POST",
                                headers: {"Content-Type": "application/json"},
                                body: JSON.stringify({Email: Email, Password: Password, Username: Username})
                            })
                            if(rawRegister.ok){
                                const register_msg = await rawRegister.json()
                                if(register_msg["Message"] === "Account Created"){
                                    setActiveTab('login')
                                }
                            }
                        }
                        registerAttempt()
                    }}>Create Your Account</button>
                </form>
                
            </div>
            <div
                className={activeTab === 'login' ? 'formPanel is-active' : 'formPanel'}
                id="login-panel"
                role="tabpanel"
            >
                <form action="">
                <label htmlFor="email">Email</label>
                <input 
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                />
                <label htmlFor="password"> Password</label>
                <input 
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                />
                <br/>
                <button name="Submit" className="submitBtn" onClick={(e)=>{
                    e.preventDefault()
                    async function loginAttempt(){
                        const rawjwtToken = await fetch(`https://uknow-ugo.onrender.com/auth`, {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ Email: Email, Password: Password })
                                                    })
                        const jsonresponse = await rawjwtToken.json()
                        console.log(JSON.stringify(jsonresponse))
                        if(jsonresponse["token"] != null) {
                            console.log("gotcha")
                            localStorage.setItem("tokenstring", jsonresponse["token"])
                            window.location.href = "/Search"
                        }else{
                            setError(jsonresponse["Error: "])
                            console.log(Error)
                        }
                    }
                    loginAttempt()
                }}>Log In</button>
                </form>
                {Error && <div className="error">
                    {Error}
                    </div>}
            </div>
            </section>
        </div>
        </>

    )
}
export default Auth