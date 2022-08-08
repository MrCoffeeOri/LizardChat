import { Low, JSONFile } from 'lowdb'

export const users = new Low(new JSONFile('database/users.json'))
export const cfmTokens = new Low(new JSONFile('database/cfmTokens.json'))
export const dms = new Low(new JSONFile('database/dms.json'))
export const groups = new Low(new JSONFile('database/groups.json'))
export const logs = new Low(new JSONFile('database/logs.json'))
export const authTokens = new Low(new JSONFile('database/authTokens.json'))

/**
 * Serach on an array to find an index, if it exists returns the index, otherwise returns undefined.
 * @param {Array} array 
 * @param {() => boolean} callback 
 * @returns number
 */
 export function FindIndex(array, callback) {
    for (let i = 0; i < array.length; i++) {
        if (callback(array[i]))
            return i
        if (callback(array[array.length - i - 1]))
            return array.length - i - 1
        if (callback(array[Math.floor(array.length / 2) - i -1]))
            return Math.floor(array.length / 2) - i -1
        if (callback(array[Math.floor(array.length / 2) + i]))
            return Math.floor(array.length / 2) - i -1
    }
    return undefined
}