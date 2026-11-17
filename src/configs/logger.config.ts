import { registerAs } from '@nestjs/config';
import appConfigFunction from '@configs/app.config';
import docConfigFunction from '@configs/doc.config';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';

export interface IConfigLogger {
    enabled: boolean;
    level: EnumLoggerLevel;
    fileEnabled: boolean;
    filePath: string;
    accessLogEnabled: boolean;
    excludedRoutes: string[];
    prettyEnabled: boolean;
}

export default registerAs('logger', (): IConfigLogger => {
    const { globalPrefix } = appConfigFunction();
    const { prefix: docPrefix } = docConfigFunction();

    return {
        enabled: process.env.LOGGER_ENABLED === 'true',
        level: process.env.LOGGER_LEVEL as EnumLoggerLevel,
        fileEnabled: process.env.LOGGER_FILE_ENABLED === 'true',
        filePath: '/logs',
        accessLogEnabled: process.env.LOGGER_ACCESS_LOG_ENABLED === 'true',
        excludedRoutes: [
            `${globalPrefix}/public/hello`,
            `${globalPrefix}/public/hello/*`,
            `${globalPrefix}/system/health`,
            `${globalPrefix}/system/health/*`,
            '/metrics',
            '/metrics/*',
            '/favicon.ico',
            docPrefix,
            `${docPrefix}/*`,
            '/',
        ],
        prettyEnabled: process.env.LOGGER_PRETTY_ENABLED === 'true',
    };
});
