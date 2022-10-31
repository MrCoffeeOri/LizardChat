const RandomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
const CharsSequence = index => String.fromCharCode(RandomBetween(97, 122)) + RandomBetween(1 * index, 100) + String.fromCharCode(RandomBetween(65, 90))

/**
 * Generates a random ID based on the given length, human friendly.
 * @param {number} length 
 * @returns string
 */
export function LengthUUID(length) {
    let UUIDchars = ''
    UUIDchars += CharsSequence(length)
    UUIDchars += RandomBetween(length, 100)
    return UUIDchars
}

/**
 * Generates a random Token.
 * @returns string
 */
export function TokenUUID() {
    const total = RandomBetween(30, 80)
    let UUIDchars = ''
    for (let i = 0; i < total; i++) UUIDchars += CharsSequence(i)
    return UUIDchars
}