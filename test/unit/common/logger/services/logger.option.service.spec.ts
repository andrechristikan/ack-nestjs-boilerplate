import { RequestMethod } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Response } from 'express';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RequestContextService } from '@common/request/services/request.context.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    RequestActorStoreKey,
    RequestCorrelationIdStoreKey,
    RequestIdStoreKey,
} from '@common/request/constants/request.constant';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import {
    LoggerAutoContext,
    LoggerRedactedValue,
} from '@common/logger/constants/logger.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { createLoggerOptionService } from '@test/unit/helpers/test.unit.logger.helper';
import type { ILoggerOptionServiceDoubles } from '@test/unit/helpers/test.unit.logger.helper';

describe('LoggerOptionService', () => {
    const requestContextService: MockProxy<RequestContextService> =
        mock<RequestContextService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const loggerDoubles: ILoggerOptionServiceDoubles = {
        requestContextService,
        requestStoreService,
    };

    const baseConfig: Record<string, unknown> = {
        'app.env': EnumAppEnvironment.development,
        'app.name': 'app-name',
        'app.version': '1.0.0',
        'logger.accessLogEnabled': true,
        'logger.enabled': true,
        'logger.level': EnumLoggerLevel.info,
        'logger.fileEnabled': false,
        'logger.filePath': '/logs',
        'logger.prettyEnabled': false,
        'logger.excludedRoutes': ['/api/public/hello', '/metrics'],
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(() => {
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    });

    describe('createOptions', () => {
        it('assembles the pino-http options from the config and the builders', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.enabled': true },
                loggerDoubles
            );

            const options = await service.createOptions();

            expect(options.forRoutes).toEqual([
                { path: '{*wildcard}', method: RequestMethod.ALL },
            ]);
            const pinoHttp = options.pinoHttp as unknown as {
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
            expect(pinoHttp).not.toHaveProperty('genReqId');
            expect(pinoHttp).not.toHaveProperty('customProps');
        });

        it('omits the transport key when no transport is enabled', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );

            const options = await service.createOptions();

            expect(options.pinoHttp).not.toHaveProperty('transport');
        });

        it('carries the transport key when a transport is enabled', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.prettyEnabled': true },
                loggerDoubles
            );

            const options = await service.createOptions();

            expect(options.pinoHttp).toHaveProperty('transport');
        });

        it('sets the pino level to silent when logging is disabled', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.enabled': false },
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
        it('returns null when neither transport is enabled', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );

            expect(service['buildTransports']()).toBeNull();
        });

        it('adds a pino-pretty target when prettier is enabled', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.prettyEnabled': true },
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
                    'logger.fileEnabled': true,
                    'logger.filePath': '/logs',
                },
                loggerDoubles
            );

            const transport = service['buildTransports']() as {
                targets: { target: string; options: { file: string } }[];
            };

            expect(transport.targets).toHaveLength(1);
            expect(transport.targets[0]!.target).toBe('pino-roll');
            expect(transport.targets[0]!.options.file).toBe('./logs/api.log');
        });

        it('adds both targets when prettier and file logging are enabled', async () => {
            const service = await createLoggerOptionService(
                {
                    ...baseConfig,
                    'logger.prettyEnabled': true,
                    'logger.fileEnabled': true,
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
        it('serializes the request, response, and error through LoggerUtil', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            const request = {
                method: 'GET',
                url: '/users/64a1f',
                ip: '10.0.0.1',
                headers: { 'user-agent': 'agent', authorization: 'secret' },
                query: { page: '1' },
                params: { id: '64a1f' },
            } as unknown as IRequestApp;
            const response = {
                statusCode: 200,
                getHeaders: vi.fn().mockReturnValue({ 'set-cookie': 'secret' }),
                getHeader: vi.fn(),
            } as unknown as Response;
            const error = new Error('boom');

            const serializers = service['createSerializers']();

            expect(serializers.req(request)).toMatchObject({
                method: 'GET',
                route: '/users/[REDACTED]',
                ip: '10.0.0.1',
                userAgent: 'agent',
                params: { id: LoggerRedactedValue },
                headers: { authorization: LoggerRedactedValue },
            });
            expect(serializers.res(response)).toMatchObject({
                httpCode: 200,
                headers: { 'set-cookie': LoggerRedactedValue },
            });
            expect(serializers.err(error)).toMatchObject({
                type: 'Error',
                message: 'boom',
            });
        });
    });

    describe('addDebugInfo', () => {
        it('returns null in production', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'app.env': EnumAppEnvironment.production },
                loggerDoubles
            );

            expect(service['addDebugInfo']({ pid: 1 })).toBeNull();
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
                { ...baseConfig, 'logger.accessLogEnabled': false },
                loggerDoubles
            );

            expect(service['createAutoLoggingConfig']()).toBe(false);
        });

        it('returns an ignore predicate matching the configured excluded routes when enabled', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'logger.accessLogEnabled': true },
                loggerDoubles
            );
            const request = { url: '/metrics' } as IRequestApp;
            const other = { url: '/users' } as IRequestApp;

            const config = service['createAutoLoggingConfig']() as {
                ignore: (req: IRequestApp) => boolean;
            };

            expect(config.ignore(request)).toBe(true);
            expect(config.ignore(other)).toBe(false);
        });
    });

    describe('createMixin', () => {
        it('returns the pino level with the request id, correlation id, and actor from the store', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestStoreService.get.mockImplementation(key =>
                key === RequestIdStoreKey
                    ? 'request-id-1'
                    : key === RequestCorrelationIdStoreKey
                      ? 'correlation-id-1'
                      : key === RequestActorStoreKey
                        ? 'user-1'
                        : null
            );

            const mixin = service['createMixin']();

            expect(mixin({}, 30)).toEqual({
                level: 30,
                requestId: 'request-id-1',
                correlationId: 'correlation-id-1',
                userId: 'user-1',
            });
            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestIdStoreKey
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestActorStoreKey
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                RequestCorrelationIdStoreKey
            );
        });

        it('returns null ids when the store holds none', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestStoreService.get.mockReturnValue(null);

            const mixin = service['createMixin']();

            expect(mixin({}, 30)).toEqual({
                level: 30,
                requestId: null,
                correlationId: null,
                userId: null,
            });
        });
    });

    describe('createLogFormatter', () => {
        it('shapes a plain log record, adding debug info outside production', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'app.env': EnumAppEnvironment.development },
                loggerDoubles
            );
            const today = new Date('2026-01-01T00:00:00.000Z');
            vi.setSystemTime(today);
            requestContextService.getHostname.mockReturnValue('host-1');

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

        it('writes the ids at the top level and none under additionalData', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');

            const formatter = service['createLogFormatter']();
            const result = formatter({
                level: 30,
                requestId: 'request-id-1',
                correlationId: 'correlation-id-1',
                userId: 'user-1',
                extra: 'field',
            });

            expect(result).toMatchObject({
                requestId: 'request-id-1',
                correlationId: 'correlation-id-1',
                userId: 'user-1',
                additionalData: { extra: 'field' },
            });
            expect(result.additionalData).not.toHaveProperty('userId');
            expect(result.additionalData).not.toHaveProperty('requestId');
            expect(result.additionalData).not.toHaveProperty('correlationId');
        });

        it('writes both ids as top-level null when the mixin supplies null', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');

            const formatter = service['createLogFormatter']();
            const result = formatter({
                level: 30,
                requestId: null,
                correlationId: null,
                userId: null,
            });

            expect(result).toHaveProperty('requestId', null);
            expect(result).toHaveProperty('correlationId', null);
            expect(result).toHaveProperty('userId', null);
            expect(result.additionalData).toBeUndefined();
        });

        it('keeps the given context when present', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 30, context: 'CustomContext' });

            expect(result.context).toBe('CustomContext');
        });

        it('omits additionalData when nothing else remains', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 30 });

            expect(result.additionalData).toBeUndefined();
        });

        it('omits debug info in production', async () => {
            const service = await createLoggerOptionService(
                { ...baseConfig, 'app.env': EnumAppEnvironment.production },
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 30 });

            expect(result.debug).toBeUndefined();
        });

        it('serializes an error via LoggerUtil, preferring the error field over err', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');
            const error = new Error('boom');
            const wrapped = new Error('wrapped');

            const formatter = service['createLogFormatter']();
            const result = formatter({
                level: 50,
                err: wrapped,
                error,
            });

            expect(result.err).toMatchObject({
                type: 'Error',
                message: 'boom',
            });
        });

        it('serializes err when no error field is present', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');
            const wrapped = new Error('wrapped');

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 50, err: wrapped });

            expect(result.err).toMatchObject({ message: 'wrapped' });
        });

        it('serializes error when no err field is present', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');
            const error = new Error('boom');

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 50, error });

            expect(result.err).toMatchObject({
                type: 'Error',
                message: 'boom',
            });
        });

        it('carries the raw res and req fields through when present', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');
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
            requestContextService.getHostname.mockReturnValue('host-1');

            const formatter = service['createLogFormatter']();
            const result = formatter({ level: 30, msg: 'from-msg' });

            expect(result.msg).toBe('from-msg');
        });

        it('prefers message over msg when both are present', async () => {
            const service = await createLoggerOptionService(
                baseConfig,
                loggerDoubles
            );
            requestContextService.getHostname.mockReturnValue('host-1');

            const formatter = service['createLogFormatter']();
            const result = formatter({
                level: 30,
                msg: 'from-msg',
                message: 'from-message',
            });

            expect(result.msg).toBe('from-message');
        });
    });
});
