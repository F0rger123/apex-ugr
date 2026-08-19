import { create } from 'zustand';
import { cloudflareApi } from '../../config/cloudflareApi';

export type LivePost = { id:string; userId:string; alias:string; avatarUrl:string|null; mediaUrl:string; videoUrl:string|null; caption:string; likes:number; comments:number; liked:boolean; saved:boolean; following:boolean; createdAt:string };
export type Ranking = { id:string; alias:string; avatarUrl:string|null; tier:string; points:number; wins:number; losses:number; entered:number; topSpeed:number; reputation:number; credits:number };
export type ActiveVehicle = { id:string; nickname:string; year:number; make:string; model:string; trim:string|null; engine:string; drivetrain:string; horsepower:number; color:string; photoUrl:string|null;digitalTwinUrl:string|null;digitalTwinStatus:string };
export type ProviderProduct = { id:string; provider:string; title:string; imageUrl:string|null; price:number; currency:string; condition:string|null; seller:string|null; shipping:string|null; purchaseUrl:string; compatibility:string };
export type ProviderLink = { name:string; mode:string; url?:string };
export type PilotDirectoryEntry={id:string;alias:string;avatarUrl:string|null;tier:'Bronze'|'Silver'|'Master'|'Platinum';points:number;wins:number;losses:number;reputation:number;vehicle:string|null;photoUrl:string|null;latitude:number|null;longitude:number|null;speedKph:number;driveMode:boolean};
export type RaceContract={id:string;challengerId:string;challengerName:string;raceType:string;raceMode:'challenge'|'route'|'relay';routeName:string;route:Array<{name:string;latitude:number;longitude:number}>;startsAt:string;wagerCredits:number;prizePool:number;status:string;rescheduleCount:number;isChallenger:boolean;participants:Array<{userId:string;status:string;username:string;tier:string;reputation:number}>;entries:Array<{userId:string;username:string;status:string;currentCheckpoint:number;place:number|null;payoutCredits:number}>;checkpoints:Array<{id:string;stopOrder:number;label:string;latitude:number;longitude:number;assignedUserId:string|null}>};

interface ContentState {
  userId:string|null;
  profile:{alias:string;displayName:string;credits:number;points:number;tier:string;wins:number;entered:number;reputation:number;isDeveloper:boolean}|null;
  posts:LivePost[]; rankings:Ranking[]; pilots:PilotDirectoryEntry[]; races:RaceContract[]; vehicles:ActiveVehicle[]; activeVehicleId:string|null; challengeTargetId:string|null; radarTargetId:string|null;
  products:ProviderProduct[]; providers:ProviderLink[]; loading:boolean; error:string|null;
  initialize:()=>Promise<void>; loadFeed:()=>Promise<void>; toggleLike:(id:string)=>Promise<void>; toggleSave:(id:string)=>Promise<void>; toggleFollow:(userId:string)=>Promise<void>;
  addComment:(id:string,text:string)=>Promise<boolean>; createPost:(uri:string,caption:string,type:'photo'|'video')=>Promise<boolean>; updateProfile:(displayName:string)=>Promise<boolean>;
  loadRankings:()=>Promise<void>; loadPilots:()=>Promise<void>; loadRaces:()=>Promise<void>; respondToRace:(id:string,action:'accept'|'decline'|'reschedule',startsAt?:string)=>Promise<string>; startRace:(id:string)=>Promise<string>; checkRace:(id:string,location:{latitude:number;longitude:number;accuracy:number|null})=>Promise<string>; setChallengeTarget:(id:string|null)=>void; setRadarTarget:(id:string|null)=>void; loadVehicles:()=>Promise<void>; addVehicle:(vehicle:{nickname:string;year:number;make:string;model:string;trim:string;engine:string;drivetrain:string;horsepower:number;color:string},photoUri:string|null)=>Promise<boolean>; setActiveVehicle:(id:string)=>void; searchParts:(query:string)=>Promise<void>;
}

export const useContentStore=create<ContentState>((set,get)=>({
  userId:null,profile:null,posts:[],rankings:[],pilots:[],races:[],vehicles:[],activeVehicleId:null,challengeTargetId:null,radarTargetId:null,products:[],providers:[],loading:false,error:null,
  initialize:async()=>{
    const session=await cloudflareApi.session();
    if(!session){set({userId:null,profile:null,posts:[],rankings:[],vehicles:[]});return;}
    const user=session.user;
    set({userId:user.id,profile:{alias:user.username,displayName:user.displayName,credits:user.credits,points:user.points,tier:user.tier,wins:user.wins,entered:user.wins+user.losses,reputation:user.reputation,isDeveloper:Boolean(user.isDeveloper)},error:null});
    await Promise.all([get().loadFeed(),get().loadRankings(),get().loadPilots(),get().loadRaces(),get().loadVehicles()]);
  },
  loadFeed:async()=>{
    if(!get().userId)return;
    try{
      const data=await cloudflareApi.request<{posts:any[]}>('/api/feed');
      set({posts:data.posts.map(row=>({id:row.id,userId:row.user_id,alias:row.username,avatarUrl:row.avatar_url||null,mediaUrl:row.media_url,videoUrl:row.media_type==='video'?row.media_url:null,caption:row.caption||'',likes:Number(row.likes||0),comments:Number(row.comments||0),liked:Boolean(row.liked),saved:Boolean(row.saved),following:Boolean(row.following),createdAt:row.created_at}))});
    }catch(error){set({error:error instanceof Error?error.message:'Feed failed'});}
  },
  toggleLike:async id=>{
    try{const data=await cloudflareApi.request<{active:boolean}>(`/api/posts/${id}/like`,{method:'POST'});set(state=>({posts:state.posts.map(post=>post.id===id?{...post,liked:data.active,likes:Math.max(0,post.likes+(data.active?1:-1))}:post)}));}catch(error){set({error:error instanceof Error?error.message:'Like failed'});}
  },
  toggleSave:async id=>{
    try{const data=await cloudflareApi.request<{active:boolean}>(`/api/posts/${id}/save`,{method:'POST'});set(state=>({posts:state.posts.map(post=>post.id===id?{...post,saved:data.active}:post)}));}catch(error){set({error:error instanceof Error?error.message:'Save failed'});}
  },
  toggleFollow:async userId=>{try{const data=await cloudflareApi.request<{following:boolean}>(`/api/users/${userId}/follow`,{method:'POST'});set(state=>({posts:state.posts.map(post=>post.userId===userId?{...post,following:data.following}:post)}));}catch(error){set({error:error instanceof Error?error.message:'Follow failed'});}},
  addComment:async(id,text)=>{
    try{await cloudflareApi.request(`/api/posts/${id}/comment`,{method:'POST',body:JSON.stringify({body:text})});set(state=>({posts:state.posts.map(post=>post.id===id?{...post,comments:post.comments+1}:post)}));return true;}catch(error){set({error:error instanceof Error?error.message:'Comment failed'});return false;}
  },
  createPost:async(uri,caption,type)=>{
    set({loading:true,error:null});
    try{const upload=await cloudflareApi.upload(uri,type);await cloudflareApi.request('/api/posts',{method:'POST',body:JSON.stringify({mediaUrl:upload.url,mediaType:type,caption})});await get().loadFeed();set({loading:false});return true;}catch(error){set({loading:false,error:error instanceof Error?error.message:'Upload failed'});return false;}
  },
  updateProfile:async displayName=>{
    try{const data=await cloudflareApi.request<{user:any}>('/api/profile',{method:'PUT',body:JSON.stringify({displayName})});const user=data.user;set(state=>({profile:state.profile?{...state.profile,displayName:user.displayName}:state.profile}));return true;}catch(error){set({error:error instanceof Error?error.message:'Profile update failed'});return false;}
  },
  loadRankings:async()=>{
    if(!get().userId)return;
    try{const data=await cloudflareApi.request<{rankings:any[]}>('/api/leaderboard');set({rankings:data.rankings.map(row=>({id:row.id,alias:row.username,avatarUrl:row.avatar_url||null,tier:row.tier||'Bronze',points:Number(row.points||0),wins:Number(row.wins||0),losses:Number(row.losses||0),entered:Number(row.entered||0),topSpeed:Number(row.top_speed_kph||0),reputation:Number(row.reputation||1000),credits:Number(row.credits||0)}))});}catch(error){set({error:error instanceof Error?error.message:'Rankings failed'});}
  },
  loadPilots:async()=>{
    if(!get().userId)return;
    try{const data=await cloudflareApi.request<{pilots:any[]}>('/api/pilots');set({pilots:data.pilots.map(row=>({id:row.id,alias:row.username,avatarUrl:row.avatar_url||null,tier:['Bronze','Silver','Master','Platinum'].includes(row.tier)?row.tier:'Bronze',points:Number(row.points||0),wins:Number(row.wins||0),losses:Number(row.losses||0),reputation:Number(row.reputation||1000),vehicle:row.make?`${row.year} ${row.make} ${row.model}`:null,photoUrl:row.photo_url||null,latitude:row.latitude===null?null:Number(row.latitude),longitude:row.longitude===null?null:Number(row.longitude),speedKph:Number(row.speed_kph||0),driveMode:Boolean(row.drive_mode)}))});}catch(error){set({error:error instanceof Error?error.message:'Pilot directory failed'});}
  },
  loadRaces:async()=>{
    if(!get().userId)return;
    try{const data=await cloudflareApi.request<{races:any[]}>('/api/races');set({races:data.races.map(row=>({id:row.id,challengerId:row.challenger_id,challengerName:row.challenger_name,raceType:row.race_type,raceMode:row.race_mode||'challenge',routeName:row.route_name,route:row.route||[],startsAt:row.starts_at,wagerCredits:Number(row.wager_credits||0),prizePool:Number(row.prize_pool||0),status:row.status,rescheduleCount:Number(row.reschedule_count||0),isChallenger:Boolean(row.is_challenger),participants:(row.participants||[]).map((pilot:any)=>({userId:pilot.user_id,status:pilot.status,username:pilot.username,tier:pilot.tier,reputation:Number(pilot.reputation||1000)})),entries:(row.entries||[]).map((entry:any)=>({userId:entry.user_id,username:entry.username,status:entry.status,currentCheckpoint:Number(entry.current_checkpoint||0),place:entry.place===null?null:Number(entry.place),payoutCredits:Number(entry.payout_credits||0)})),checkpoints:(row.checkpoints||[]).map((point:any)=>({id:point.id,stopOrder:Number(point.stop_order),label:point.label,latitude:Number(point.latitude),longitude:Number(point.longitude),assignedUserId:point.assigned_user_id||null}))}))});}catch(error){set({error:error instanceof Error?error.message:'Race inbox failed'});}
  },
  respondToRace:async(id,action,startsAt)=>{try{const data=await cloudflareApi.request<{status:string;reputationPenalty?:number}>(`/api/races/${id}/${action}`,{method:'POST',body:JSON.stringify(startsAt?{startsAt}:{})});await Promise.all([get().loadRaces(),get().loadRankings()]);return data.reputationPenalty?`${data.status} · -${data.reputationPenalty} reputation`:data.status;}catch(error){const message=error instanceof Error?error.message:'Race update failed';set({error:message});return message;}},
  startRace:async id=>{try{const data=await cloudflareApi.request<{status:string}>(`/api/races/${id}/start`,{method:'POST'});await get().loadRaces();return data.status;}catch(error){const message=error instanceof Error?error.message:'Race launch failed';set({error:message});return message;}},
  checkRace:async(id,location)=>{try{const data=await cloudflareApi.request<{complete:boolean;checkpoint:number;place?:number;payoutCredits?:number;relay?:boolean}>(`/api/races/${id}/checkpoint`,{method:'POST',body:JSON.stringify(location)});await Promise.all([get().loadRaces(),get().loadRankings()]);return data.complete?(data.relay?'RELAY COMPLETE · +100 RP':`P${data.place} · +${data.payoutCredits||0} ACR`):`${data.relay?'RELAY ':''}CHECKPOINT ${data.checkpoint}`;}catch(error){const message=error instanceof Error?error.message:'Checkpoint failed';set({error:message});return message;}},
  setChallengeTarget:id=>set({challengeTargetId:id}),
  setRadarTarget:id=>set({radarTargetId:id}),
  loadVehicles:async()=>{
    if(!get().userId)return;
    try{const data=await cloudflareApi.request<{vehicles:any[]}>('/api/vehicles');const vehicles=data.vehicles.map(row=>({id:row.id,nickname:row.nickname,year:Number(row.year),make:row.make,model:row.model,trim:row.trim||null,engine:row.engine||'',drivetrain:row.drivetrain||'',horsepower:Number(row.horsepower||0),color:row.color||'',photoUrl:row.photo_url||null,digitalTwinUrl:row.digital_twin_url||null,digitalTwinStatus:row.digital_twin_status||'not_started'}));const activeRow=data.vehicles.find(row=>Boolean(row.is_active));set({vehicles,activeVehicleId:activeRow?.id||vehicles[0]?.id||null});}catch(error){set({error:error instanceof Error?error.message:'Garage failed'});}
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
