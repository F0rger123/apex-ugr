import { create } from 'zustand';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudflareApi } from '../../config/cloudflareApi';
import {playInterfaceSound} from '../../utils/soundSynthesizer';

const LOCATION_KEY='apex.last-location';
const REVEAL_ORIGIN_KEY='apex.reveal-origin';

export type LiveCoordinate={latitude:number;longitude:number;accuracy:number|null;altitude:number|null;heading:number;speedKph:number;timestamp:number};
export type LiveDriver={id:string;userId:string;alias:string;avatarUrl:string|null;vehicle:string|null;latitude:number;longitude:number;heading:number;speedKph:number;driveMode:boolean;cruiseId:string|null;updatedAt:string;mystery:boolean;isLive:boolean;tier:'Bronze'|'Silver'|'Master'|'Platinum';record:string};
export type LiveEvent={id:string;hostId:string;title:string;latitude:number;longitude:number;radiusM:number;attendees:number;startTime:string;locationName:string};
export type LiveCruise={id:string;hostId:string;title:string;status:string;memberCount:number;maxMembers:number;destinationName:string;joined:boolean;route:LiveRoute|null};
export type RouteStop={name:string;latitude:number;longitude:number};
export type LiveRoute={destination:string;destinationLatitude:number;destinationLongitude:number;distanceKm:number;durationMinutes:number;coordinates:Array<{latitude:number;longitude:number}>;stops:RouteStop[]};
export type AddressSuggestion={id:string;name:string;latitude:number;longitude:number;type:string};
export type SavedPlace={id:string;label:string;location_name:string;latitude:number;longitude:number;is_favorite:number};
export type SavedRoute={id:string;name:string;destination_name:string;destination_latitude:number;destination_longitude:number;distance_km:number;duration_minutes:number;coordinates:LiveRoute['coordinates'];stops:RouteStop[]};
export type DriveSummary={sessionId:string;startedAt:string|null;endedAt:string|null;durationSeconds:number;distanceKm:number;maxSpeedKph:number;averageSpeedKph:number;points:LiveRoute['coordinates'];weeklyTopSpeedKph:number};
type NetworkStatus='offline'|'gps_required'|'gps_locked'|'auth_required'|'live'|'error';

interface LiveNetworkState{
  location:LiveCoordinate|null;revealOrigin:LiveCoordinate|null;drivers:LiveDriver[];events:LiveEvent[];cruises:LiveCruise[];route:LiveRoute|null;activeCruiseId:string|null;savedPlaces:SavedPlace[];savedRoutes:SavedRoute[];suggestions:AddressSuggestion[];networkStatus:NetworkStatus;error:string|null;isDriving:boolean;unit:'mph'|'kph';distanceKm:number;maxSpeedKph:number;startedAt:number|null;shareMinutes:number;shareExpiresAt:number|null;driveTrace:LiveRoute['coordinates'];lastDriveSummary:DriveSummary|null;weeklyTopSpeedKph:number;
  _watch:Location.LocationSubscription|null;_poll:ReturnType<typeof setInterval>|null;_userId:string|null;_driveSessionId:string|null;
  initialize:()=>Promise<void>;lockLocation:()=>Promise<void>;startDrive:()=>Promise<void>;stopDrive:()=>Promise<void>;toggleUnit:()=>void;setShareMinutes:(minutes:number)=>void;hideLocation:()=>Promise<void>;refreshNetwork:()=>Promise<void>;loadNavigation:()=>Promise<void>;suggestAddresses:(query:string)=>Promise<void>;setRoute:(destination:string)=>Promise<boolean>;setMultiStopRoute:(stops:RouteStop[])=>Promise<boolean>;setRouteToPoint:(name:string,latitude:number,longitude:number)=>Promise<boolean>;restoreRoute:(route:SavedRoute)=>void;createConvoy:(title:string,startsAt:string)=>Promise<boolean>;joinConvoy:(id:string)=>Promise<boolean>;startConvoy:(id:string)=>Promise<boolean>;saveCurrentRoute:(name?:string)=>Promise<boolean>;savePlace:(place:{label:string;locationName:string;latitude:number;longitude:number})=>Promise<boolean>;deletePlace:(id:string)=>Promise<void>;deleteSavedRoute:(id:string)=>Promise<void>;renameSavedRoute:(id:string,name:string)=>Promise<void>;clearDriveSummary:()=>void;clearRoute:()=>void;dispose:()=>void;
}

function segmentKm(a:LiveCoordinate,b:LiveCoordinate){const rad=Math.PI/180;const dLat=(b.latitude-a.latitude)*rad;const dLng=(b.longitude-a.longitude)*rad;const h=Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
function coordinate(position:Location.LocationObject):LiveCoordinate{return{latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,altitude:position.coords.altitude,heading:Math.max(0,position.coords.heading||0),speedKph:Math.max(0,(position.coords.speed||0)*3.6),timestamp:position.timestamp};}
async function publish(location:LiveCoordinate,driveMode:boolean,shareMinutes:number,shareExpiresAt:number,driveSessionId?:string|null,cruiseId?:string|null){const result=await cloudflareApi.request<{claimedRewards?:Array<{credits:number}>}>('/api/location',{method:'POST',body:JSON.stringify({latitude:location.latitude,longitude:location.longitude,accuracy:location.accuracy,altitude:location.altitude,speedKph:driveMode?location.speedKph:0,heading:location.heading,driveMode,driveSessionId,cruiseId,shareMinutes,expiresAt:new Date(shareExpiresAt).toISOString()})});if(result.claimedRewards?.length)playInterfaceSound('reward');return result;}

export const useLiveNetworkStore=create<LiveNetworkState>((set,get)=>({
  location:null,revealOrigin:null,drivers:[],events:[],cruises:[],route:null,activeCruiseId:null,savedPlaces:[],savedRoutes:[],suggestions:[],networkStatus:'offline',error:null,isDriving:false,unit:'mph',distanceKm:0,maxSpeedKph:0,startedAt:null,shareMinutes:15,shareExpiresAt:null,driveTrace:[],lastDriveSummary:null,weeklyTopSpeedKph:0,_watch:null,_poll:null,_userId:null,_driveSessionId:null,
  initialize:async()=>{
    get()._poll&&clearInterval(get()._poll!);
    const [session,cached,cachedOrigin]=await Promise.all([cloudflareApi.session(),AsyncStorage.getItem(LOCATION_KEY),AsyncStorage.getItem(REVEAL_ORIGIN_KEY)]);
    let location:LiveCoordinate|null=null,revealOrigin:LiveCoordinate|null=null;
    if(cached){try{const parsed=JSON.parse(cached) as LiveCoordinate;if(Number.isFinite(parsed.latitude)&&Number.isFinite(parsed.longitude))location=parsed;}catch{await AsyncStorage.removeItem(LOCATION_KEY);}}
    if(cachedOrigin){try{const parsed=JSON.parse(cachedOrigin) as LiveCoordinate;if(Number.isFinite(parsed.latitude)&&Number.isFinite(parsed.longitude))revealOrigin=parsed;}catch{await AsyncStorage.removeItem(REVEAL_ORIGIN_KEY);}}
    if(location)set({location,revealOrigin:revealOrigin||location});
    if(!session){set({_userId:null,networkStatus:'auth_required'});return;}
    set({_userId:session.user.id,networkStatus:'live',error:null});await Promise.all([get().refreshNetwork(),get().loadNavigation()]);
    const poll=setInterval(()=>{void get().refreshNetwork();},5000);set({_poll:poll});
  },
  lockLocation:async()=>{
    set({error:null});const permission=await Location.requestForegroundPermissionsAsync();
    if(permission.status!=='granted'){set({networkStatus:'gps_required',error:'Precise location permission is required for Radar and Drive Mode.'});return;}
    const next=coordinate(await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.BestForNavigation}));const shareExpiresAt=Date.now()+get().shareMinutes*60_000;const origin=get().revealOrigin||next;set({location:next,revealOrigin:origin,shareExpiresAt,networkStatus:get()._userId?'live':'gps_locked'});await Promise.all([AsyncStorage.setItem(LOCATION_KEY,JSON.stringify(next)),AsyncStorage.setItem(REVEAL_ORIGIN_KEY,JSON.stringify(origin))]);
    if(get()._userId) await publish(next,false,get().shareMinutes,shareExpiresAt).catch(error=>set({error:error instanceof Error?error.message:'Location publish failed'}));
  },
  startDrive:async()=>{
    if(get().isDriving)return;const permission=await Location.requestForegroundPermissionsAsync();
    if(permission.status!=='granted'){set({networkStatus:'gps_required',error:'Drive Mode cannot start without precise location access.'});return;}
    get()._watch?.remove();const initial=get().location||coordinate(await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.BestForNavigation}));const origin=get().revealOrigin||initial;const shareExpiresAt=Date.now()+get().shareMinutes*60_000,driveSessionId=`drive-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;playInterfaceSound('drive');set({location:initial,isDriving:true,revealOrigin:origin,distanceKm:0,maxSpeedKph:0,startedAt:Date.now(),shareExpiresAt,error:null,_driveSessionId:driveSessionId,driveTrace:[initial],lastDriveSummary:null});await Promise.all([AsyncStorage.setItem(LOCATION_KEY,JSON.stringify(initial)),AsyncStorage.setItem(REVEAL_ORIGIN_KEY,JSON.stringify(origin))]);
    if(get()._userId) void publish(initial,true,get().shareMinutes,shareExpiresAt,driveSessionId,get().activeCruiseId).catch(error=>set({error:error instanceof Error?error.message:'Live position failed'}));
    const watch=await Location.watchPositionAsync({accuracy:Location.Accuracy.BestForNavigation,timeInterval:500,distanceInterval:1},position=>{
      const next=coordinate(position);const previous=get().location;const distance=previous&&next.accuracy!==null&&next.accuracy<=65?segmentKm(previous,next):0;
      set(state=>{const last=state.driveTrace[state.driveTrace.length-1];const trace=last&&Math.abs(last.latitude-next.latitude)<.00001&&Math.abs(last.longitude-next.longitude)<.00001?state.driveTrace:[...state.driveTrace,{latitude:next.latitude,longitude:next.longitude}].slice(-1200);return{location:next,distanceKm:state.distanceKm+Math.min(distance,.5),maxSpeedKph:Math.max(state.maxSpeedKph,next.speedKph),networkStatus:state._userId?'live':'gps_locked',driveTrace:trace};});
      void AsyncStorage.setItem(LOCATION_KEY,JSON.stringify(next));
      if(Date.now()>shareExpiresAt){get()._watch?.remove();set({_watch:null,isDriving:false,shareExpiresAt:null,networkStatus:'gps_locked'});if(get()._userId)void cloudflareApi.request('/api/location',{method:'DELETE'});return;}
      if(get()._userId) void publish(next,true,get().shareMinutes,shareExpiresAt,driveSessionId,get().activeCruiseId).catch(error=>set({error:error instanceof Error?error.message:'Live position failed'}));
    });set({_watch:watch});
  },
  stopDrive:async()=>{
    const sessionId=get()._driveSessionId,localTrace=get().driveTrace,localDistance=get().distanceKm,localMax=get().maxSpeedKph,startedAt=get().startedAt;
    get()._watch?.remove();playInterfaceSound('toggle');set({_watch:null,isDriving:false,_driveSessionId:null});
    const current=get().location,expires=get().shareExpiresAt;
    if(current&&expires&&get()._userId)await publish(current,false,get().shareMinutes,expires,null,get().activeCruiseId).catch(()=>undefined);
    if(!sessionId||!get()._userId)return;
    try{
      const summary=await cloudflareApi.request<DriveSummary>(`/api/drives/summary?sessionId=${encodeURIComponent(sessionId)}`);
      set({lastDriveSummary:summary,weeklyTopSpeedKph:summary.weeklyTopSpeedKph,driveTrace:summary.points.length?summary.points:localTrace});
    }catch{
      set({lastDriveSummary:{sessionId,startedAt:startedAt?new Date(startedAt).toISOString():null,endedAt:new Date().toISOString(),durationSeconds:startedAt?Math.round((Date.now()-startedAt)/1000):0,distanceKm:localDistance,maxSpeedKph:localMax,averageSpeedKph:0,points:localTrace,weeklyTopSpeedKph:Math.max(get().weeklyTopSpeedKph,localMax)}});
    }
  },
  toggleUnit:()=>set(state=>({unit:state.unit==='mph'?'kph':'mph'})),
  setShareMinutes:minutes=>set({shareMinutes:Math.min(120,Math.max(5,minutes))}),
  hideLocation:async()=>{get()._watch?.remove();if(get()._userId)await cloudflareApi.request('/api/location',{method:'DELETE'});set({_watch:null,isDriving:false,shareExpiresAt:null,networkStatus:'gps_locked',error:null});},
  refreshNetwork:async()=>{
    if(!get()._userId)return;
    try{const data=await cloudflareApi.request<{drivers:any[];events:any[];cruises:any[]}>('/api/network');set({
      drivers:data.drivers.map(row=>({id:row.user_id,userId:row.user_id,alias:row.username||'UNKNOWN',avatarUrl:row.avatar_url||null,vehicle:row.make?`${row.year} ${row.make} ${row.model}`:null,latitude:Number(row.latitude),longitude:Number(row.longitude),heading:Number(row.heading||0),speedKph:Number(row.speed_kph||0),driveMode:Boolean(row.drive_mode),cruiseId:row.cruise_id||null,updatedAt:row.updated_at,mystery:row.privacy_mode==='meet_only',isLive:Boolean(row.is_live),tier:['Bronze','Silver','Master','Platinum'].includes(row.tier)?row.tier:'Bronze',record:`${Number(row.wins||0)}–${Number(row.losses||0)}`})),
      events:data.events.map(row=>({id:row.id,hostId:row.host_id,title:row.title,latitude:Number(row.latitude),longitude:Number(row.longitude),radiusM:Number(row.radius_m||250),attendees:Number(row.attendees||0),startTime:row.starts_at,locationName:row.location_name})),
      cruises:data.cruises.map(row=>({id:row.id,hostId:row.host_id,title:row.title,status:row.status,memberCount:Number(row.member_count||0),maxMembers:Number(row.max_members||12),destinationName:row.destination_name||'',joined:Boolean(row.joined),route:row.route?.coordinates?.length?row.route:null})),error:null});
    }catch(error){set({networkStatus:'error',error:error instanceof Error?error.message:'Network refresh failed'});}
  },
  loadNavigation:async()=>{if(!get()._userId)return;try{const data=await cloudflareApi.request<{places:SavedPlace[];routes:SavedRoute[]}>('/api/navigation');set({savedPlaces:data.places||[],savedRoutes:data.routes||[]});}catch(error){set({error:error instanceof Error?error.message:'Saved navigation failed'});}},
  suggestAddresses:async query=>{if(query.trim().length<3){set({suggestions:[]});return;}try{const origin=get().location,near=origin?`&latitude=${origin.latitude}&longitude=${origin.longitude}`:'';const data=await cloudflareApi.request<{suggestions:AddressSuggestion[]}>(`/api/address-suggestions?q=${encodeURIComponent(query.trim())}${near}`);set({suggestions:data.suggestions||[]});}catch{set({suggestions:[]});}},
  setRoute:async destination=>{
    const origin=get().location;if(!origin){set({error:'Lock GPS before setting a route.'});return false;}
    try{const data=await cloudflareApi.request<{destination:{name:string;latitude:number;longitude:number};stops?:RouteStop[];distanceKm:number;durationMinutes:number;coordinates:LiveRoute['coordinates']}>('/api/routes',{method:'POST',body:JSON.stringify({origin,destination})});set({route:{destination:data.destination.name,destinationLatitude:data.destination.latitude,destinationLongitude:data.destination.longitude,distanceKm:data.distanceKm,durationMinutes:data.durationMinutes,coordinates:data.coordinates,stops:data.stops||[data.destination]},suggestions:[],error:null});return true;}catch(error){set({error:error instanceof Error?error.message:'Route failed'});return false;}
  },
  setMultiStopRoute:async stops=>{const origin=get().location;if(!origin){set({error:'Lock GPS before building an itinerary.'});return false;}if(!stops.length){set({error:'Add at least one stop.'});return false;}try{const data=await cloudflareApi.request<{destination:RouteStop;stops:RouteStop[];distanceKm:number;durationMinutes:number;coordinates:LiveRoute['coordinates']}>('/api/routes',{method:'POST',body:JSON.stringify({origin,stops})});set({route:{destination:data.destination.name,destinationLatitude:data.destination.latitude,destinationLongitude:data.destination.longitude,distanceKm:data.distanceKm,durationMinutes:data.durationMinutes,coordinates:data.coordinates,stops:data.stops},suggestions:[],error:null});return true;}catch(error){set({error:error instanceof Error?error.message:'Itinerary failed'});return false;}},
  setRouteToPoint:async(name,latitude,longitude)=>{const origin=get().location;if(!origin){set({error:'Lock GPS before routing to a pilot.'});return false;}try{const data=await cloudflareApi.request<{destination:{name:string;latitude:number;longitude:number};stops?:RouteStop[];distanceKm:number;durationMinutes:number;coordinates:LiveRoute['coordinates']}>('/api/routes',{method:'POST',body:JSON.stringify({origin,destination:name,target:{latitude,longitude}})});set({route:{destination:data.destination.name,destinationLatitude:data.destination.latitude,destinationLongitude:data.destination.longitude,distanceKm:data.distanceKm,durationMinutes:data.durationMinutes,coordinates:data.coordinates,stops:data.stops||[data.destination]},error:null});return true;}catch(error){set({error:error instanceof Error?error.message:'Pilot route failed'});return false;}},
  restoreRoute:route=>set({route:{destination:route.destination_name,destinationLatitude:Number(route.destination_latitude),destinationLongitude:Number(route.destination_longitude),distanceKm:Number(route.distance_km),durationMinutes:Number(route.duration_minutes),coordinates:route.coordinates,stops:route.stops||[]},suggestions:[],error:null}),
  createConvoy:async(title,startsAt)=>{const route=get().route;if(!route){set({error:'Build a route before opening a convoy.'});return false;}try{const data=await cloudflareApi.request<{id:string}>('/api/convoys',{method:'POST',body:JSON.stringify({title,startsAt,route,maxMembers:12})});set({activeCruiseId:data.id});await get().refreshNetwork();return true;}catch(error){set({error:error instanceof Error?error.message:'Convoy creation failed.'});return false;}},
  joinConvoy:async id=>{try{await cloudflareApi.request(`/api/convoys/${id}/join`,{method:'POST'});const convoy=get().cruises.find(item=>item.id===id);set({activeCruiseId:id,route:convoy?.route||get().route});await get().refreshNetwork();return true;}catch(error){set({error:error instanceof Error?error.message:'Could not join convoy.'});return false;}},
  startConvoy:async id=>{try{await cloudflareApi.request(`/api/convoys/${id}/start`,{method:'POST'});set({activeCruiseId:id});await get().refreshNetwork();await get().startDrive();return true;}catch(error){set({error:error instanceof Error?error.message:'Could not launch convoy.'});return false;}},
  saveCurrentRoute:async name=>{const route=get().route;if(!route)return false;try{await cloudflareApi.request('/api/routes/save',{method:'POST',body:JSON.stringify({name:name||route.destination.split(',')[0],route})});await get().loadNavigation();return true;}catch(error){set({error:error instanceof Error?error.message:'Route save failed'});return false;}},
  savePlace:async place=>{try{await cloudflareApi.request('/api/places',{method:'POST',body:JSON.stringify({...place,isFavorite:true})});await get().loadNavigation();return true;}catch(error){set({error:error instanceof Error?error.message:'Favorite save failed'});return false;}},
  deletePlace:async id=>{await cloudflareApi.request(`/api/places/${id}`,{method:'DELETE'});await get().loadNavigation();},
  deleteSavedRoute:async id=>{await cloudflareApi.request(`/api/routes/${id}`,{method:'DELETE'});await get().loadNavigation();},
  renameSavedRoute:async(id,name)=>{const label=name.trim();if(!label)return;await cloudflareApi.request(`/api/routes/${id}`,{method:'PUT',body:JSON.stringify({name:label})});await get().loadNavigation();},
  clearDriveSummary:()=>set({lastDriveSummary:null}),
  clearRoute:()=>set({route:null,suggestions:[]}),
  dispose:()=>{get()._watch?.remove();if(get()._poll)clearInterval(get()._poll!);set({_watch:null,_poll:null,isDriving:false,_driveSessionId:null});},
}));
