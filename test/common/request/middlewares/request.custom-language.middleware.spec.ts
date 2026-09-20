import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { RequestLanguageStoreKey } from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestCustomLanguageMiddleware } from '@common/request/middlewares/request.custom-language.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestCustomLanguageMiddleware', () => {
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);
    const helperArrayService = new HelperArrayService();
    const requestStoreService: Pick<RequestStoreService, 'set'> = {
        set: vi.fn(),
    };
    const requestStoreSet = vi.mocked(requestStoreService.set);
    const next = vi.fn<() => void>();
    let middleware: RequestCustomLanguageMiddleware;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation(key =>
            key === 'message.availableLanguage' ? ['en'] : 'en'
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestCustomLanguageMiddleware,
                { provide: ConfigService, useValue: configService },
                { provide: HelperArrayService, useValue: helperArrayService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        middleware = moduleRef.get(RequestCustomLanguageMiddleware);
    });

    it.each([
        ['en', 'en'],
        ['fr', 'en'],
        [undefined, 'en'],
    ])('resolves header %s to %s', async (header, expected) => {
        const request = createMock<IRequestApp>({
            headers: header ? { 'x-custom-lang': header } : {},
        });
        await middleware.use(request, createMock<Response>(), next);

        expect(request.headers['x-custom-lang']).toBe(expected);
        expect(requestStoreSet).toHaveBeenCalledWith(
            RequestLanguageStoreKey,
            expected
        );
        expect(next).toHaveBeenCalledTimes(1);
    });
});
