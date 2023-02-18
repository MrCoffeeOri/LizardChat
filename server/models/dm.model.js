import { Schema, model } from "mongoose"

export const Dm = model("Dm", new Schema({
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
        required: true
    },
    messages: { 
        type: Array,
        required: true, 
        default: [] 
    }
}, { timestamps: true }))