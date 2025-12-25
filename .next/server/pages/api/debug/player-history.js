"use strict";(()=>{var e={};e.id=934,e.ids=[934],e.modules={2885:e=>{e.exports=require("@supabase/supabase-js")},145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},6249:(e,t)=>{Object.defineProperty(t,"l",{enumerable:!0,get:function(){return function e(t,r){return r in t?t[r]:"then"in t&&"function"==typeof t.then?t.then(t=>e(t,r)):"function"==typeof t&&"default"===r?t:void 0}}})},3877:(e,t,r)=>{r.r(t),r.d(t,{config:()=>p,default:()=>c,routeModule:()=>g});var o={};r.r(o),r.d(o,{default:()=>u});var a=r(1802),n=r(7153),s=r(6249),i=r(2885),l=r(7274);let d=(0,i.createClient)(process.env.SUPABASE_URL,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhY2xsand2c2ljZXpta2pubGJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDAyOTc3MiwiZXhwIjoyMDU5NjA1NzcyfQ.qAwl1_vgAK8qMv44dOWPoZ6u_w5PqwGEdRmOgXeKJbY"),u=(0,l.o)(async function(e,t){if("GET"!==e.method)return t.status(405).json({error:"Method not allowed"});let{player_id:r,months:o=2}=e.query;if(!r)return t.status(400).json({error:"Player ID is required"});try{console.log("[DEBUG] Player history debug for:",r);let e=new Date,a=new Date;a.setMonth(e.getMonth()-parseInt(o)),console.log("[DEBUG] Date range:",{start:a.toISOString().split("T")[0],end:e.toISOString().split("T")[0]});let{data:n,error:s}=await d.from("players").select("id, display_name").eq("id",r).single();console.log("[DEBUG] Player lookup:",{playerData:n,playerError:s});let{data:i,error:l}=await d.from("leaderboard_summary").select(`
        date,
        rank,
        was_top_10,
        best_time,
        guesses_used,
        word_id,
        words (
          word,
          date
        )
      `).eq("player_id",r).gte("date",a.toISOString().split("T")[0]).lte("date",e.toISOString().split("T")[0]).order("date",{ascending:!0});console.log("[DEBUG] Leaderboard query result:",{count:i?.length||0,error:l,sampleData:i?.slice(0,2)});let{data:u,error:c}=await d.from("game_sessions").select(`
        start_time,
        end_time,
        is_complete,
        is_won,
        guesses_used,
        word_id,
        words (
          word,
          date
        )
      `).eq("player_id",r).eq("is_complete",!0).gte("start_time",a.toISOString()).lte("start_time",e.toISOString()).order("start_time",{ascending:!0});console.log("[DEBUG] Game sessions query result:",{count:u?.length||0,error:c,sampleData:u?.slice(0,2)});let{data:p,error:g}=await d.from("leaderboard_summary").select("date, rank, word_id").eq("player_id",r).order("date",{ascending:!1}).limit(5);return console.log("[DEBUG] Recent leaderboard activity:",{count:p?.length||0,error:g,data:p}),t.status(200).json({debug:!0,player_id:r,dateRange:{start:a.toISOString().split("T")[0],end:e.toISOString().split("T")[0]},player:n,leaderboard:{count:i?.length||0,error:l,data:i},gameSessions:{count:u?.length||0,error:c,data:u},recentActivity:{count:p?.length||0,error:g,data:p}})}catch(e){return console.error("[DEBUG] Unexpected error:",e),t.status(500).json({error:"Internal server error",details:e instanceof Error?e.message:"Unknown error"})}}),c=(0,s.l)(o,"default"),p=(0,s.l)(o,"config"),g=new a.PagesAPIRouteModule({definition:{kind:n.x.PAGES_API,page:"/api/debug/player-history",pathname:"/api/debug/player-history",bundlePath:"",filename:""},userland:o})},7274:(e,t,r)=>{r.d(t,{o:()=>o});function o(e){return async(t,r)=>{if(r.setHeader("Access-Control-Allow-Origin","*"),r.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS"),r.setHeader("Access-Control-Allow-Headers","Content-Type, Player-ID, Authorization"),"OPTIONS"===t.method){r.status(204).end();return}return e(t,r)}}},7153:(e,t)=>{var r;Object.defineProperty(t,"x",{enumerable:!0,get:function(){return r}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(r||(r={}))},1802:(e,t,r)=>{e.exports=r(145)}};var t=require("../../../webpack-api-runtime.js");t.C(e);var r=t(t.s=3877);module.exports=r})();