// AI research supplements official ballot information; it never certifies a ballot.
const reply=(status,obj)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const trim=(x,max=200)=>String(x||'').trim().slice(0,max);
const states=new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WI WV WY'.split(' '));
function extractLocation(input){
  const city=trim(input.city,80); const state=trim(input.state,2).toUpperCase();
  if(!city||!states.has(state))return null;
  return {city,state};
}
function cleanSources(output){
  const arr=[];const seen=new Set();
  for(const item of output||[])if(item.type==='message')for(const content of item.content||[])for(const a of content.annotations||[]){
    if(a.type!=='url_citation'||!a.url)continue;
    try{const u=new URL(a.url);if(u.protocol!=='https:'||seen.has(u.href))continue;seen.add(u.href);arr.push({title:trim(a.title||u.hostname,140),url:u.href});}catch{}
  }
  return arr.slice(0,20);
}
function parseObject(response){
  const content=(response.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n').trim();
  try{return JSON.parse(content)}catch{}
  const start=content.indexOf('{');const end=content.lastIndexOf('}');
  if(start>=0&&end>start)try{return JSON.parse(content.slice(start,end+1))}catch{}
  throw new Error('Research provider did not return structured results. Please retry.');
}
export default async(request)=>{
  if(request.method!=='POST')return reply(405,{error:'Use POST.'});
  if(!process.env.OPENAI_API_KEY)return reply(503,{error:'OPENAI_API_KEY is not configured in Netlify Functions.'});
  let p;try{p=await request.json()}catch{return reply(400,{error:'Invalid request JSON.'})}
  const location=extractLocation(p||{});
  const kind=p?.mode==='ballot'?'ballot':p?.mode==='detail'?'detail':null;
  if(!kind||!location)return reply(400,{error:'Choose a research mode and include city and two-letter state.'});
  const election=trim(p.election,120);const date=trim(p.date,10);
  if(!election||!/^(20\d{2}-\d\d-\d\d)$/.test(date))return reply(400,{error:'A valid election name and date are required.'});
  const topic=trim(p.topic,160);const people=Array.isArray(p.people)?p.people.slice(0,12).map(v=>trim(v,90)):[];
  if(kind==='detail'&&!topic)return reply(400,{error:'Missing contest or measure name.'});
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),47000);
  const instructions=`You are a nonpartisan US election research assistant. Research with LIVE web search and include sources. Today is ${new Date().toISOString().slice(0,10)}. Never invent a candidate, office, ballot question, election date, or voter district. A city/state DOES NOT determine the user's street-specific ballot. Search for official election authority documents first and supplement with neutral reputable sources. Distinguish what has been confirmed from uncertain leads. If there is no verifiable evidence, return an empty findings array and explain what is missing. Never advise how to vote, rank candidates, personalize political persuasion, or make unsupported partisan claims. Return ONLY a JSON object, no markdown or code fences. Keep descriptions plain-language, concise, balanced and factual. For each finding include a source URL if one is available. Do not fabricate URLs. The website will additionally display citation URLs from the search tool.`;
  const prompt=kind==='ballot'
    ?`Research election: ${election}, date ${date}, location ${location.city}, ${location.state}, USA. Find credible official sample ballot or election authority link(s) for the city. Find a few plausible county/city/state-wide contests or measures for this election, ONLY IF documented online; do not claim these are on the specific voter's ballot. Avoid congressional, legislative, ward, precinct and judicial district assertions unless district is expressly provided. Return JSON shape {"summary":"...","findings":[{"title":"...","kind":"race or measure","description":"...","sourceUrl":"https://... or empty string","confidence":"documented or uncertain"}],"verification":"..."}. Maximum 8 findings. Explicitly say these are research leads, NOT the user's verified ballot.`
    :`Research election: ${election}, date ${date}, location ${location.city}, ${location.state}, USA. Topic: ${topic}. Candidates already shown by election feed: ${people.join('; ')||'none listed'}. Summarize verified background, experience, salient public positions for named candidates (if any) and/or neutral explanations and arguments about the named measure. Do not guess which people are running. Return JSON shape {"summary":"...","findings":[{"title":"candidate or measure topic","kind":"candidate or measure","description":"neutral grounded summary","sourceUrl":"https://... or empty string","confidence":"documented or uncertain"}],"verification":"..."}. Maximum 8 findings. Attribute positions to sources where possible. No endorsements or voting recommendations.`;
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',tools:[{type:'web_search',search_context_size:'medium'}],tool_choice:'required',instructions,input:prompt,max_output_tokens:1600})});
    const raw=await r.json().catch(()=>({}));
    if(!r.ok)return reply(r.status===429?429:502,{error:r.status===429?'OpenAI rate limit exceeded. Try again shortly.':`OpenAI request failed: ${trim(raw.error?.message||r.status,220)}`});
    const parsed=parseObject(raw);
    const findings=Array.isArray(parsed.findings)?parsed.findings.slice(0,8).map(f=>({title:trim(f.title,140),kind:trim(f.kind,30),description:trim(f.description,900),sourceUrl:/^https:\/\//i.test(f.sourceUrl||'')?trim(f.sourceUrl,800):'',confidence:f.confidence==='documented'?'documented':'uncertain'})).filter(f=>f.title):[];
    return reply(200,{mode:kind,summary:trim(parsed.summary,1300),findings,verification:trim(parsed.verification,900),sources:cleanSources(raw.output),asOf:new Date().toISOString(),disclaimer:'AI-assisted research, not a verified personalized ballot. Check your official sample ballot before voting.'});
  }catch(e){return reply(502,{error:e.name==='AbortError'?'Research timed out. Please retry.':trim(e.message,260)})}finally{clearTimeout(timeout)}
};
