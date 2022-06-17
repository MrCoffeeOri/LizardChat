import { Low, JSONFile } from 'lowdb'

export const users = new Low(new JSONFile('database/users.json'))
export const groups = new Low(new JSONFile('database/groups.json'))
export const authLogs = new Low(new JSONFile('database/authLogs.json'))

export function FindDatasetIndex(dataset, callback) {
    for (let i = 0; i <= dataset.data.length; i++) {
        const normal = dataset.data[i]
        const reverse = dataset.data[dataset.data.length - i - 1]

        if ((!normal && !reverse) || (dataset.data[i].length > 1 && normal.id == reverse.id)) return undefined
            
        if (callback(normal)) return i
        
        if (callback(reverse))  return dataset.data.length - i - 1
    }
}