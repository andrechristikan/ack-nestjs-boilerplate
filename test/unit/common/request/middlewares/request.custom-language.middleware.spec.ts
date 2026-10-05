import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Response } from 'express';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    RequestCustomLangHeaderName,
    RequestLanguageStoreKey,
} from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestCustomLanguageMiddleware } from '@common/request/middlewares/request.custom-language.middleware';

describe('RequestCustomLanguageMiddleware', () => {
    const configGet = vi.fn<(key: string) => string | string[] | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let middleware: RequestCustomLanguageMiddleware;
    let res: Response;
    let next: NextFunction;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | string[]> = {
                'message.availableLanguage': ['en', 'id'],
                'message.language': 'en',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestCustomLanguageMiddleware,
                { provide: ConfigService, useValue: configService },
                { provide: HelperArrayService, useValue: helperArrayService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        middleware = module.get(RequestCustomLanguageMiddleware);

        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('stores and echoes back a supported custom language header', async () => {
            const req = {
                headers: { [RequestCustomLangHeaderName]: 'id' },
            } as unknown as IRequestApp;
            helperArrayService.intersection.mockReturnValue(['id']);

            await middleware.use(req, res, next);

            expect(helperArrayService.intersection).toHaveBeenCalledWith(
                ['id'],
                ['en', 'id']
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestLanguageStoreKey,
                'id'
            );
            expect(req.headers[RequestCustomLangHeaderName]).toBe('id');
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('falls back to the default language for an unsupported custom language header', async () => {
            const req = {
                headers: { [RequestCustomLangHeaderName]: 'fr' },
            } as unknown as IRequestApp;
            helperArrayService.intersection.mockReturnValue([]);

            await middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestLanguageStoreKey,
                'en'
            );
            expect(req.headers[RequestCustomLangHeaderName]).toBe('en');
        });

        it('falls back to the default language when no custom language header is present', async () => {
            const req = { headers: {} } as unknown as IRequestApp;

            await middleware.use(req, res, next);

            expect(helperArrayService.intersection).not.toHaveBeenCalled();
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestLanguageStoreKey,
                'en'
            );
            expect(req.headers[RequestCustomLangHeaderName]).toBe('en');
        });
    });

    describe('filterLanguage', () => {
        it('intersects the given language with the available languages', () => {
            helperArrayService.intersection.mockReturnValue(['id']);

            expect(middleware['filterLanguage']('id')).toEqual(['id']);
            expect(helperArrayService.intersection).toHaveBeenCalledWith(
                ['id'],
                ['en', 'id']
            );
        });
    });
});
