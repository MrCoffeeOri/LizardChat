import { Low, JSONFile } from 'lowdb'

const db = new Low(new JSONFile('database/db.json'))

export default db