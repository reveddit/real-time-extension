import { getMarkupConfig } from './markup-config'

// --- Interfaces ---

export interface CommentTreeNode {
    id: string // fullname e.g. "t1_abc123"
    author: string
    parent_id: string // e.g. "t1_xyz" or "t3_postid"
    body?: string
    created_utc: number
    link_id: string // thread fullname e.g. "t3_postid"
    children: CommentTreeNode[]
}

// --- Author validity ---

const invalidAuthors = new Set(['[deleted]', '[removed]', 'AutoModerator', ''])

export function validAuthor(author: string | undefined | null): author is string {
    if (!author) return false
    return !invalidAuthors.has(author) && author[0] !== '['
}

// --- Comment Tree Extraction ---

// Old-reddit removed/deleted comments render as tombstones with no
// data-fullname and no data-author, but their data-permalink still ends with
// the base36 comment id, e.g.
//   /r/sub/comments/<postid>/<slug>/<commentid>/  ->  t1_<commentid>
// Recover the fullname from there so removed comments aren't silently skipped.
export function commentFullnameFromPermalink(permalink: string | null | undefined): string {
    if (!permalink) return ''
    const m = permalink.replace(/\/+$/, '').match(/\/comments\/[a-z0-9]+\/[^/]+\/([a-z0-9]+)$/i)
    return m ? 't1_' + m[1] : ''
}

function linkChildren(map: Map<string, CommentTreeNode>) {
    for (const node of map.values()) {
        map.get(node.parent_id)?.children.push(node)
    }
}

export function extractCommentTree_oldReddit(postFullname: string): Map<string, CommentTreeNode> {
    const map = new Map<string, CommentTreeNode>()
    const commentEls = document.querySelectorAll('.commentarea .thing.comment')

    for (const el of Array.from(commentEls)) {
        const id = el.getAttribute('data-fullname') || commentFullnameFromPermalink(el.getAttribute('data-permalink'))
        const author = el.getAttribute('data-author') || ''
        if (!id) continue

        const parentEl = el.parentElement?.closest('.thing.comment')
        const parent_id =
            parentEl?.getAttribute('data-fullname') ||
            commentFullnameFromPermalink(parentEl?.getAttribute('data-permalink')) ||
            postFullname

        const bodyEl = el.querySelector(':scope > .entry .usertext-body .md')
        const body = bodyEl?.textContent?.trim() || ''

        const timeEl = el.querySelector(':scope > .entry .tagline time')
        const datetime = timeEl?.getAttribute('datetime')
        // One a scan placed has no time of reddit's
        const created_utc =
            Number(el.getAttribute('data-rev-created')) ||
            (datetime ? Math.floor(new Date(datetime).getTime() / 1000) : 0)

        const node: CommentTreeNode = {
            id,
            author,
            parent_id,
            body,
            created_utc,
            link_id: postFullname,
            children: [],
        }
        map.set(id, node)
    }

    linkChildren(map)

    return map
}

// Reddit has spelled this thingId and thing-id. Attribute names on a page read lowercase.
const commentIdAttributes = () => getMarkupConfig().commentIdAttributes.map(name => name.toLowerCase())

export const commentIdOf = (comment: Element | null | undefined): string => {
    for (const name of commentIdAttributes()) {
        const id = comment?.getAttribute(name)
        if (id) return id
    }
    return ''
}

export const commentSelector = (id?: string): string =>
    commentIdAttributes()
        .map(name => `shreddit-comment[${name}${id ? `="${id}"` : ''}]`)
        .join(', ')

// The comments new reddit's page shows, with who replied to whom. A reply sits
// inside its parent, and a comment at the top of the thread has no parentid.
export function extractCommentTree_newReddit(postFullname: string): Map<string, CommentTreeNode> {
    const map = new Map<string, CommentTreeNode>()
    for (const el of Array.from(document.querySelectorAll(commentSelector()))) {
        const id = commentIdOf(el)
        map.set(id, {
            id,
            author: el.getAttribute('author') || '',
            parent_id:
                el.getAttribute('parentid') ||
                commentIdOf(el.parentElement?.closest('shreddit-comment')) ||
                postFullname,
            created_utc: Math.floor(Date.parse(el.getAttribute('created') || '') / 1000) || 0,
            link_id: postFullname,
            children: [],
        })
    }
    linkChildren(map)
    return map
}

// --- Candidate Author Ordering ---

export function getCandidateAuthors(
    targetId: string,
    treeMap: Map<string, CommentTreeNode>,
    postAuthor: string,
): string[] {
    const target = treeMap.get(targetId)
    if (!target) return []

    const seen = new Set<string>()
    const result: string[] = []

    const tryAdd = (node: CommentTreeNode | undefined) => {
        if (!node || !validAuthor(node.author) || seen.has(node.author)) return
        seen.add(node.author)
        result.push(node.author)
    }

    const tryAddAuthor = (author: string | undefined) => {
        if (!validAuthor(author) || seen.has(author)) return
        seen.add(author)
        result.push(author)
    }

    const getAncestor = (n: number): CommentTreeNode | undefined => {
        let current: CommentTreeNode | undefined = target
        for (let i = 0; i < n; i++) {
            if (!current?.parent_id?.startsWith('t1_')) return undefined
            current = treeMap.get(current.parent_id)
            if (!current) return undefined
        }
        return current
    }

    const getDescendant = (node: CommentTreeNode, n: number): CommentTreeNode | undefined => {
        let current: CommentTreeNode | undefined = node
        for (let i = 0; i < n; i++) {
            if (!current?.children?.length) return undefined
            current = current.children[0]
        }
        return current
    }

    // 1. Grandparent (2 up)
    tryAdd(getAncestor(2))

    // 2. Grandchild (2 down)
    tryAdd(getDescendant(target, 2))

    // 3. Thread OP
    tryAddAuthor(postAuthor)

    // 4-6. Paired ancestor/descendant expanding outward (3,4,5...)
    for (let dist = 3; ; dist++) {
        const ancestor = getAncestor(dist)
        const descendant = getDescendant(target, dist)
        if (!ancestor && !descendant) break
        tryAdd(ancestor)
        tryAdd(descendant)
    }

    // 7. Parent (1 up) — last in tree traversal
    tryAdd(getAncestor(1))

    // 8. Siblings / cousins (other children of same parent)
    const parentNode = treeMap.get(target.parent_id)
    if (parentNode) {
        for (const sibling of parentNode.children) {
            if (sibling.id === targetId) continue
            tryAdd(sibling)
        }
    }

    // 9. Nearby by timestamp, fanning out ±1, ±2, ...
    const sortedByTime = Array.from(treeMap.values())
        .filter(c => c.id.startsWith('t1_'))
        .sort((a, b) => a.created_utc - b.created_utc)

    if (sortedByTime.length > 1) {
        const targetIndex = sortedByTime.findIndex(c => c.id === targetId)
        if (targetIndex >= 0) {
            for (let offset = 1; ; offset++) {
                const before = sortedByTime[targetIndex - offset]
                const after = sortedByTime[targetIndex + offset]
                if (!before && !after) break
                tryAdd(before)
                tryAdd(after)
            }
        }
    }

    return result
}
