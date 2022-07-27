import { Low, JSONFile } from 'lowdb'

export const users = new Low(new JSONFile('database/users.json'))
export const cfmTokens = new Low(new JSONFile('database/cfmTokens.json'))
export const dms = new Low(new JSONFile('database/dms.json'))
export const groups = new Low(new JSONFile('database/groups.json'))
export const logs = new Low(new JSONFile('database/logs.json'))
export const authTokens = new Low(new JSONFile('database/authTokens.json'))

export function FindKey(dataset, finder) {
    for (const key in dataset)
        if (Object.hasOwnProperty.call(dataset, key) && finder(dataset[key]))
            return key
            
    return undefined
}