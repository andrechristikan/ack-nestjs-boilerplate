import { ExecutionContext } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { AppCustomLanguageMiddleware } from 'src/app/middlewares/app.custom-language.middleware';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { ConfigService } from '@nestjs/config';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

describe('AppCustomLanguageMiddleware', () => {
    let middleware: AppCustomLanguageMiddleware;

    const mockConfigService = {
        get: jest.fn().mockImplementation(e => {
            switch (e) {
                case 'message.language':
                    return ENUM_MESSAGE_LANGUAGE.EN;
                default:
                    return [ENUM_MESSAGE_LANGUAGE.EN];
            }
        }),
    };

    const mockHelperArrayService = {
        getIntersection: jest.fn().mockReturnValue([ENUM_MESSAGE_LANGUAGE.EN]),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AppCustomLanguageMiddleware,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: HelperArrayService,
                    useValue: mockHelperArrayService,
                },
            ],
        }).compile();

        middleware = moduleRef.get<AppCustomLanguageMiddleware>(
            AppCustomLanguageMiddleware
        );
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        it('should put x-custom-lang into Request instance', () => {
            const context = createMock<ExecutionContext>();
            const request = context.switchToHttp().getRequest<IRequestApp>();
            const response = context.switchToHttp().getResponse<Response>();
            const next = jest.fn();

            request.headers['x-custom-lang'] = ENUM_MESSAGE_LANGUAGE.EN;
            middleware.use(request, response, next);

            expect(request.__language).toBeDefined();
            expect(request.__language).toBe(ENUM_MESSAGE_LANGUAGE.EN);
            expect(request.headers['x-custom-lang']).toBeDefined();
            expect(request.headers['x-custom-lang']).toBe(
                ENUM_MESSAGE_LANGUAGE.EN
            );
        });

        it('should set custom language from Request', () => {
            const context = createMock<ExecutionContext>();
            const request = context.switchToHttp().getRequest<IRequestApp>();
            const response = context.switchToHttp().getResponse<Response>();
            const next = jest.fn();

            request.headers['x-custom-lang'] = ENUM_MESSAGE_LANGUAGE.EN;
            middleware.use(request, response, next);

            expect(request.__language).toBeDefined();
            expect(request.__language).toBe(ENUM_MESSAGE_LANGUAGE.EN);
            expect(request.headers['x-custom-lang']).toBeDefined();
            expect(request.headers['x-custom-lang']).toBe(
                ENUM_MESSAGE_LANGUAGE.EN
            );
        });
    });
});
