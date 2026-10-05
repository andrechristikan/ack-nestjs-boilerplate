import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    RequestCorrelationIdStoreKey,
    RequestIdStoreKey,
    RequestLanguageStoreKey,
    RequestVersionStoreKey,
} from '@common/request/constants/request.constant';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';

describe('ResponseMetadataService', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const today = new Date('2026-01-01T00:00:00.000Z');
    let service: ResponseMetadataService;

    const configValues: Record<string, unknown> = {
        'message.language': EnumMessageLanguage.en,
        'app.urlVersion.version': '1',
        'app.version': '1.0.0',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseMetadataService,
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = module.get(ResponseMetadataService);
    });

    describe('create', () => {
        it('builds metadata from the stored language and version', () => {
            helperDateService.create.mockReturnValue(today);
            helperDateService.getTimestamp.mockReturnValue(today.getTime());
            helperDateService.getZone.mockReturnValue('Asia/Jakarta');
            requestStoreService.get.mockImplementation((key: string) => {
                const stored: Record<string, unknown> = {
                    [RequestLanguageStoreKey]: 'id',
                    [RequestVersionStoreKey]: '2',
                    [RequestIdStoreKey]: 'request-id',
                    [RequestCorrelationIdStoreKey]: 'correlation-id',
                };
                return stored[key] ?? null;
            });

            const result = service.create();

            expect(result).toEqual<ResponseMetadataDto>({
                language: 'id' as EnumMessageLanguage,
                timestamp: today.getTime(),
                timezone: 'Asia/Jakarta',
                version: '2',
                repoVersion: '1.0.0',
                requestId: 'request-id',
                correlationId: 'correlation-id',
            });
        });

        it('falls back to the default language and URL version when the store carries none', () => {
            helperDateService.create.mockReturnValue(today);
            helperDateService.getTimestamp.mockReturnValue(today.getTime());
            helperDateService.getZone.mockReturnValue('Asia/Jakarta');
            requestStoreService.get.mockImplementation((key: string) => {
                const stored: Record<string, unknown> = {
                    [RequestIdStoreKey]: 'request-id',
                    [RequestCorrelationIdStoreKey]: 'correlation-id',
                };
                return stored[key] ?? null;
            });

            const result = service.create();

            expect(result).toEqual<ResponseMetadataDto>({
                language: EnumMessageLanguage.en,
                timestamp: today.getTime(),
                timezone: 'Asia/Jakarta',
                version: '1',
                repoVersion: '1.0.0',
                requestId: 'request-id',
                correlationId: 'correlation-id',
            });
        });
    });

    describe('setHeaders', () => {
        it('mirrors every metadata field onto a response header', () => {
            const response: MockProxy<Response> = mock<Response>();
            const metadata: ResponseMetadataDto = {
                language: EnumMessageLanguage.en,
                timestamp: today.getTime(),
                timezone: 'Asia/Jakarta',
                version: '1',
                repoVersion: '1.0.0',
                requestId: 'request-id',
                correlationId: 'correlation-id',
            };

            service.setHeaders(response, metadata);

            expect(response.setHeader).toHaveBeenNthCalledWith(
                1,
                'x-custom-lang',
                metadata.language
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                2,
                'x-timestamp',
                metadata.timestamp
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                3,
                'x-timezone',
                metadata.timezone
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                4,
                'x-version',
                metadata.version
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                5,
                'x-repo-version',
                metadata.repoVersion
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                6,
                'x-request-id',
                metadata.requestId
            );
            expect(response.setHeader).toHaveBeenNthCalledWith(
                7,
                'x-correlation-id',
                metadata.correlationId
            );
            expect(response.setHeader).toHaveBeenCalledTimes(7);
        });
    });
});
