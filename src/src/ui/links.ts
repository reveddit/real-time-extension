// reddit.com permalink for a post (t3_ id), or for a comment (t1_ id) given
// its post's t3_ id.
export function redditItemUrl(id: string, postId?: string): string {
    const url = `https://www.reddit.com/comments/${(postId ?? id).substring(3)}`
    return postId ? `${url}/-/${id.substring(3)}?context=3` : url
}
