import { model, Schema } from "mongoose";
import { TokenUUID } from "../UUID.js";

export const CfmToken = model("cfmToken", new Schema({
    email: String,
    name: String,
    password: String,
    token: { type: String, default: TokenUUID }
}, { timestamps: true }))