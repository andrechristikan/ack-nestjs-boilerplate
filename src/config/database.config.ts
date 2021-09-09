export default (): Record<string, any> => ({
    database: {
        admin: process.env.DATABASE_ADMIN === 'true' ? true : false,
        srv: process.env.DATABASE_SRV === 'true' ? true : false,
        options: process.env.DATABASE_OPTIONS || '',
        host: process.env.DATABASE_HOST || 'localhost:27017',
        name: process.env.DATABASE_NAME || 'ack',
        user: process.env.DATABASE_USER || null,
        password: process.env.DATABASE_PASSWORD || null
    }
});
