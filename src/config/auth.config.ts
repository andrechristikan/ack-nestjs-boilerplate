export default {
    defaultUsername: 'email',
    jwtSecretKey: process.env.AUTH_JWT_SECRET_KEY || '9UbQX7iQvgaW4Bm7HwzU',
    jwtExpirationTime: process.env.AUTH_JWT_EXPIRATION_TIME || '1h',
    basicTokenClientId: '2CpQqXozZsjk',
    basicTokenClientSecret: '275tqa6S4sWCyBHBvFezJJm0QRvxK39VOgLOTXVo'
};
