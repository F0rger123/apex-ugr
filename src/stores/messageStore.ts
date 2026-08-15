import { create } from 'zustand';
import { cloudflareApi } from '../config/cloudflareApi';

export type MessageWithSender = { id:string; conversation_id:string; sender_id:string; content:string; media_url:string|null; media_type:string|null; created_at:string; username?:string; avatar_url?:string|null };
export type ConversationWithProfile = { id:string; group_name:string|null; is_group:number; last_message:string|null; updated_at:string; other_profile?:{id:string;username:string;display_name:string;avatar_url:string|null}|null };

interface MessageState {
  conversations: ConversationWithProfile[]; messagesMap: Record<string, MessageWithSender[]>; activeConversationId: string|null; isLoading:boolean; error:string|null; _polls:Record<string,ReturnType<typeof setInterval>>;
  fetchConversations:(userId:string)=>Promise<void>; fetchMessages:(conversationId:string)=>Promise<void>; setActiveConversation:(id:string|null)=>void;
  startConversation:(currentUserId:string,otherUserId:string)=>Promise<{conversationId:string|null;error:string|null}>;
  sendMessage:(conversationId:string,senderId:string,content:string,mediaUrl?:string,mediaType?:string)=>Promise<{error:string|null}>;
  subscribeToConversation:(conversationId:string)=>void; unsubscribeFromConversation:(conversationId:string)=>void;
}

export const useMessageStore=create<MessageState>((set,get)=>({
  conversations:[],messagesMap:{},activeConversationId:null,isLoading:false,error:null,_polls:{},
  fetchConversations:async()=>{set({isLoading:true,error:null});try{const data=await cloudflareApi.request<{conversations:ConversationWithProfile[]}>('/api/conversations');set({conversations:data.conversations});}catch(error){set({error:error instanceof Error?error.message:'Failed to load conversations'});}finally{set({isLoading:false});}},
  fetchMessages:async conversationId=>{try{const data=await cloudflareApi.request<{messages:MessageWithSender[]}>(`/api/conversations/${conversationId}/messages`);set(state=>({messagesMap:{...state.messagesMap,[conversationId]:data.messages}}));}catch(error){set({error:error instanceof Error?error.message:'Failed to load messages'});}},
  setActiveConversation:id=>set({activeConversationId:id}),
  startConversation:async(_currentUserId,otherUserId)=>{try{const data=await cloudflareApi.request<{id:string}>('/api/conversations',{method:'POST',body:JSON.stringify({participantId:otherUserId})});await get().fetchConversations('');return{conversationId:data.id,error:null};}catch(error){return{conversationId:null,error:error instanceof Error?error.message:'Failed to start conversation'};}},
  sendMessage:async(conversationId,_senderId,content,mediaUrl,mediaType)=>{try{const data=await cloudflareApi.request<{message:MessageWithSender}>(`/api/conversations/${conversationId}/messages`,{method:'POST',body:JSON.stringify({content,mediaUrl,mediaType})});set(state=>({messagesMap:{...state.messagesMap,[conversationId]:[...(state.messagesMap[conversationId]||[]),data.message]}}));await get().fetchConversations('');return{error:null};}catch(error){return{error:error instanceof Error?error.message:'Failed to send message'};}},
  subscribeToConversation:conversationId=>{if(get()._polls[conversationId])return;const poll=setInterval(()=>void get().fetchMessages(conversationId),3000);set(state=>({_polls:{...state._polls,[conversationId]:poll}}));},
  unsubscribeFromConversation:conversationId=>{const poll=get()._polls[conversationId];if(poll)clearInterval(poll);set(state=>{const polls={...state._polls};delete polls[conversationId];return{_polls:polls};});},
}));
