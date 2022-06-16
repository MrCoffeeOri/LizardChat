import { Low, JSONFile } from 'lowdb'

export const db = new Low(new JSONFile('database/db.json'))