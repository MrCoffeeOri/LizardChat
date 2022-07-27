import { users } from "./DB.js";

const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

function RandomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function LengthUUID(length) {
    let UUIDchars = ''
    for (let i = 0; i < 4; i++)
        UUIDchars += Math.floor(Math.random() * 4) % 2 == 0 ? alphabet[Math.floor(Math.random() * alphabet.length)] : alphabet[Math.floor(Math.random() * alphabet.length)].toUpperCase()
    UUIDchars += RandomBetween(length, 100)
    return UUIDchars
}

export function TokenUUID() {
    let UUIDchars = ''
    for (let i = 0; i < RandomBetween(30, 80); i++) {
        UUIDchars += Math.floor(Math.random() * 4) % 2 == 0 ? alphabet[Math.floor(Math.random() * alphabet.length)] : alphabet[Math.floor(Math.random() * alphabet.length)].toUpperCase()
        UUIDchars += RandomBetween(1 * i, 100)
    }
    return UUIDchars
}