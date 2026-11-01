import {identity,getState,mutate} from "@/lib/server-game";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","Content-Type":"application/json; charset=utf-8"};
function error(e:any){return Response.json({error:e.status?e.message:"Bir bağlantı sorunu oluştu. Lütfen yeniden dene."},{status:e.status||500,headers})}
export async function GET(request:Request){try{return Response.json(await getState(identity(request)),{headers})}catch(e){console.error("game:get",(e as Error).message);return error(e)}}
export async function POST(request:Request){try{const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Bu istek kabul edilmedi."},{status:403,headers});if(Number(request.headers.get("content-length")||0)>10000)return Response.json({error:"İstek çok büyük."},{status:413,headers});const id=identity(request),body=await request.json();return Response.json(await mutate(id,body),{headers})}catch(e){console.error("game:post",(e as Error).message);return error(e)}}
