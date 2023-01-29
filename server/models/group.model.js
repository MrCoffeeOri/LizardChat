import crypto from "crypto"
import { Schema, model } from "mongoose"

export const Group = model("Group", new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    inviteToken: { 
        type: String, 
        required: true,
        unique: true,
        default: crypto.randomUUID
    },
    isPrivate: { 
        type: Boolean,
        required: true,
        default: false 
    },
    users: { 
        type: Array,
        required: true, 
        default: [] 
    },
    messages: { 
        type: Array,
        required: true, 
        default: []
    },
}, { timestamps: true }))