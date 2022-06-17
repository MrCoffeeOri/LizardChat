import { Low, JSONFile } from 'lowdb'

export const users = new Low(new JSONFile('database/users.json'))
export const groups = new Low(new JSONFile('database/groups.json'))
export const authLogs = new Low(new JSONFile('database/authLogs.json'))

export function FindDatasetIndex(dataset, callback) {
    for (let i = 0; i <= dataset.length; i++) {
        const normal = dataset[i]
        const reverse = dataset[dataset.length - i - 1]

        if ((!normal && !reverse) || (dataset[i].length > 1 && normal.id == reverse.id)) return undefined
            
        if (callback(normal)) return i
        
        if (callback(reverse))  return dataset.length - i - 1
    }
}