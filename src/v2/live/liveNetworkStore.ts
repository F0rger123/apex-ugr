import { create } from 'zustand';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudflareApi } from '../../config/cloudflareApi';

const LOCATION_KEY='apex.last-location';

export type LiveCoordinate={latitude:number;longitude:number;accuracy:number|null;altitude:number|null;heading:number;speedKph:number;timestamp:number};
export type LiveDriver={id:string;userId:string;alias:string;avatarUrl:string|null;vehicle:string|null;latitude:number;longitude:number;heading:number;speedKph:number;driveMode:boolean;cruiseId:string|null;updatedAt:string;mystery:boolean;isLive:boolean;tier:'Bronze'|'Silver'|'Master'|'Platinum';record:string};
export type LiveEvent={id:string;title:string;latitude:number;longitude:number;radiusM:number;attendees:number;startTime:string;locationName:string};
export type LiveCruise={id:string;title:string;status:string;memberCount:number};
export type LiveRoute={destination:string;destinationLatitude:number;destinationLongitude:number;distanceKm:number;durationMinutes:number;coordinates:Array<{latitude:number;longitude:number}>};
export type AddressSuggestion={id:string;name:string;latitude:number;longitude:number;type:string};
export type SavedPlace={id:string;label:string;location_name:string;latitude:number;longitude:number;is_favorite:number};
export type SavedRoute={id:string;name:string;destination_name:string;destination_latitude:number;destination_longitude:number;distance_km:number;duration_minutes:number;coordinates:LiveRoute['coordinates']};
type NetworkStatus='offline'|'gps_required'|'gps_locked'|'auth_required'|'live'|'error';

interface LiveNetworkState{
  location:LiveCoordinate|null;drivers:LiveDriver[];events:LiveEvent[];cruises:LiveCruise[];route:LiveRoute|null;savedPlaces:SavedPlace[];savedRoutes:SavedRoute[];suggestions:AddressSuggestion[];networkStatus:NetworkStatus;error:string|null;isDriving:boolean;unit:'mph'|'kph';distanceKm:number;maxSpeedKph:number;startedAt:number|null;
  _watch:Location.LocationSubscription|null;_poll:ReturnType<typeof setInterval>|null;_userId:string|null;
  initialize:()=>Promise<void>;lockLocation:()=>Promise<void>;startDrive:()=>Promise<void>;stopDrive:()=>Promise<void>;toggleUnit:()=>void;refreshNetwork:()=>Promise<void>;loadNavigation:()=>Promise<void>;suggestAddresses:(query:string)=>Promise<void>;setRoute:(destination:string)=>Promise<boolean>;restoreRoute:(route:SavedRoute)=>void;saveCurrentRoute:(name?:string)=>Promise<boolean>;savePlace:(place:{label:string;locationName:string;latitude:number;longitude:number})=>Promise<boolean>;deletePlace:(id:string)=>Promise<void>;deleteSavedRoute:(id:string)=>Promise<void>;clearRoute:()=>void;dispose:()=>void;
}

function segmentKm(a:LiveCoordinate,b:LiveCoordinate){const rad=Math.PI/180;const dLat=(b.latitude-a.latitude)*rad;const dLng=(b.longitude-a.longitude)*rad;const h=Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
function coordinate(position:Location.LocationObject):LiveCoordinate{return{latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,altitude:position.coords.altitude,heading:Math.max(0,position.coords.heading||0),speedKph:Math.max(0,(position.coords.speed||0)*3.6),timestamp:position.timestamp};}
async function publish(location:LiveCoordinate,driveMode:boolean){await cloudflareApi.request('/api/location',{method:'POST',body:JSON.stringify({latitude:location.latitude,longitude:location.longitude,accuracy:location.accuracy,altitude:location.altitude,speedKph:driveMode?location.speedKph:0,heading:location.heading,driveMode})});}

export const useLiveNetworkStore=create<LiveNetworkState>((set,get)=>({
  location:null,drivers:[],events:[],cruises:[],route:null,savedPlaces:[],savedRoutes:[],suggestions:[],networkStatus:'offline',error:null,isDriving:false,unit:'mph',distanceKm:0,maxSpeedKph:0,startedAt:null,_watch:null,_poll:null,_userId:null,
  initialize:async()=>{
    get()._poll&&clearInterval(get()._poll!);
    const [session,cached]=await Promise.all([cloudflareApi.session(),AsyncStorage.getItem(LOCATION_KEY)]);
    if(cached){try{const location=JSON.parse(cached) as LiveCoordinate;if(Number.isFinite(location.latitude)&&Number.isFinite(location.longitude))set({location});}catch{await AsyncStorage.removeItem(LOCATION_KEY);}}
    if(!session){set({_userId:null,networkStatus:'auth_required'});return;}
    set({_userId:session.user.id,networkStatus:'live',error:null});await Promise.all([get().refreshNetwork(),get().loadNavigation()]);
    const poll=setInterval(()=>{void get().refreshNetwork();},5000);set({_poll:poll});
  },
  lockLocation:async()=>{
    set({error:null});const permission=await Location.requestForegroundPermissionsAsync();
    if(permission.status!=='granted'){set({networkStatus:'gps_required',error:'Precise location permission is required for Radar and Drive Mode.'});return;}
    const next=coordinate(await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.BestForNavigation}));set({location:next,networkStatus:get()._userId?'live':'gps_locked'});await AsyncStorage.setItem(LOCATION_KEY,JSON.stringify(next));
    if(get()._userId) await publish(next,false).catch(error=>set({error:error instanceof Error?error.message:'Location publish failed'}));
  },
  startDrive:async()=>{
    if(get().isDriving)return;const permission=await Location.requestForegroundPermissionsAsync();
    if(permission.status!=='granted'){set({networkStatus:'gps_required',error:'Drive Mode cannot start without precise location access.'});return;}
    get()._watch?.remove();set({isDriving:true,distanceKm:0,maxSpeedKph:0,startedAt:Date.now(),error:null});
    const watch=await Location.watchPositionAsync({accuracy:Location.Accuracy.BestForNavigation,timeInterval:500,distanceInterval:1},position=>{
      const next=coordinate(position);const previous=get().location;const distance=previous&&next.accuracy!==null&&next.accuracy<=65?segmentKm(previous,next):0;
      set(state=>({location:next,distanceKm:state.distanceKm+Math.min(distance,.5),maxSpeedKph:Math.max(state.maxSpeedKph,next.speedKph),networkStatus:state._userId?'live':'gps_locked'}));
      void AsyncStorage.setItem(LOCATION_KEY,JSON.stringify(next));
      if(get()._userId) void publish(next,true).catch(error=>set({error:error instanceof Error?error.message:'Live position failed'}));
    });set({_watch:watch});
  },
  stopDrive:async()=>{get()._watch?.remove();set({_watch:null,isDriving:false});const current=get().location;if(current&&get()._userId)await publish(current,false).catch(()=>undefined);},
  toggleUnit:()=>set(state=>({unit:state.unit==='mph'?'kph':'mph'})),
  refreshNetwork:async()=>{
    if(!get()._userId)return;
    try{const data=await cloudflareApi.request<{drivers:any[];events:any[];cruises:any[]}>('/api/network');set({
      drivers:data.drivers.map(row=>({id:row.user_id,userId:row.user_id,alias:row.username||'UNKNOWN',avatarUrl:row.avatar_url||null,vehicle:row.make?`${row.year} ${row.make} ${row.model}`:null,latitude:Number(row.latitude),longitude:Number(row.longitude),heading:Number(row.heading||0),speedKph:Number(row.speed_kph||0),driveMode:Boolean(row.drive_mode),cruiseId:row.cruise_id||null,updatedAt:row.updated_at,mystery:row.privacy_mode==='meet_only',isLive:Boolean(row.is_live),tier:['Bronze','Silver','Master','Platinum'].includes(row.tier)?row.tier:'Bronze',record:`${Number(row.wins||0)}–${Number(row.losses||0)}`})),
      events:data.events.map(row=>({id:row.id,title:row.title,latitude:Number(row.latitude),longitude:Number(row.longitude),radiusM:Number(row.radius_m||250),attendees:Number(row.attendees||0),startTime:row.starts_at,locationName:row.location_name})),
      cruises:data.cruises.map(row=>({id:row.id,title:row.title,status:row.status,memberCount:Number(row.member_count||0)})),error:null});
    }catch(error){set({networkStatus:'error',error:error instanceof Error?error.message:'Network refresh failed'});}
  },
  loadNavigation:async()=>{if(!get()._userId)return;try{const data=await cloudflareApi.request<{places:SavedPlace[];routes:SavedRoute[]}>('/api/navigation');set({savedPlaces:data.places||[],savedRoutes:data.routes||[]});}catch(error){set({error:error instanceof Error?error.message:'Saved navigation failed'});}},
  suggestAddresses:async query=>{if(query.trim().length<3){set({suggestions:[]});return;}try{const data=await cloudflareApi.request<{suggestions:AddressSuggestion[]}>(`/api/address-suggestions?q=${encodeURIComponent(query.trim())}`);set({suggestions:data.suggestions||[]});}catch{set({suggestions:[]});}},
  setRoute:async destination=>{
    const origin=get().location;if(!origin){set({error:'Lock GPS before setting a route.'});return false;}
    try{const data=await cloudflareApi.request<{destination:{name:string;latitude:number;longitude:number};distanceKm:number;durationMinutes:number;coordinates:LiveRoute['coordinates']}>('/api/routes',{method:'POST',body:JSON.stringify({origin,destination})});set({route:{destination:data.destination.name,destinationLatitude:data.destination.latitude,destinationLongitude:data.destination.longitude,distanceKm:data.distanceKm,durationMinutes:data.durationMinutes,coordinates:data.coordinates},suggestions:[],error:null});return true;}catch(error){set({error:error instanceof Error?error.message:'Route failed'});return false;}
  },
  restoreRoute:route=>set({route:{destination:route.destination_name,destinationLatitude:Number(route.destination_latitude),destinationLongitude:Number(route.destination_longitude),distanceKm:Number(route.distance_km),durationMinutes:Number(route.duration_minutes),coordinates:route.coordinates},suggestions:[],error:null}),
  saveCurrentRoute:async name=>{const route=get().route;if(!route)return false;try{await cloudflareApi.request('/api/routes/save',{method:'POST',body:JSON.stringify({name:name||route.destination.split(',')[0],route})});await get().loadNavigation();return true;}catch(error){set({error:error instanceof Error?error.message:'Route save failed'});return false;}},
  savePlace:async place=>{try{await cloudflareApi.request('/api/places',{method:'POST',body:JSON.stringify({...place,isFavorite:true})});await get().loadNavigation();return true;}catch(error){set({error:error instanceof Error?error.message:'Favorite save failed'});return false;}},
  deletePlace:async id=>{await cloudflareApi.request(`/api/places/${id}`,{method:'DELETE'});await get().loadNavigation();},
  deleteSavedRoute:async id=>{await cloudflareApi.request(`/api/routes/${id}`,{method:'DELETE'});await get().loadNavigation();},
  clearRoute:()=>set({route:null,suggestions:[]}),
  dispose:()=>{get()._watch?.remove();if(get()._poll)clearInterval(get()._poll!);set({_watch:null,_poll:null,isDriving:false});},
}));
