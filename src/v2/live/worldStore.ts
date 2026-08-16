import {create} from 'zustand';
import {cloudflareApi} from '../../config/cloudflareApi';

export type Discovery={latitude:number;longitude:number;discovered_at:string};
export type Territory={id:string;crew_id:string;crew_name:string;tag:string;name:string;latitude:number;longitude:number;radius_m:number;required_cells:number;unlocked:number};
export type DeadDrop={id:string;title:string;latitude:number;longitude:number;radius_m:number;credits:number;claimed:number};
export type RoadReport={id:string;type:'fixed_camera'|'hazard'|'closure'|'dangerous_road';note:string;latitude:number;longitude:number;username:string;created_at:string};
export type Crew={id:string;owner_id:string;name:string;tag:string;member_status:string|null;member_role:string|null;member_count:number};
export type CrewRequest={crew_id:string;user_id:string;username:string;avatar_url:string|null;created_at:string};
export type Season={id:string;name:string;starts_at:string;ends_at:string;status:string;reward_credits:number;points:number|null;joined:number};
export type SeasonJourney={id:string;season_id:string;title:string;description:string;route:Array<{name:string;latitude:number;longitude:number}>;distance_km:number;reward_credits:number;starts_at:string;ends_at:string;current_checkpoint:number|null;progress_status:string|null;joined:number};
export type SafeHouse={id:string;vehicle_id:string|null;name:string;latitude:number;longitude:number;created_at:string};
export type GameBadge={id:string;name:string;description:string;icon:string;reward_credits:number;earned:number;earned_at:string|null};
export type Contract={id:string;title:string;description:string;metric:string;target:number;reward_credits:number;badge_id:string|null;progress:number|null;progress_status:string|null;accepted_at:string|null;completed_at:string|null};
export type MapReward={id:string;title:string;latitude:number;longitude:number;radius_m:number;credits:number;expires_at:string;claimed:number};
export type GhostPoint={latitude:number;longitude:number;speed_kph:number;heading:number;captured_at:string};
export type GhostReplay={sessionId:string;startedAt:string;endedAt:string;distanceKm:number;maxSpeedKph:number;points:GhostPoint[]};

interface WorldState{discoveries:Discovery[];territories:Territory[];drops:DeadDrop[];reports:RoadReport[];crews:Crew[];crewRequests:CrewRequest[];seasons:Season[];journeys:SeasonJourney[];safeHouses:SafeHouse[];badges:GameBadge[];contracts:Contract[];rewards:MapReward[];ghostReplays:GhostReplay[];heat:number;loading:boolean;error:string|null;
  refresh:()=>Promise<void>;report:(type:RoadReport['type'],note:string,latitude:number,longitude:number)=>Promise<boolean>;createCrew:(name:string,tag:string)=>Promise<boolean>;joinCrew:(id:string)=>Promise<void>;approveMember:(crewId:string,userId:string)=>Promise<void>;createTerritory:(crewId:string,data:{name:string;latitude:number;longitude:number;radiusM:number;requiredCells:number})=>Promise<boolean>;joinSeason:(id:string)=>Promise<void>;joinJourney:(id:string)=>Promise<void>;checkJourney:(id:string,location:{latitude:number;longitude:number;accuracy:number|null})=>Promise<{complete:boolean;rewardCredits:number}|null>;createSafeHouse:(data:{name:string;latitude:number;longitude:number;vehicleId?:string|null})=>Promise<boolean>;deleteSafeHouse:(id:string)=>Promise<void>;acceptContract:(id:string)=>Promise<void>;
}

type WorldData=Pick<WorldState,'discoveries'|'territories'|'drops'|'reports'|'crews'|'crewRequests'|'seasons'|'journeys'|'safeHouses'|'badges'|'contracts'|'rewards'|'ghostReplays'|'heat'>;

export const useWorldStore=create<WorldState>((set,get)=>({discoveries:[],territories:[],drops:[],reports:[],crews:[],crewRequests:[],seasons:[],journeys:[],safeHouses:[],badges:[],contracts:[],rewards:[],ghostReplays:[],heat:0,loading:false,error:null,
  refresh:async()=>{set({loading:true});try{const data=await cloudflareApi.request<WorldData>('/api/world');set({...data,loading:false,error:null});}catch(error){set({loading:false,error:error instanceof Error?error.message:'World sync failed.'});}},
  report:async(type,note,latitude,longitude)=>{try{await cloudflareApi.request('/api/road-reports',{method:'POST',body:JSON.stringify({type,note,latitude,longitude})});await get().refresh();return true;}catch(error){set({error:error instanceof Error?error.message:'Safety report failed.'});return false;}},
  createCrew:async(name,tag)=>{try{await cloudflareApi.request('/api/crews',{method:'POST',body:JSON.stringify({name,tag})});await get().refresh();return true;}catch(error){set({error:error instanceof Error?error.message:'Crew creation failed.'});return false;}},
  joinCrew:async id=>{await cloudflareApi.request(`/api/crews/${id}/join`,{method:'POST'});await get().refresh();},
  approveMember:async(crewId,userId)=>{await cloudflareApi.request(`/api/crews/${crewId}/members/${userId}/approve`,{method:'POST'});await get().refresh();},
  createTerritory:async(crewId,data)=>{try{await cloudflareApi.request(`/api/crews/${crewId}/territories`,{method:'POST',body:JSON.stringify(data)});await get().refresh();return true;}catch(error){set({error:error instanceof Error?error.message:'Territory creation failed.'});return false;}},
  joinSeason:async id=>{await cloudflareApi.request(`/api/seasons/${id}/join`,{method:'POST'});await get().refresh();},
  joinJourney:async id=>{await cloudflareApi.request(`/api/journeys/${id}/join`,{method:'POST'});await get().refresh();},
  checkJourney:async(id,location)=>{try{const result=await cloudflareApi.request<{complete:boolean;rewardCredits:number}>(`/api/journeys/${id}/checkpoint`,{method:'POST',body:JSON.stringify(location)});await get().refresh();return result;}catch(error){set({error:error instanceof Error?error.message:'Journey checkpoint failed.'});return null;}},
  createSafeHouse:async data=>{try{await cloudflareApi.request('/api/safe-houses',{method:'POST',body:JSON.stringify(data)});await get().refresh();return true;}catch(error){set({error:error instanceof Error?error.message:'Safe-house registration failed.'});return false;}},
  deleteSafeHouse:async id=>{await cloudflareApi.request(`/api/safe-houses/${id}`,{method:'DELETE'});await get().refresh();},
  acceptContract:async id=>{await cloudflareApi.request(`/api/contracts/${id}/accept`,{method:'POST'});await get().refresh();},
}));
