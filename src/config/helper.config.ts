export default (): Record<string, any> => ({
    helper: {
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
