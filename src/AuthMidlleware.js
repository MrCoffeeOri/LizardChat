import { authTokens, FindDatasetIndex } from "./DB.js"

export default async function AuthMidlleware(req, res, next) {
    if (!req.params.authToken)
        return res.status(400).json({ message: "Auth token is missing" })

    const auhtTokenIndex = FindDatasetIndex(authTokens.data, at => at.token == req.params.authToken)
    if (auhtTokenIndex == undefined)
        return res.status(400).json({ message: "Invalid token" })

    req.userIndex = authTokens.data[auhtTokenIndex].userID
    next()
} 