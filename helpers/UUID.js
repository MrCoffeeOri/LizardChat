const RandomBetween = (min, max) => Math.abs(Math.floor(Math.random() * (max - min + 1) + min))

/**
 * Generates a random ID based on the given length, human friendly.
 * @param {number} length 
 * @returns string
 */
export function LengthUUID(length) {
    return String.fromCharCode(RandomBetween(97, 122)) + RandomBetween(length, 100) + String.fromCharCode(RandomBetween(65, 90)) + RandomBetween(length, 100)
}