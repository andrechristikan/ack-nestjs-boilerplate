console.log(process.env['NODE_ENV']);

process.env['NODE_ENV'] = process.env['APP_ENV'] || 'development';

console.log(process.env['NODE_ENV']);

export default {
    env: process.env.APP_ENV || 'development',
    language: process.env.APP_LANGUAGE || 'en',
    debug: process.env.APP_DEBUG || false,
    http: {
        host: process.env.APP_HOST || 'localhost',
        port: parseInt(process.env.APP_PORT) || 3000
    }
};
