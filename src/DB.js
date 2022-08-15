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
        if (callback(array[i]) || array.length == 1)
            return array.length == 1 && !callback(array[i]) ? undefined : array[i]

        if (callback(array[array.length - i - 1]))
            return [array.length - i - 1]

        if (callback(array[Math.floor(array.length / 2) - i -1]))
            return array[Math.floor(array.length / 2) - i -1]

        if (callback(array[Math.floor(array.length / 2) + i + array.length % 2 == 0 ? 1 : 0]))
            return array[Math.floor(array.length / 2) - i -1]
    }
    return undefined
}