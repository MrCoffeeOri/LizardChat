import { Low, JSONFile } from 'lowdb'

export const users = new Low(new JSONFile('database/users.json'))
export const cfmTokens = new Low(new JSONFile('database/cfmTokens.json'))
export const dms = new Low(new JSONFile('database/dms.json'))
export const groups = new Low(new JSONFile('database/groups.json'))
export const logs = new Low(new JSONFile('database/logs.json'))
export const authTokens = new Low(new JSONFile('database/authTokens.json'))

/**
 * Serach on an array to find an object, if it exists returns the object, otherwise returns undefined.
 * @param {Array} array 
 * @param {() => boolean} callback 
 * @returns Object
 */
 export function Find(array, callback) {
    for (let i = 0; i < array.length; i++) {
        const fReverse = Math.max(Math.floor(array.length / 2) - i, 0)
        const sVerse = Math.max(Math.ceil(array.length / 2) + i, 0)
        const sReverse = array.length - i - 1

        if (callback(array[i])) return array[i]
        if (fReverse >= 0 && callback(array[fReverse])) return array[fReverse]
        if (sVerse < array.length && callback(array[sVerse])) return array[sVerse]
        if (callback(array[sReverse])) return array[sReverse]
        if (i == fReverse || sVerse == sReverse) return undefined
    }
}