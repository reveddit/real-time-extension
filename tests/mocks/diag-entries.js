import { getDiagTiers } from '../../src/src/diaglog'

// Both diagnostic-log tiers merged in time order, for tests that only care about content.
export const getDiagEntries = async () => {
    const tiers = await getDiagTiers()
    return [...tiers.summary, ...tiers.details].sort((a, b) => a.t - b.t)
}
