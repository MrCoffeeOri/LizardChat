import crypto from "crypto"
import { model, Schema } from "mongoose";


export const ConfirmationToken = model("Confirmationtoken", new Schema({
    email: String,
    name: String,
    password: String,
    token: { 
        type: String, 
        unique: true,
        default: crypto.randomUUID
    }
}, { timestamps: true }))

//ConfirmationToken.createIndexes({ expireAfterSeconds: 10 })