export default (): Record<string, any> => ({
    helper: {
        encryptionKey: '1234567890',
        encryptionIv: '1234567890123456', // must 16 char
        salt: {
            length: 8
        },
        jwt: {
            secretKey: '123456',
            expirationTime: '1h',
            notBeforeExpirationTime: '1h'
        }
    }
});
