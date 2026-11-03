const BASE = 'https://www.googleapis.com/civicinfo/v2';
const json = (status, data) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8', 'cache-control':'no-store'}});
async function civic(path, params, key) {
  const url = new URL(BASE + path);
  Object.entries({...params, key}).forEach(([k,v]) => {if(v !== undefined && v !== null) url.searchParams.set(k,String(v));});
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 11000);
  try {
    const response=await fetch(url,{signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) { const message=data.error?.message || `Election data service returned ${response.status}`; throw new Error(message); }
    return data;
  } finally {clearTimeout(timer);}
}
function stateFromAddress(address) {
  const m=address.toUpperCase().match(/(?:,|\s)(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)(?:\s+\d{5}(?:-\d{4})?)?\s*$/);
  return m?.[1]?.toLowerCase() || null;
}
function matchDivision(e, state) {
  const division=(e.ocdDivisionId||'').toLowerCase();
  if(!state) return false;
  return division.includes(`state:${state}`);
}
export default async (request) => {
  if (request.method !== 'POST') return json(405,{error:'Use POST.'});
  const key=process.env.GOOGLE_CIVIC_API_KEY;
  if(!key) return json(503,{error:'This website has not yet been connected to election data. Set GOOGLE_CIVIC_API_KEY in Netlify environment variables.'});
  let payload;
  try {payload=await request.json();} catch {return json(400,{error:'Invalid request.'});}
  const address=String(payload.address||'').trim().replace(/\s+/g,' ');
  if(address.length<10 || address.length>240) return json(400,{error:'Enter a full US street address, including city, state, and ZIP code.'});
  try {
    let primary=null, notices=[];
    try { primary=await civic('/voterinfo',{address, returnAllAvailableData:true},key); }
    catch(e) {notices.push('No directly matched election was returned: '+e.message);}
    let responses=[];
    if(primary?.election?.id && primary.election.id !== '2000') responses.push(primary);
    const other=(primary?.otherElections||[]).filter(x=>x.id && x.id!=='2000');
    // Queries can be incomplete in the default response when overlapping elections occur.
    for(const election of other.slice(0,5)) {
      try {responses.push(await civic('/voterinfo',{address,electionId:election.id,returnAllAvailableData:true},key));}
      catch(e){notices.push(`Additional election ${election.name||election.id}: ${e.message}`);}
    }
    if(!responses.some(x=>Array.isArray(x.contests)&&x.contests.length)) {
      try {
        const list=await civic('/elections',{},key);
        const state=primary?.normalizedInput?.state?.toLowerCase()||stateFromAddress(address);
        const today=new Date().toISOString().slice(0,10);
        const eligible=(list.elections||[]).filter(e=>e.id!=='2000'&&e.electionDay>=today&&matchDivision(e,state)).sort((a,b)=>a.electionDay.localeCompare(b.electionDay)).slice(0,5);
        for(const e of eligible) {
          if(responses.some(r=>r.election?.id===e.id)) continue;
          try {responses.push(await civic('/voterinfo',{address,electionId:e.id,returnAllAvailableData:true},key));}
          catch(err){notices.push(`Could not retrieve ${e.name||'an election'}: ${err.message}`);}
        }
      } catch(e){notices.push('Upcoming election list was unavailable: '+e.message);}
    }
    const today=new Date().toISOString().slice(0,10);
    const elections=responses.filter(r=>r.election?.electionDay && r.election.electionDay>=today)
      .sort((a,b)=>a.election.electionDay.localeCompare(b.election.electionDay));
    const unique=[...new Map(elections.map(r=>[r.election.id,r])).values()];
    return json(200,{elections:unique, notices, source:'Google Civic Information API', asOf:new Date().toISOString()});
  } catch(e) {return json(502,{error:`Election data could not be loaded: ${e.message}`});}
};
