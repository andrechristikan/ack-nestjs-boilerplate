import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { RequestLanguageStoreKey } from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestCustomLanguageMiddleware } from '@common/request/middlewares/request.custom-language.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestCustomLanguageMiddleware', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const response: MockProxy<Response> = mock<Response>();
    const next = vi.fn<() => void>();
    let middleware: RequestCustomLanguageMiddleware;

    beforeEach(async () => {
        vi.mocked(configService.get).mockImplementation(key =>
            key === 'message.availableLanguage' ? ['en'] : 'en'
        );
        helperArrayService.intersection.mockImplementation(
            (a: unknown[], b: unknown[]) => a.filter(item => b.includes(item))
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
        const request: MockProxy<IRequestApp> = mock<IRequestApp>({
            headers: header ? { 'x-custom-lang': header } : {},
        });
        await middleware.use(request, response, next);

        expect(request.headers['x-custom-lang']).toBe(expected);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            RequestLanguageStoreKey,
            expected
        );
        expect(next).toHaveBeenCalledTimes(1);
    });
});
