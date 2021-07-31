export default (): Record<string, any> => ({
    auth: {
        defaultUsername: 'email',
        jwtSecretKey: process.env.AUTH_JWT_SECRET_KEY || '123456',
        jwtExpirationTime: process.env.AUTH_JWT_EXPIRATION_TIME || '1h',
        basicTokenClientId: process.env.AUTH_BASIC_TOKEN_CLIENT_ID || '123456',
        basicTokenClientSecret:
            process.env.AUTH_BASIC_TOKEN_CLIENT_SECRET || '1234567890'
    }
});
