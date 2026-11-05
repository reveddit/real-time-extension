// A new run of a content script starts whenever the extension is reloaded or
// updated while a tab is open, and the previous run's buttons stay in the page
// with click handlers that no longer work. Each carries its run's token: a later
// run replaces the old button instead of adding a second one, and a run that
// reaches the same item twice keeps the one it already placed. The old run can go
// on noticing the page after that, with no extension behind it (orphaned).
const RUN_TOKEN = Math.random().toString(36).slice(2)
const RUN_ATTRIBUTE = 'data-rev-subscribe-run'

export const ofThisRun = (element: Element | null | undefined) => element?.getAttribute(RUN_ATTRIBUTE) === RUN_TOKEN
export const markThisRun = (element: Element) => element.setAttribute(RUN_ATTRIBUTE, RUN_TOKEN)
export const orphaned = () => !chrome.runtime?.id

export const placeForThisRun = (parent: Element, element: HTMLElement, selector: string, runToken = RUN_TOKEN) => {
    const placed = Array.from(parent.children).filter(el => el.matches(selector))
    if (placed.some(el => el.getAttribute(RUN_ATTRIBUTE) === runToken)) return
    placed.forEach(el => el.remove())
    element.setAttribute(RUN_ATTRIBUTE, runToken)
    parent.appendChild(element)
}

export const placeSubscribeLink = (links: Element, link: HTMLElement, runToken = RUN_TOKEN) =>
    placeForThisRun(links, link, `[${RUN_ATTRIBUTE}]`, runToken)
