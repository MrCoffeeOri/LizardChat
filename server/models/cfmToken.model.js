import crypto from "crypto"
import { model, Schema } from "mongoose";


export const ConfirmationToken = model("Confirmationtoken", new Schema({
    email: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    token: { 
        type: String, 
        unique: true,
        default: crypto.randomUUID
    }
}, { timestamps: true }))

//ConfirmationToken.createIndexes({ expireAfterSeconds: 10 })