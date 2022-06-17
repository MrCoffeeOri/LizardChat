import {users, authLogs, FindDatasetIndex} from "./DB.js"

export default async function AuthMidlleware(req, res, next) {
    const userIndex = FindDatasetIndex(users, _user => _user.email == req.params.email && _user.password == req.params.password)
    if (userIndex == undefined)
        return res.status(401).json({ message: 'Invalid user' })

    authLogs.data.push({ id: users.data[userIndex].id, ip: req.ip, date: new Date().toUTCString() })
    await users.write()
    await authLogs.write()
    req.user = users.data[userIndex]
    req.userIndex = userIndex
    next()
} 