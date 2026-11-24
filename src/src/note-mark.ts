// The red "!" mark and the note it leads to, on the signed-in user's own
// profile (own-status.ts)

const OWN_VIEW_HINT = 'Shows your own view. Open in a private window, or as another account, to see it as others do.'

// Footnote-style marker: a small red "!" badge. The same badge heads the note
// above the items; next to a link it is a jump that scrolls to that note and
// flashes it, so the two are visibly tied.
export function createNoteMark(jump: boolean, noteSelector = '.rev-note'): HTMLElement {
    const mark = document.createElement(jump ? 'a' : 'span')
    mark.className = 'rev-note-mark' + (jump ? ' rev-note-mark-jump' : '')
    mark.textContent = '!'
    if (jump) {
        const a = mark as HTMLAnchorElement
        a.href = '#'
        a.title = OWN_VIEW_HINT
        a.addEventListener('click', e => {
            e.preventDefault()
            const note = document.querySelector(noteSelector) as HTMLElement | null
            if (!note) return
            note.scrollIntoView({ block: 'center' })
            note.classList.remove('rev-note-flash')
            void note.offsetWidth // restart the animation on repeat clicks
            note.classList.add('rev-note-flash')
        })
    } else {
        mark.setAttribute('aria-hidden', 'true')
    }
    return mark
}
