import { create } from 'zustand';
import { cloudflareApi } from '../../config/cloudflareApi';

export type LivePost = { id:string; userId:string; alias:string; avatarUrl:string|null; mediaUrl:string; videoUrl:string|null; caption:string; likes:number; comments:number; liked:boolean; saved:boolean; createdAt:string };
export type Ranking = { id:string; alias:string; avatarUrl:string|null; tier:string; points:number; wins:number; entered:number; topSpeed:number };
export type ActiveVehicle = { id:string; nickname:string; year:number; make:string; model:string; trim:string|null; engine:string; drivetrain:string; horsepower:number; color:string; photoUrl:string|null };
export type ProviderProduct = { id:string; provider:string; title:string; imageUrl:string|null; price:number; currency:string; condition:string|null; seller:string|null; shipping:string|null; purchaseUrl:string; compatibility:string };
export type ProviderLink = { name:string; mode:string; url?:string };

interface ContentState {
  userId:string|null;
  profile:{alias:string;displayName:string;credits:number;points:number;tier:string;wins:number;entered:number}|null;
  posts:LivePost[]; rankings:Ranking[]; vehicles:ActiveVehicle[]; activeVehicleId:string|null;
  products:ProviderProduct[]; providers:ProviderLink[]; loading:boolean; error:string|null;
  initialize:()=>Promise<void>; loadFeed:()=>Promise<void>; toggleLike:(id:string)=>Promise<void>; toggleSave:(id:string)=>Promise<void>;
  addComment:(id:string,text:string)=>Promise<boolean>; createPost:(uri:string,caption:string,type:'photo'|'video')=>Promise<boolean>;
  loadRankings:()=>Promise<void>; loadVehicles:()=>Promise<void>; addVehicle:(vehicle:{nickname:string;year:number;make:string;model:string;trim:string;engine:string;drivetrain:string;horsepower:number;color:string},photoUri:string|null)=>Promise<boolean>; setActiveVehicle:(id:string)=>void; searchParts:(query:string)=>Promise<void>;
}

export const useContentStore=create<ContentState>((set,get)=>({
  userId:null,profile:null,posts:[],rankings:[],vehicles:[],activeVehicleId:null,products:[],providers:[],loading:false,error:null,
  initialize:async()=>{
    const session=await cloudflareApi.session();
    if(!session){set({userId:null,profile:null,posts:[],rankings:[],vehicles:[]});return;}
    const user=session.user;
    set({userId:user.id,profile:{alias:user.username,displayName:user.displayName,credits:user.credits,points:user.points,tier:user.tier,wins:user.wins,entered:user.wins+user.losses},error:null});
    await Promise.all([get().loadFeed(),get().loadRankings(),get().loadVehicles()]);
  },
  loadFeed:async()=>{
    if(!get().userId)return;
    try{
      const data=await cloudflareApi.request<{posts:any[]}>('/api/feed');
      set({posts:data.posts.map(row=>({id:row.id,userId:row.user_id,alias:row.username,avatarUrl:row.avatar_url||null,mediaUrl:row.media_url,videoUrl:row.media_type==='video'?row.media_url:null,caption:row.caption||'',likes:Number(row.likes||0),comments:Number(row.comments||0),liked:Boolean(row.liked),saved:Boolean(row.saved),createdAt:row.created_at}))});
    }catch(error){set({error:error instanceof Error?error.message:'Feed failed'});}
  },
  toggleLike:async id=>{
    try{const data=await cloudflareApi.request<{active:boolean}>(`/api/posts/${id}/like`,{method:'POST'});set(state=>({posts:state.posts.map(post=>post.id===id?{...post,liked:data.active,likes:Math.max(0,post.likes+(data.active?1:-1))}:post)}));}catch(error){set({error:error instanceof Error?error.message:'Like failed'});}
  },
  toggleSave:async id=>{
    try{const data=await cloudflareApi.request<{active:boolean}>(`/api/posts/${id}/save`,{method:'POST'});set(state=>({posts:state.posts.map(post=>post.id===id?{...post,saved:data.active}:post)}));}catch(error){set({error:error instanceof Error?error.message:'Save failed'});}
  },
  addComment:async(id,text)=>{
    try{await cloudflareApi.request(`/api/posts/${id}/comment`,{method:'POST',body:JSON.stringify({body:text})});set(state=>({posts:state.posts.map(post=>post.id===id?{...post,comments:post.comments+1}:post)}));return true;}catch(error){set({error:error instanceof Error?error.message:'Comment failed'});return false;}
  },
  createPost:async(uri,caption,type)=>{
    set({loading:true,error:null});
    try{const upload=await cloudflareApi.upload(uri,type);await cloudflareApi.request('/api/posts',{method:'POST',body:JSON.stringify({mediaUrl:upload.url,mediaType:type,caption})});await get().loadFeed();set({loading:false});return true;}catch(error){set({loading:false,error:error instanceof Error?error.message:'Upload failed'});return false;}
  },
  loadRankings:async()=>{
    if(!get().userId)return;
    try{const data=await cloudflareApi.request<{rankings:any[]}>('/api/leaderboard');set({rankings:data.rankings.map(row=>({id:row.id,alias:row.username,avatarUrl:row.avatar_url||null,tier:row.tier||'Bronze',points:Number(row.points||0),wins:Number(row.wins||0),entered:Number(row.entered||0),topSpeed:0}))});}catch(error){set({error:error instanceof Error?error.message:'Rankings failed'});}
  },
  loadVehicles:async()=>{
    if(!get().userId)return;
    try{const data=await cloudflareApi.request<{vehicles:any[]}>('/api/vehicles');const vehicles=data.vehicles.map(row=>({id:row.id,nickname:row.nickname,year:Number(row.year),make:row.make,model:row.model,trim:row.trim||null,engine:row.engine||'',drivetrain:row.drivetrain||'',horsepower:Number(row.horsepower||0),color:row.color||'',photoUrl:row.photo_url||null}));const activeRow=data.vehicles.find(row=>Boolean(row.is_active));set({vehicles,activeVehicleId:activeRow?.id||vehicles[0]?.id||null});}catch(error){set({error:error instanceof Error?error.message:'Garage failed'});}
  },
  addVehicle:async(vehicle,photoUri)=>{
    if(!get().userId){set({error:'Sign in before adding a vehicle.'});return false;}
    set({loading:true,error:null});
    try{const photoUrl=photoUri?(await cloudflareApi.upload(photoUri,'photo')).url:null;await cloudflareApi.request('/api/vehicles',{method:'POST',body:JSON.stringify({...vehicle,photoUrl})});await get().loadVehicles();set({loading:false});return true;}catch(error){set({loading:false,error:error instanceof Error?error.message:'Vehicle upload failed'});return false;}
  },
  setActiveVehicle:id=>{set({activeVehicleId:id,products:[],providers:[]});void cloudflareApi.request(`/api/vehicles/${id}/active`,{method:'POST'}).catch(()=>undefined);},
  searchParts:async query=>{
    const vehicle=get().vehicles.find(item=>item.id===get().activeVehicleId);
    if(!vehicle){set({error:'Add and select a vehicle before searching parts.'});return;}
    set({loading:true,error:null,products:[],providers:[]});
    try{const data=await cloudflareApi.request<{products:ProviderProduct[];providers:ProviderLink[]}>('/api/parts-search',{method:'POST',body:JSON.stringify({vehicle,query})});set({loading:false,products:data.products||[],providers:data.providers||[]});}catch(error){set({loading:false,error:error instanceof Error?error.message:'Parts search failed'});}
  },
}));
