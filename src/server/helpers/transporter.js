import { google } from "googleapis"
import { createTransport } from "nodemailer";
import { config } from 'dotenv'

config() // First config use 
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

export const transporter = createTransport({
    service: 'gmail',
    secure: true,
    port: process.env.EMAIL_PORT,
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: (await oAuth2Client.getAccessToken()).token
    },
});