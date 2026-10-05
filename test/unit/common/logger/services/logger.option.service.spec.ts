import { RequestMethod } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Response } from 'express';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { LoggerUtil } from '@common/logger/utils/logger.util';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { LoggerAutoContext } from '@common/logger/constants/logger.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { createLoggerOptionService } from '@test/unit/helpers/test.unit.logger.helper';
import type { ILoggerOptionServiceDoubles } from '@test/unit/helpers/test.unit.logger.helper';

describe('LoggerOptionService', () => {
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const requestContextService: MockProxy<RequestContextService> =
        mock<RequestContextService>();
    const loggerUtil: MockProxy<LoggerUtil> = mock<LoggerUtil>();
    const loggerDoubles: ILoggerOptionServiceDoubles = {
        helperStringService,
        helperDateService,
        requestContextService,
        loggerUtil,
    };

    const baseConfig: Record<string, unknown> = {
        'app.env': EnumAppEnvironment.development,
        'app.name': 'app-name',
        'app.version': '1.0.0',
        'logger.auto': true,
        'logger.enable': true,
        'logger.level': EnumLoggerLevel.info,
        'logger.intoFile': false,
        'logger.filePath': '/logs',
        'logger.prettier': false,
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('createOptions', () => {
        it('assembles the pino-http options from the config and the builders', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.enable': true },
                loggerDoubles
            );
            loggerUtil.getRequestId.mockReturnValue('req-id');

            const options = await service.createOptions();

            expect(options.forRoutes).toEqual([
                { path: '{*wildcard}', method: RequestMethod.ALL },
            ]);
            const pinoHttp = options.pinoHttp as unknown as {
                genReqId: (req: IRequestApp) => string;
                messageKey: string;
                timestamp: boolean;
                wrapSerializers: boolean;
                base: null;
                level: string;
            };
            expect(pinoHttp.messageKey).toBe('msg');
            expect(pinoHttp.timestamp).toBe(false);
            expect(pinoHttp.wrapSerializers).toBe(false);
            expect(pinoHttp.base).toBeNull();
            expect(pinoHttp.level).toBe(EnumLoggerLevel.info);
            expect(pinoHttp.genReqId({} as IRequestApp)).toBe('req-id');
        });

        it('sets the pino level to silent when logging is disabled', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.enable': false },
                loggerDoubles
            );

            const options = await service.createOptions();

            const pinoHttp = options.pinoHttp as unknown as {
                level: string;
            };
            expect(pinoHttp.level).toBe('silent');
        });
    });

    describe('buildTransports', () => {
        it('returns undefined when neither transport is enabled', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );

            expect(service['buildTransports']()).toBeUndefined();
        });

        it('adds a pino-pretty target when prettier is enabled', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.prettier': true },
                loggerDoubles
            );

            const transport = service['buildTransports']() as {
                targets: { target: string; level: string }[];
            };

            expect(transport.targets).toHaveLength(1);
            expect(transport.targets[0]).toMatchObject({
                target: 'pino-pretty',
                level: EnumLoggerLevel.info,
            });
        });

        it('adds a pino-roll target when file logging is enabled', async () => {
            const service = await createLoggerOptionService(
                {
                    ...baseConfig,
                    'logger.intoFile': true,
                    'logger.filePath': '/logs',
                },
                loggerDoubles
            );

            const transport = service['buildTransports']() as {
                targets: { target: string; options: { file: string } }[];
            };

            expect(transport.targets).toHaveLength(1);
            expect(transport.targets[0].target).toBe('pino-roll');
            expect(transport.targets[0].options.file).toBe('./logs/api.log');
        });

        it('adds both targets when prettier and file logging are enabled', async () => {
            const service = await createLoggerOptionService(
                {
                    ...baseConfig,
                    'logger.prettier': true,
                    'logger.intoFile': true,
                },
                loggerDoubles
            );

            const transport = service['buildTransports']() as {
                targets: unknown[];
            };

            expect(transport.targets).toHaveLength(2);
        });
    });

    describe('createRedactionConfig', () => {
        it('builds the redaction paths, censor and remove flag', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );

            const config = service['createRedactionConfig']();

            expect(config.censor).toBe('[REDACTED]');
            expect(config.remove).toBe(false);
            expect(config.paths.length).toBeGreaterThan(0);
            expect(config.paths).toContain('req.body.password');
            expect(config.paths).toContain('req.body["x-api-key"]');
        });
    });

    describe('createSerializers', () => {
        it('delegates each serializer to LoggerUtil', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            const request = {} as IRequestApp;
            const response = {} as Response;
            const error = new Error('boom');

            loggerUtil.serializeRequest.mockReturnValue({ id: 'r' });
            loggerUtil.serializeResponse.mockReturnValue({ httpCode: 200 });
            loggerUtil.serializeError.mockReturnValue({ type: 'Error' });

            const serializers = service['createSerializers']();

            expect(serializers.req(request)).toEqual({ id: 'r' });
            expect(serializers.res(response)).toEqual({ httpCode: 200 });
            expect(serializers.err(error)).toEqual({ type: 'Error' });
            expect(loggerUtil.serializeRequest).toHaveBeenCalledWith(request);
            expect(loggerUtil.serializeResponse).toHaveBeenCalledWith(response);
            expect(loggerUtil.serializeError).toHaveBeenCalledWith(error);
        });
    });

    describe('addDebugInfo', () => {
        it('returns undefined in production', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'app.env': EnumAppEnvironment.production },
                loggerDoubles
            );

            expect(service['addDebugInfo']({ pid: 1 })).toBeUndefined();
        });

        it('returns memory and uptime plus the extra params outside production', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'app.env': EnumAppEnvironment.development },
                loggerDoubles
            );

            const result = service['addDebugInfo']({ pid: 123 });

            expect(result).toMatchObject({ pid: 123 });
            expect(result?.memory).toHaveProperty('rss');
            expect(result?.memory).toHaveProperty('heapUsed');
            expect(typeof result?.uptime).toBe('number');
        });
    });

    describe('createAutoLoggingConfig', () => {
        it('returns false when auto logging is disabled', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.auto': false },
                loggerDoubles
            );

            expect(service['createAutoLoggingConfig']()).toBe(false);
        });

        it('returns an ignore predicate delegating to HelperStringService when enabled', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.auto': true },
                loggerDoubles
            );
            helperStringService.checkUrlMatchesPatterns.mockReturnValue(true);
            const request = { url: '/metrics' } as IRequestApp;

            const config = service['createAutoLoggingConfig']() as {
                ignore: (req: IRequestApp) => boolean;
            };

            expect(config.ignore(request)).toBe(true);
            expect(
                helperStringService.checkUrlMatchesPatterns
            ).toHaveBeenCalledWith('/metrics', expect.any(Array));
        });
    });

    describe('createMixin', () => {
        it('returns the pino level unchanged', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );

            const mixin = service['createMixin']();

            expect(mixin({}, 30)).toEqual({ level: 30 });
        });
    });

    describe('createLogFormatter', () => {
        it('shapes a plain log record, adding debug info outside production', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'app.env': EnumAppEnvironment.development },
                loggerDoubles
            );
            const today = new Date('2026-01-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(today);
            requestContextService.getHostname.mockReturnValue('host-1');
            loggerUtil.mapLevelToSeverity.mockReturnValue('INFO');
            loggerUtil.sanitizeMessage.mockImplementation(m => m);

            const formatter = service['createLogFormatter']();
            const result = formatter({
                level: 30,
                msg: 'hello',
                extra: 'field',
            });

            expect(result).toMatchObject({
                severity: 'INFO',
                context: LoggerAutoContext,
                timestamp: today.valueOf(),
                msg: 'hello',
                service: {
                    name: 'app-name',
                    environment: EnumAppEnvironment.development,
                    version: '1.0.0',
                },
                additionalData: { extra: 'field' },
            });
            expect(result.debug).toBeDefined();
        });

        it('keeps the given context when present', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            helperDateService.create.mockReturnValue(new Date());
            requestContextService.getHostname.mockReturnValue('host-1');
            loggerUtil.mapLevelToSeverity.mockReturnValue('INFO');
            loggerUtil.sanitizeMessage.mockImplementation(m => m);

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 30, context: 'CustomContext' });

            expect(result.context).toBe('CustomContext');
        });

        it('omits additionalData when nothing else remains', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            helperDateService.create.mockReturnValue(new Date());
            requestContextService.getHostname.mockReturnValue('host-1');
            loggerUtil.mapLevelToSeverity.mockReturnValue('INFO');
            loggerUtil.sanitizeMessage.mockImplementation(m => m);

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 30 });

            expect(result.additionalData).toBeUndefined();
        });

        it('omits debug info in production', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'app.env': EnumAppEnvironment.production },
                loggerDoubles
            );
            helperDateService.create.mockReturnValue(new Date());
            requestContextService.getHostname.mockReturnValue('host-1');
            loggerUtil.mapLevelToSeverity.mockReturnValue('INFO');
            loggerUtil.sanitizeMessage.mockImplementation(m => m);

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 30 });

            expect(result.debug).toBeUndefined();
        });

        it('serializes an error via LoggerUtil, preferring the error field over err', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            helperDateService.create.mockReturnValue(new Date());
            requestContextService.getHostname.mockReturnValue('host-1');
            loggerUtil.mapLevelToSeverity.mockReturnValue('ERROR');
            loggerUtil.sanitizeMessage.mockImplementation(m => m);
            loggerUtil.serializeError.mockReturnValue({ type: 'Error' });
            const error = new Error('boom');
            const wrapped = new Error('wrapped');

            const formatter = service['createLogFormatter']();
            const result = formatter({
                level: 50,
                err: wrapped,
                error,
            });

            expect(loggerUtil.serializeError).toHaveBeenCalledWith(error);
            expect(result.err).toEqual({ type: 'Error' });
        });

        it('serializes err when no error field is present', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            helperDateService.create.mockReturnValue(new Date());
            requestContextService.getHostname.mockReturnValue('host-1');
            loggerUtil.mapLevelToSeverity.mockReturnValue('ERROR');
            loggerUtil.sanitizeMessage.mockImplementation(m => m);
            loggerUtil.serializeError.mockReturnValue({ type: 'Error' });
            const wrapped = new Error('wrapped');

            const formatter = service['createLogFormatter']();
            formatter({ level: 50, err: wrapped });

            expect(loggerUtil.serializeError).toHaveBeenCalledWith(wrapped);
        });

        it('carries the raw res and req fields through when present', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            helperDateService.create.mockReturnValue(new Date());
            requestContextService.getHostname.mockReturnValue('host-1');
            loggerUtil.mapLevelToSeverity.mockReturnValue('INFO');
            loggerUtil.sanitizeMessage.mockImplementation(m => m);
            const req = { id: 'r' };
            const res = { httpCode: 200 };

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 30, req, res });

            expect(result.req).toBe(req);
            expect(result.res).toBe(res);
        });

        it('falls back to msg when message is absent', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            helperDateService.create.mockReturnValue(new Date());
            requestContextService.getHostname.mockReturnValue('host-1');
            loggerUtil.mapLevelToSeverity.mockReturnValue('INFO');
            loggerUtil.sanitizeMessage.mockImplementation(m => m);

            const formatter = service['createLogFormatter']();
            formatter({ level: 30, msg: 'from-msg' });

            expect(loggerUtil.sanitizeMessage).toHaveBeenCalledWith('from-msg');
        });

        it('prefers message over msg when both are present', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            helperDateService.create.mockReturnValue(new Date());
            requestContextService.getHostname.mockReturnValue('host-1');
            loggerUtil.mapLevelToSeverity.mockReturnValue('INFO');
            loggerUtil.sanitizeMessage.mockImplementation(m => m);

            const formatter = service['createLogFormatter']();
            formatter({ level: 30, msg: 'from-msg', message: 'from-message' });

            expect(loggerUtil.sanitizeMessage).toHaveBeenCalledWith(
                'from-message'
            );
        });
    });
});
