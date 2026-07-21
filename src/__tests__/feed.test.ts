import { useFeedStore } from '../stores/feedStore';

describe('Phase 8 Video & Reels Feed Verification', () => {
  test('Toggling like updates post like count and user like flag', () => {
    const { posts, toggleLike } = useFeedStore.getState();
    const postId = posts[0].id;
    const initialLikes = posts[0].likes_count;

    toggleLike(postId);

    const updatedPost = useFeedStore.getState().posts.find((p) => p.id === postId);
    expect(updatedPost?.user_has_liked).toBe(true);
    expect(updatedPost?.likes_count).toBe(initialLikes + 1);
  });

  test('Adding comment appends comment to post comment thread', () => {
    const { posts, addComment, commentsMap } = useFeedStore.getState();
    const postId = posts[0].id;

    addComment(postId, 'Insane launching speed!');

    const comments = useFeedStore.getState().commentsMap[postId] || [];
    expect(comments.length).toBeGreaterThan(0);
    expect(comments[comments.length - 1].comment_text).toBe('Insane launching speed!');
  });
});
