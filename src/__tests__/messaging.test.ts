import { useMessageStore } from '../stores/messageStore';

describe('Phase 9 Messaging Verification', () => {
  test('Sending message appends text bubble to active chat thread', () => {
    const { conversations, sendMessage, messagesMap } = useMessageStore.getState();
    const convoId = conversations[0].id;
    const initialMessages = messagesMap[convoId]?.length || 0;

    sendMessage(convoId, 'Staging at Terminal Island now', '00000000-0000-0000-0000-000000000001');

    const updatedMessages = useMessageStore.getState().messagesMap[convoId] || [];
    expect(updatedMessages.length).toBe(initialMessages + 1);
    expect(updatedMessages[updatedMessages.length - 1].content).toBe('Staging at Terminal Island now');
  });

  test('Switching active conversation updates selected thread', () => {
    const { conversations, setActiveConversation } = useMessageStore.getState();
    const secondConvoId = conversations[1]?.id || conversations[0].id;

    setActiveConversation(secondConvoId);
    expect(useMessageStore.getState().activeConversationId).toBe(secondConvoId);
  });
});
