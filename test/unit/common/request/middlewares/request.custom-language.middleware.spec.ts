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
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('RequestCustomLanguageMiddleware', () => {
    let configService: MockProxy<ConfigService>;
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let middleware: RequestCustomLanguageMiddleware;
    let res: Response;
    let next: NextFunction;

    beforeEach(async () => {
        configService = buildConfigService({
            'message.availableLanguages': ['en', 'id'],
            'message.defaultLanguage': 'en',
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestCustomLanguageMiddleware,
                { provide: ConfigService, useValue: configService },
                HelperArrayService,
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

            await middleware.use(req, res, next);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestLanguageStoreKey,
                'id'
            );
            expect(req.headers[RequestCustomLangHeaderName]).toBe('id');
            expect(next).toHaveBeenCalledTimes(1);
        });

        it.each([
            ['en-US', 'en'],
            ['ID', 'id'],
            ['id_ID', 'id'],
            [' id-ID,en;q=0.9', 'id'],
        ])(
            'checks the primary subtag of the custom language header %s against the supported languages',
            async (header, primary) => {
                const req = {
                    headers: { [RequestCustomLangHeaderName]: header },
                } as unknown as IRequestApp;

                await middleware.use(req, res, next);
                expect(requestStoreService.set).toHaveBeenCalledWith(
                    RequestLanguageStoreKey,
                    primary
                );
                expect(req.headers[RequestCustomLangHeaderName]).toBe(primary);
            }
        );

        it('falls back to the default language for an unsupported custom language header', async () => {
            const req = {
                headers: { [RequestCustomLangHeaderName]: 'fr' },
            } as unknown as IRequestApp;

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

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestLanguageStoreKey,
                'en'
            );
            expect(req.headers[RequestCustomLangHeaderName]).toBe('en');
        });
    });

    describe('normalizeLanguage', () => {
        it('returns the lowercased primary subtag of the first listed language', () => {
            expect(middleware['normalizeLanguage']('EN-us,id;q=0.5')).toBe(
                'en'
            );
        });
    });

    describe('filterLanguage', () => {
        it('returns the given language only when it is available', () => {
            expect(middleware['filterLanguage']('id')).toEqual(['id']);
            expect(middleware['filterLanguage']('fr')).toEqual([]);
        });
    });
});
