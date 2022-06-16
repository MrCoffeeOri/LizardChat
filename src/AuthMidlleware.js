import {db} from "./DB.js"

export default async function AuthMidlleware(req, res, next) {
    try {
        await db.read()
        let userIndex;
        let user = db.data.users.find((_user, _userIndex) => {
            if (_user.email == req.params.email && _user.password == req.params.password) {
                userIndex = _userIndex
                return true
            }
        })
        
        if (!user)
            return res.status(401).json({ message: 'Invalid user' })

        db.data.authLogs.push({ id: user.id, ip: req.ip, date: new Date().toUTCString() })
        await db.write()
        req.user = user
        req.userIndex = userIndex
        next()
    } catch (error) {
        res.status(500).json({ message: error })
    }
} 