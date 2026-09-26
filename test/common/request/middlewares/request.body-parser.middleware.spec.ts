import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestBodyParserMiddleware } from '@common/request/middlewares/request.body-parser.middleware';

const parserMocks = vi.hoisted(() => ({
    json: vi.fn(),
    raw: vi.fn(),
    text: vi.fn(),
    urlencoded: vi.fn(),
}));

vi.mock('body-parser', () => ({
    default: parserMocks,
}));

describe('RequestBodyParserMiddleware', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const next = vi.fn<() => void>();
    const response: MockProxy<Response> = mock<Response>();

    let middleware: RequestBodyParserMiddleware;

    beforeEach(async () => {
        vi.mocked(configService.get).mockImplementation(key => {
            const values: Record<string, number> = {
                'request.body.json.limitInBytes': 1_000,
                'request.body.text.limitInBytes': 2_000,
                'request.body.urlencoded.limitInBytes': 3_000,
                'request.body.applicationOctetStream.limitInBytes': 4_000,
            };
            return values[key];
        });
        for (const parser of Object.values(parserMocks)) {
            parser.mockReturnValue(
                vi.fn(
                    (
                        _request: Request,
                        _response: Response,
                        done: () => void
                    ) => done()
                )
            );
        }
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestBodyParserMiddleware,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        middleware = moduleRef.get(RequestBodyParserMiddleware);
    });

    it.each([
        [
            'application/json; charset=utf-8',
            'json',
            { limit: 1_000, type: 'application/json' },
        ],
        [
            'application/x-www-form-urlencoded',
            'urlencoded',
            {
                extended: true,
                limit: 3_000,
                type: 'application/x-www-form-urlencoded',
            },
        ],
        ['text/plain', 'text', { limit: 2_000, type: 'text/*' }],
        [
            'application/octet-stream',
            'raw',
            { limit: 4_000, type: 'application/octet-stream' },
        ],
    ] as const)(
        'selects the %s parser with configured limits',
        (contentType, parserName, options) => {
            const request: MockProxy<Request> = mock<Request>();
            request.get.mockReturnValue(contentType as never);

            middleware.use(request, response, next);

            expect(parserMocks[parserName]).toHaveBeenCalledWith(options);
            expect(next).toHaveBeenCalledTimes(1);
        }
    );

    it('leaves multipart content for the upload middleware', () => {
        const request: MockProxy<Request> = mock<Request>();
        request.get.mockReturnValue('multipart/form-data' as never);

        middleware.use(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        for (const parser of Object.values(parserMocks)) {
            expect(parser).not.toHaveBeenCalled();
        }
    });
});
