export default (): Record<string, any> => ({
    hash: {
        passwordSaltLength: 8,
        encryptionKey: '1234567890',
        encryptionIv: '1234567890123456' // must 16 char
    }
});
