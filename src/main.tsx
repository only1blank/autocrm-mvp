import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import "./style.css";

const API = "http://localhost:4000/api";
const api = axios.create({ baseURL: API });
api.interceptors.request.use(c => { const t = localStorage.getItem("token"); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });

const statusNames: any = { NEW:"Новый", IN_PROGRESS:"В работе", CALLBACK:"Перезвонить", NO_ANSWER:"Недозвон", REFUSED:"Отказ", VISIT:"На визит", VISIT_DONE:"Визит состоялся", IN_WORK:"В работе у менеджера", SOLD:"Продажа", LOST:"Потерян" };
const creditNames: any = { NEW:"Новая", IN_PROGRESS:"В работе", SENT_TO_BANK:"Отправлена в банк", REVIEW:"На рассмотрении", APPROVED:"Одобрена", BANK_REFUSED:"Отказ банка", CLIENT_REFUSED:"Отказ клиента", COMPLETED:"Оформлена" };

function App() {
  const [user,setUser]=useState<any>(null);
  const [page,setPage]=useState("dashboard");
  const [login,setLogin]=useState({email:"admin@autohub.local",password:"admin123"});
  const [data,setData]=useState<any>({});

  useEffect(()=>{ const u=localStorage.getItem("user"); if(u) setUser(JSON.parse(u)); },[]);
  useEffect(()=>{ if(user) load(); },[user,page]);

  async function load(){
    if(page==="dashboard") setData((await api.get("/dashboard")).data);
    if(page==="leads") setData((await api.get("/leads")).data);
    if(page==="clients") setData((await api.get("/clients")).data);
    if(page==="credits") setData((await api.get("/credit-applications")).data);
    if(page==="dealerships") setData((await api.get("/dealerships")).data);
  }
  async function doLogin(e:any){ e.preventDefault(); try { const r=await api.post("/auth/login",login); localStorage.setItem("token",r.data.token); localStorage.setItem("user",JSON.stringify(r.data.user)); setUser(r.data.user); } catch { alert("Неверный логин или пароль"); } }
  if(!user) return <div className="login"><form onSubmit={doLogin}><h1>AutoHub CRM</h1><p>CRM холдинга автосалонов</p><input value={login.email} onChange={e=>setLogin({...login,email:e.target.value})}/><input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})}/><button>Войти</button></form></div>;

  return <div className="app">
    <aside><div className="logo">AutoHub <span>CRM</span></div>
      {["dashboard","leads","clients","credits","dealerships"].map(x=><button className={page===x?"active":""} onClick={()=>setPage(x)}>{({dashboard:"📊 Dashboard",leads:"🚗 Лиды",clients:"👤 Клиенты",credits:"💳 Кредиты",dealerships:"🏢 Автосалоны"} as any)[x]}</button>)}
      <div className="profile">{user.name}<small>{user.role}</small><button onClick={()=>{localStorage.clear();setUser(null)}}>Выйти</button></div>
    </aside>
    <main><header><div><h2>{{dashboard:"Dashboard",leads:"Лиды",clients:"Клиенты",credits:"Кредитные заявки",dealerships:"Автосалоны"} as any}[page]}</h2><span>Единая CRM холдинга</span></div><button className="primary" onClick={()=>alert("Форма создания будет расширена в следующем спринте")}>+ Создать</button></header>
      {page==="dashboard" && <Dashboard d={data}/>}
      {page==="leads" && <Leads data={data} reload={load}/>}
      {page==="clients" && <Clients data={data}/>}
      {page==="credits" && <Credits data={data} reload={load}/>}
      {page==="dealerships" && <Dealerships data={data}/>}
    </main>
  </div>
}

function Dashboard({d}:any){return <><div className="cards">{[["Клиенты",d.clients,"👤"],["Лиды",d.leads,"🚗"],["Визиты",d.visits,"📅"],["Кредиты",d.credits,"💳"],["Продажи",d.sold,"✅"]].map(c=><div className="card"><span>{c[2]}</span><small>{c[0]}</small><b>{c[1]??0}</b></div>)}</div><div className="panel"><h3>Быстрый сценарий колл-центра</h3><p>Телефон → поиск/создание клиента → лид → квалификация → «На визит» → автосалон → отдел → дата/время → уведомление менеджеру.</p></div></>}

function Leads({data,reload}:any){return <div className="panel"><div className="toolbar"><input placeholder="Поиск по клиенту или телефону"/><select><option>Все статусы</option>{Object.entries(statusNames).map(([k,v])=><option value={k}>{v as any}</option>)}</select></div><table><thead><tr><th>ID</th><th>Клиент</th><th>Автомобиль</th><th>Статус</th><th>Салон</th><th>Визит</th><th></th></tr></thead><tbody>{(data||[]).map((l:any)=><tr><td>#{l.id}</td><td><b>{l.client.firstName} {l.client.lastName||""}</b><small>{l.client.phone}</small></td><td>{l.carMake} {l.carModel}<small>{l.carYear||""}</small></td><td><span className="badge">{statusNames[l.status]}</span></td><td>{l.dealership?.name||"—"}</td><td>{l.visit?new Date(l.visit.visitAt).toLocaleString():"—"}</td><td><select value={l.status} onChange={async e=>{await api.patch(`/leads/${l.id}/status`,{status:e.target.value});reload()}}>{Object.entries(statusNames).map(([k,v])=><option value={k}>{v as any}</option>)}</select></td></tr>)}</tbody></table></div>}

function Clients({data}:any){return <div className="panel"><table><thead><tr><th>ID</th><th>Клиент</th><th>Телефон</th><th>Лидов</th><th>Создан</th></tr></thead><tbody>{(data||[]).map((c:any)=><tr><td>#{c.id}</td><td><b>{c.firstName} {c.lastName||""}</b></td><td>{c.phone}</td><td>{c._count.leads}</td><td>{new Date(c.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>}

function Credits({data,reload}:any){return <div className="panel"><table><thead><tr><th>ID</th><th>Клиент</th><th>Банк</th><th>Сумма</th><th>Статус</th><th></th></tr></thead><tbody>{(data||[]).map((c:any)=><tr><td>#{c.id}</td><td>{c.client.firstName} {c.client.lastName||""}<small>{c.client.phone}</small></td><td>{c.bank||"—"}</td><td>{c.amount?c.amount.toLocaleString()+" ₽":"—"}</td><td><span className="badge">{creditNames[c.status]}</span></td><td><select value={c.status} onChange={async e=>{await api.patch(`/credit-applications/${c.id}/status`,{status:e.target.value});reload()}}>{Object.entries(creditNames).map(([k,v])=><option value={k}>{v as any}</option>)}</select></td></tr>)}</tbody></table></div>}

function Dealerships({data}:any){return <div className="grid">{(data||[]).map((d:any)=><div className="panel"><h3>🏢 {d.name}</h3><p>{d.address}</p><p>{d.phone}</p><h4>Отделы</h4>{d.departments.map((x:any)=><div className="dept">{x.name}</div>)}</div>)}</div>}

createRoot(document.getElementById("root")!).render(<App/>);
