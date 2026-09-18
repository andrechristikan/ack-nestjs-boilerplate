import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    RequestCorrelationIdStoreKey,
    RequestIdStoreKey,
    RequestLanguageStoreKey,
    RequestVersionStoreKey,
} from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import type { Response } from 'express';

describe('ResponseMetadataService', () => {
    const requestStoreService = createMock<Pick<RequestStoreService, 'get'>>();
    const configService: Pick<ConfigService, 'get'> = {
        get: vi.fn(),
    };
    const requestStoreGet = vi.mocked(requestStoreService.get);
    const configGet = vi.mocked(configService.get);
    const helperDateService =
        createMock<
            Pick<HelperDateService, 'create' | 'getTimestamp' | 'getZone'>
        >();

    let service: ResponseMetadataService;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation(key => {
            const values: Record<string, unknown> = {
                'message.language': EnumMessageLanguage.en,
                'app.urlVersion.version': '1',
                'app.version': '9.0.0',
            };
            return values[key];
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseMetadataService,
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = moduleRef.get(ResponseMetadataService);
    });

    it('builds metadata from request values with configured fallbacks', () => {
        const now = new Date('2026-09-09T12:00:00.000Z');
        helperDateService.create.mockReturnValue(now);
        helperDateService.getTimestamp.mockReturnValue(1_757_419_200_000);
        helperDateService.getZone.mockReturnValue('UTC');
        requestStoreGet.mockImplementation(key => {
            const values: Record<string, unknown> = {
                [RequestLanguageStoreKey]: undefined,
                [RequestVersionStoreKey]: undefined,
                [RequestIdStoreKey]: 'request-id',
                [RequestCorrelationIdStoreKey]: 'correlation-id',
            };
            return values[key];
        });

        expect(service.create()).toEqual({
            language: EnumMessageLanguage.en,
            timestamp: 1_757_419_200_000,
            timezone: 'UTC',
            version: '1',
            repoVersion: '9.0.0',
            requestId: 'request-id',
            correlationId: 'correlation-id',
        });
    });

    it('prefers request language and version and mirrors metadata to headers', () => {
        const metadata = {
            language: EnumMessageLanguage.en,
            timestamp: 123,
            timezone: 'Asia/Jakarta',
            version: '2',
            repoVersion: '9.0.0',
            requestId: 'request-id',
            correlationId: 'correlation-id',
        };
        const setHeader = vi.fn<Response['setHeader']>();
        const response = createMock<Response>({ setHeader });

        service.setHeaders(response, metadata);

        expect(setHeader).toHaveBeenCalledTimes(7);
        expect(setHeader).toHaveBeenCalledWith('x-custom-lang', 'en');
        expect(setHeader).toHaveBeenCalledWith('x-version', '2');
        expect(setHeader).toHaveBeenCalledWith('x-request-id', 'request-id');
        expect(setHeader).toHaveBeenCalledWith(
            'x-correlation-id',
            'correlation-id'
        );
    });
});
