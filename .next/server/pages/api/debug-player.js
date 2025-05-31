"use strict";(()=>{var e={};e.id=88,e.ids=[88],e.modules={2885:e=>{e.exports=require("@supabase/supabase-js")},145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},9926:e=>{e.exports=import("zod")},6249:(e,r)=>{Object.defineProperty(r,"l",{enumerable:!0,get:function(){return function e(r,t){return t in r?r[t]:"then"in r&&"function"==typeof r.then?r.then(r=>e(r,t)):"function"==typeof r&&"default"===t?r:void 0}}})},1918:(e,r,t)=>{t.a(e,async(e,s)=>{try{t.r(r),t.d(r,{config:()=>c,default:()=>l,routeModule:()=>u});var a=t(1802),i=t(7153),n=t(6249),o=t(8267),d=e([o]);o=(d.then?(await d)():d)[0];let l=(0,n.l)(o,"default"),c=(0,n.l)(o,"config"),u=new a.PagesAPIRouteModule({definition:{kind:i.x.PAGES_API,page:"/api/debug-player",pathname:"/api/debug-player",bundlePath:"",filename:""},userland:o});s()}catch(e){s(e)}})},8267:(e,r,t)=>{t.a(e,async(e,s)=>{try{t.r(r),t.d(r,{default:()=>o});var a=t(2885),i=t(9085),n=e([i]);i=(n.then?(await n)():n)[0];let d=(0,a.createClient)(i.O.SUPABASE_URL,i.O.SUPABASE_SERVICE_ROLE_KEY);async function o(e,r){if("GET"!==e.method)return r.status(405).json({error:"Method not allowed"});let{playerId:t}=e.query;if(!t||"string"!=typeof t)return r.status(400).json({error:"playerId is required"});try{console.log("[/api/debug-player] Checking player:",t);let{data:e}=await d.from("players").select("*").eq("id",t).single(),{data:s}=await d.from("game_sessions").select(`
        id,
        word_id,
        is_complete,
        is_won,
        guesses_used,
        start_time,
        end_time,
        words (word, date)
      `).eq("player_id",t).order("start_time",{ascending:!1}).limit(10),{data:a}=await d.from("scores").select(`
        id,
        word_id,
        score,
        completion_time_seconds,
        guesses_used,
        correct,
        submitted_at,
        words (word, date)
      `).eq("player_id",t).order("submitted_at",{ascending:!1}).limit(10),{data:i}=await d.from("leaderboard_summary").select(`
        id,
        word_id,
        rank,
        best_time,
        guesses_used,
        date,
        words (word)
      `).eq("player_id",t).order("date",{ascending:!1}).limit(10),{data:n}=await d.from("user_stats").select("*").eq("player_id",t).single(),{data:o}=await d.from("words").select("*").eq("word","DEFINE").single(),l=null;if(o){let{data:e}=await d.from("game_sessions").select("*").eq("player_id",t).eq("word_id",o.id),{data:r}=await d.from("scores").select("*").eq("player_id",t).eq("word_id",o.id);l={sessions:e,scores:r}}return r.status(200).json({player:e,sessions:s,scores:a,leaderboard:i,stats:n,defineWord:o,defineCompletions:l,debug:{timestamp:new Date().toISOString(),playerId:t}})}catch(e){return console.error("[/api/debug-player] Error:",e),r.status(500).json({error:"Internal server error",message:e instanceof Error?e.message:"Unknown error"})}}s()}catch(e){s(e)}})},9085:(e,r,t)=>{t.a(e,async(e,s)=>{try{t.d(r,{O:()=>o});var a=t(9926),i=e([a]);let n=(a=(i.then?(await i)():i)[0]).z.object({SUPABASE_URL:a.z.string().url(),SUPABASE_SERVICE_ROLE_KEY:a.z.string(),SUPABASE_ANON_KEY:a.z.string(),DB_PROVIDER:a.z.literal("supabase"),NODE_ENV:a.z.enum(["development","production"]).default("production"),PORT:a.z.string().transform(Number).default("3001"),FRONTEND_URL:a.z.string().url().default("http://localhost:5173")}).safeParse({SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhY2xsand2c2ljZXpta2pubGJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDAyOTc3MiwiZXhwIjoyMDU5NjA1NzcyfQ.qAwl1_vgAK8qMv44dOWPoZ6u_w5PqwGEdRmOgXeKJbY",SUPABASE_ANON_KEY:process.env.SUPABASE_ANON_KEY,DB_PROVIDER:process.env.DB_PROVIDER,NODE_ENV:"production",PORT:process.env.PORT,FRONTEND_URL:process.env.FRONTEND_URL});if(!n.success)throw console.error("❌ Invalid environment variables:\n",Object.entries(n.error.flatten().fieldErrors).map(([e,r])=>`${e}: ${r?.join(", ")}`).join("\n")),Error("Invalid environment variables");let o=n.data;s()}catch(e){s(e)}})},7153:(e,r)=>{var t;Object.defineProperty(r,"x",{enumerable:!0,get:function(){return t}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(t||(t={}))},1802:(e,r,t)=>{e.exports=t(145)}};var r=require("../../webpack-api-runtime.js");r.C(e);var t=r(r.s=1918);module.exports=t})();