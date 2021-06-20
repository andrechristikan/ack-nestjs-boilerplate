export default {
    env: process.env.APP_ENV || 'development',
    language: process.env.APP_LANGUAGE || 'en',
    debug: process.env.APP_DEBUG === 'true' ? true : false,
    http: {
        host: process.env.APP_HOST || 'localhost',
        port: parseInt(process.env.APP_PORT) || 3000
    },
    logger: {
        http: {
            silent: true,
            maxFiles: 5,
            maxSize: '10M'
        },
        system: {
            silent: true,
            maxFiles: '7d',
            maxSize: '10m'
        }
    }
};
