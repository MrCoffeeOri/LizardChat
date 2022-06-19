const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

function RandomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export default function CreateUUID(length = RandomBetween(20, 30)) {
    let UUIDchars = ""
    for (let i = 0; i < length; i++) {
        UUIDchars += Math.floor(Math.random() * 4) % 2 == 0 ? alphabet[Math.floor(Math.random() * alphabet.length)] : alphabet[Math.floor(Math.random() * alphabet.length)].toUpperCase()
        UUIDchars += RandomBetween(length, 100)
    }
    return UUIDchars
}