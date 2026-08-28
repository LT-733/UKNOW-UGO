import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Search from './App.tsx'
import Auth from './auth.tsx'
import { BrowserRouter, Route, Routes} from 'react-router-dom'
import Results from './results.tsx'
import Details from './details.tsx'
import Submit from './submit.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
    <Routes>
      <Route path='/Search' element={<Search />}/> 
      <Route path='/Auth' element={<Auth />}/>
      <Route path='/results' element={<Results />}/>
      <Route path='/detail' element={<Details />}/>
      <Route path='/submit' element={<Submit />}/>
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)
