import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    RequestCorrelationIdHeaderName,
    RequestCorrelationIdStoreKey,
    RequestCustomLangHeaderName,
    RequestIdHeaderName,
    RequestIdStoreKey,
    RequestLanguageStoreKey,
    RequestVersionStoreKey,
} from '@common/request/constants/request.constant';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    ResponseRepoVersionHeaderName,
    ResponseTimestampHeaderName,
    ResponseTimezoneHeaderName,
    ResponseVersionHeaderName,
} from '@common/response/constants/response.constant';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';

describe('ResponseMetadataService', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let configService: MockProxy<ConfigService>;

    const today = new Date('2026-01-01T00:00:00.000Z');
    let service: ResponseMetadataService;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(today);
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'app.timezone': 'Asia/Jakarta',
            'message.defaultLanguage': 'id',
            'app.urlVersioning.defaultVersion': '1',
            'app.version': '1.0.0',
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseMetadataService,
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ConfigService, useValue: configService },
                HelperDateService,
            ],
        }).compile();

        service = module.get(ResponseMetadataService);
    });

    describe('create', () => {
        it('builds metadata from the stored language and version', () => {
            requestStoreService.get.mockImplementation((key: string) => {
                const stored: Record<string, unknown> = {
                    [RequestLanguageStoreKey]: EnumMessageLanguage.en,
                    [RequestVersionStoreKey]: '2',
                    [RequestIdStoreKey]: 'request-id',
                    [RequestCorrelationIdStoreKey]: 'correlation-id',
                };
                return stored[key] ?? null;
            });

            const result = service.create();

            expect(result).toEqual<ResponseMetadataDto>({
                language: EnumMessageLanguage.en,
                timestamp: '2026-01-01T07:00:00.000+07:00',
                timezone: 'Asia/Jakarta',
                version: '2',
                repoVersion: '1.0.0',
                requestId: 'request-id',
                correlationId: 'correlation-id',
            });
        });

        it('falls back to the default language and URL version when the store carries none', () => {
            requestStoreService.get.mockImplementation((key: string) => {
                const stored: Record<string, unknown> = {
                    [RequestIdStoreKey]: 'request-id',
                    [RequestCorrelationIdStoreKey]: 'correlation-id',
                };
                return stored[key] ?? null;
            });

            const result = service.create();

            expect(result).toMatchObject({
                language: 'id',
                timestamp: '2026-01-01T07:00:00.000+07:00',
                timezone: 'Asia/Jakarta',
                version: '1',
                repoVersion: '1.0.0',
                requestId: 'request-id',
                correlationId: 'correlation-id',
            });
        });

        it('falls back to the default language when the stored language is not an enum member', () => {
            requestStoreService.get.mockImplementation((key: string) => {
                const stored: Record<string, unknown> = {
                    [RequestLanguageStoreKey]: 'klingon',
                    [RequestIdStoreKey]: 'request-id',
                    [RequestCorrelationIdStoreKey]: 'correlation-id',
                };
                return stored[key] ?? null;
            });

            const result = service.create();

            expect(result.language).toBe('id');
        });

        it('answers a null request id when the store carries none', () => {
            requestStoreService.get.mockImplementation((key: string) => {
                const stored: Record<string, unknown> = {
                    [RequestCorrelationIdStoreKey]: 'correlation-id',
                };
                return stored[key] ?? null;
            });

            const result = service.create();

            expect(result.requestId).toBeNull();
            expect(result.correlationId).toBe('correlation-id');
        });

        it('answers a null correlation id when the store carries none', () => {
            requestStoreService.get.mockImplementation((key: string) => {
                const stored: Record<string, unknown> = {
                    [RequestIdStoreKey]: 'request-id',
                };
                return stored[key] ?? null;
            });

            const result = service.create();

            expect(result.requestId).toBe('request-id');
            expect(result.correlationId).toBeNull();
        });
    });

    describe('setHeaders', () => {
        it('mirrors every metadata field onto a response header', () => {
            const response: MockProxy<Response> = mock<Response>();
            const metadata: ResponseMetadataDto = {
                language: EnumMessageLanguage.en,
                timestamp: '2026-01-01T07:00:00.000+07:00',
                timezone: 'Asia/Jakarta',
                version: '1',
                repoVersion: '1.0.0',
                requestId: 'request-id',
                correlationId: 'correlation-id',
            };

            service.setHeaders(response, metadata);

            expect(response.setHeader).toHaveBeenNthCalledWith(
                1,
                RequestCustomLangHeaderName,
                metadata.language
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                2,
                ResponseTimestampHeaderName,
                metadata.timestamp
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                3,
                ResponseTimezoneHeaderName,
                metadata.timezone
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                4,
                ResponseVersionHeaderName,
                metadata.version
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                5,
                ResponseRepoVersionHeaderName,
                metadata.repoVersion
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                6,
                RequestIdHeaderName,
                metadata.requestId
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                7,
                RequestCorrelationIdHeaderName,
                metadata.correlationId
            );
            expect(response.setHeader).toHaveBeenCalledTimes(7);
        });

        it('sets no request id or correlation id header when either is null', () => {
            const response: MockProxy<Response> = mock<Response>();
            const metadata: ResponseMetadataDto = {
                language: EnumMessageLanguage.en,
                timestamp: '2026-01-01T07:00:00.000+07:00',
                timezone: 'Asia/Jakarta',
                version: '1',
                repoVersion: '1.0.0',
                requestId: null,
                correlationId: null,
            };

            service.setHeaders(response, metadata);

            expect(response.setHeader).not.toHaveBeenCalledWith(
                RequestIdHeaderName,
                expect.anything()
            );
            expect(response.setHeader).not.toHaveBeenCalledWith(
                RequestCorrelationIdHeaderName,
                expect.anything()
            );
            expect(response.setHeader).toHaveBeenCalledTimes(5);
        });
    });
});
