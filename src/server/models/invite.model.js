import { model, Schema } from "mongoose";

export const Invite = model("Invite", new Schema({
    description: {
        type: String,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    group: {
        type: { 
            _id: Schema.Types.ObjectId, 
            token: String 
        },
        required: true
    }
}, { timestamps: true }))