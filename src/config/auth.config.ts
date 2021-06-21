export default (): Record<string, any> => ({
    auth: {
        defaultUsername: 'email',
        jwtSecretKey: process.env.AUTH_JWT_SECRET_KEY || '123456',
        jwtExpirationTime: process.env.AUTH_JWT_EXPIRATION_TIME || '1h',
        basicTokenClientId: '123456',
        basicTokenClientSecret: '1234567890'
    }
});
