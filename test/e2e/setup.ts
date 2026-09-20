import dotenv from 'dotenv';

dotenv.config({ path: '.env.e2e' });
dotenv.config();

process.env.APP_ENV = 'test';
process.env.NODE_ENV = 'test';
