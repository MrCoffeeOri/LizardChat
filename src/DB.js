import { Low, JSONFile } from 'lowdb'

export const users = new Low(new JSONFile('database/users.json'))
export const groups = new Low(new JSONFile('database/groups.json'))
export const authLogs = new Low(new JSONFile('database/authLogs.json'))
export const authTokens = new Low(new JSONFile('database/authTokens.json'))

export function FindDatasetIndex(dataset, finder) {
    let low = 0
    let high = dataset.length - 1
    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const found = finder(dataset[mid])
        if (found)
            return mid
        else if (found < 0)
            high = mid - 1
        else
            low = mid + 1
    }
    return undefined
}