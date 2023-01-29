import { Schema, model } from "mongoose"

export const Dm = model("Dm", new Schema({
    name: String,
    block: { 
        type: { 
            by: String, 
            date: Date, 
            reason: String 
        },
        required: true,
        default: null
    },
    users: { 
        type: Array, 
        default: [] 
    },
    messages: { 
        type: Array, 
        default: [] 
    }
}, { timestamps: true }))