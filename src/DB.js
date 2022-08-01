import { Low, JSONFile } from 'lowdb'

export const users = new Low(new JSONFile('database/users.json'))
export const cfmTokens = new Low(new JSONFile('database/cfmTokens.json'))
export const dms = new Low(new JSONFile('database/dms.json'))
export const groups = new Low(new JSONFile('database/groups.json'))
export const logs = new Low(new JSONFile('database/logs.json'))
export const authTokens = new Low(new JSONFile('database/authTokens.json'))

/**
 * Serach on an array to find an index, if it exists returns the index, otherwise returns -1.
 * @param {Array} array 
 * @param {() => boolean} callback 
 * @returns number
 */
export function FindIndex(array, callback) {
    let low = 0, high = array.length - 1
    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        if (callback(array[mid]))
            return mid
        else
            low = mid + 1
    }
    return undefined
}