import AppConfig from './app.config';
import DatabaseConfig from './database.config';
import AuthConfig from './auth.config';
import HashConfig from './hash.config';
import middlewareConfig from './middleware.config';

export default (): Record<string, any> => ({
    app: AppConfig,
    database: DatabaseConfig,
    auth: AuthConfig,
    hash: HashConfig,
    middleware: middlewareConfig
});
