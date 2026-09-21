import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    LoggerAutoContext,
    LoggerExcludedRoutes,
    LoggerRedactedValue,
} from '@common/logger/constants/logger.constant';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { LoggerOptionService } from '@common/logger/services/logger.option.service';
import { LoggerUtil } from '@common/logger/utils/logger.util';
import { RequestContextService } from '@common/request/services/request.context.service';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { Response } from 'express';
import type { Options } from 'pino-http';

describe('LoggerOptionService', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const requestContextService: MockProxy<RequestContextService> =
        mock<RequestContextService>();
    const loggerUtil: MockProxy<LoggerUtil> = mock<LoggerUtil>();
    const config: Record<string, unknown> = {
        'app.env': EnumAppEnvironment.development,
        'app.name': 'api',
        'app.version': '1.2.3',
        'logger.auto': true,
        'logger.enable': true,
        'logger.level': EnumLoggerLevel.debug,
        'logger.intoFile': true,
        'logger.filePath': '/logs',
        'logger.prettier': true,
    };
    let service: LoggerOptionService;

    beforeEach(async () => {
        vi.resetAllMocks();
        config['app.env'] = EnumAppEnvironment.development;
        config['logger.auto'] = true;
        config['logger.enable'] = true;
        config['logger.intoFile'] = true;
        config['logger.prettier'] = true;
        configGet.mockImplementation((key: string) => config[key]);
        helperDateService.create.mockReturnValue(
            new Date('2026-01-01T00:00:00.000Z')
        );
        requestContextService.getHostname.mockReturnValue('host');
        loggerUtil.mapLevelToSeverity.mockReturnValue('INFO');
        loggerUtil.sanitizeMessage.mockImplementation(message => message);
        loggerUtil.redactValue.mockImplementation(value => value);
        loggerUtil.serializeError.mockReturnValue({ message: 'error' });
        loggerUtil.serializeRequest.mockReturnValue({ request: true });
        loggerUtil.serializeResponse.mockReturnValue({ response: true });
        loggerUtil.getRequestId.mockReturnValue('request-id');

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                LoggerOptionService,
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: RequestContextService,
                    useValue: requestContextService,
                },
                { provide: LoggerUtil, useValue: loggerUtil },
            ],
        }).compile();

        service = moduleRef.get(LoggerOptionService);
    });

    describe('createOptions', () => {
        it('assembles enabled pretty and file transports', async () => {
            const options = await service.createOptions();
            const pinoHttp = options.pinoHttp as Options;

            expect(options.forRoutes).toEqual([
                { path: '{*wildcard}', method: RequestMethod.ALL },
            ]);
            expect(pinoHttp).toMatchObject({
                messageKey: 'msg',
                timestamp: false,
                wrapSerializers: false,
                base: null,
                level: EnumLoggerLevel.debug,
                autoLogging: expect.objectContaining({
                    ignore: expect.any(Function),
                }),
                redact: expect.objectContaining({
                    censor: LoggerRedactedValue,
                    remove: false,
                }),
                transport: {
                    targets: [
                        expect.objectContaining({ target: 'pino-pretty' }),
                        expect.objectContaining({
                            target: 'pino-roll',
                            options: expect.objectContaining({
                                file: './logs/api.log',
                            }),
                        }),
                    ],
                },
            });
            expect(
                pinoHttp.genReqId?.(mock<IRequestApp>(), mock<Response>())
            ).toBe('request-id');
            expect(pinoHttp.mixin?.({}, 40, mock())).toEqual({ level: 40 });

            const autoLogging = pinoHttp.autoLogging as {
                ignore: (request: IRequestApp) => boolean;
            };
            const request = mock<IRequestApp>();
            request.url = '/health';
            helperStringService.checkUrlMatchesPatterns.mockReturnValue(true);
            expect(autoLogging.ignore(request)).toBe(true);
            expect(
                helperStringService.checkUrlMatchesPatterns
            ).toHaveBeenCalledWith('/health', LoggerExcludedRoutes);
        });

        it('formats development records with debug and boundary data', async () => {
            const options = await service.createOptions();
            const pinoHttp = options.pinoHttp as Options;
            const formatter = pinoHttp.formatters?.log;
            const error = new Error('failed');

            const result = formatter?.({
                time: 1,
                responseTime: 2,
                level: 30,
                msg: 'message',
                req: { id: 'request' },
                res: { statusCode: 200 },
                err: error,
                error,
                extra: 'value',
            });

            expect(result).toMatchObject({
                severity: 'INFO',
                context: LoggerAutoContext,
                timestamp: 1767225600000,
                msg: 'message',
                service: {
                    name: 'api',
                    environment: EnumAppEnvironment.development,
                    version: '1.2.3',
                },
                additionalData: { extra: 'value' },
                debug: {
                    pid: expect.any(Number),
                    hostname: 'host',
                    memory: {
                        rss: expect.any(Number),
                        heapUsed: expect.any(Number),
                    },
                    uptime: expect.any(Number),
                },
                err: { message: 'error' },
                req: { id: 'request' },
                res: { statusCode: 200 },
            });
            expect(loggerUtil.serializeError).toHaveBeenCalledWith(error);

            formatter?.({ level: 30, msg: 'message', err: error });
            expect(loggerUtil.serializeError).toHaveBeenLastCalledWith(error);
        });

        it('delegates request, response, and error serialization', async () => {
            const options = await service.createOptions();
            const pinoHttp = options.pinoHttp as Options;
            const request = mock<IRequestApp>();
            const response = mock<Response>();
            const error = new Error('failure');

            expect(pinoHttp.serializers?.req?.(request)).toEqual({
                request: true,
            });
            expect(pinoHttp.serializers?.res?.(response)).toEqual({
                response: true,
            });
            expect(pinoHttp.serializers?.err?.(error)).toEqual({
                message: 'error',
            });
        });

        it('disables logging, transports, auto logging, and debug in production', async () => {
            config['app.env'] = EnumAppEnvironment.production;
            config['logger.auto'] = false;
            config['logger.enable'] = false;
            config['logger.intoFile'] = false;
            config['logger.prettier'] = false;

            const moduleRef: TestingModule = await Test.createTestingModule({
                providers: [
                    LoggerOptionService,
                    { provide: ConfigService, useValue: configService },
                    {
                        provide: HelperStringService,
                        useValue: helperStringService,
                    },
                    { provide: HelperDateService, useValue: helperDateService },
                    {
                        provide: RequestContextService,
                        useValue: requestContextService,
                    },
                    { provide: LoggerUtil, useValue: loggerUtil },
                ],
            }).compile();
            const productionService = moduleRef.get(LoggerOptionService);
            const options = await productionService.createOptions();
            const pinoHttp = options.pinoHttp as Options;
            const formatter = pinoHttp.formatters?.log;

            expect(pinoHttp).toMatchObject({
                level: 'silent',
                transport: undefined,
                autoLogging: false,
            });
            expect(
                formatter?.({ level: 30, message: 'message', context: 'ctx' })
            ).toEqual({
                severity: 'INFO',
                context: 'ctx',
                timestamp: 1767225600000,
                msg: 'message',
                service: {
                    name: 'api',
                    environment: EnumAppEnvironment.production,
                    version: '1.2.3',
                },
            });
        });
    });

    describe('addDebugInfo', () => {
        it('returns development process details', () => {
            expect(service['addDebugInfo']({ hostname: 'host' })).toMatchObject(
                {
                    hostname: 'host',
                    memory: {
                        rss: expect.any(Number),
                        heapUsed: expect.any(Number),
                    },
                    uptime: expect.any(Number),
                }
            );
        });

        it('returns undefined in production', async () => {
            config['app.env'] = EnumAppEnvironment.production;
            const moduleRef: TestingModule = await Test.createTestingModule({
                providers: [
                    LoggerOptionService,
                    { provide: ConfigService, useValue: configService },
                    {
                        provide: HelperStringService,
                        useValue: helperStringService,
                    },
                    { provide: HelperDateService, useValue: helperDateService },
                    {
                        provide: RequestContextService,
                        useValue: requestContextService,
                    },
                    { provide: LoggerUtil, useValue: loggerUtil },
                ],
            }).compile();
            const productionService = moduleRef.get(LoggerOptionService);

            expect(
                productionService['addDebugInfo']({ hostname: 'host' })
            ).toBeUndefined();
        });
    });
});
