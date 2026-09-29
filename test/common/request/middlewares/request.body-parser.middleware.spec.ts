import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { RequestBodyParserMiddleware } from '@common/request/middlewares/request.body-parser.middleware';

vi.mock('body-parser', () => ({
    default: {
        json: vi.fn(),
        urlencoded: vi.fn(),
        text: vi.fn(),
        raw: vi.fn(),
    },
}));

describe('RequestBodyParserMiddleware', () => {
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let middleware: RequestBodyParserMiddleware;
    let req: Request;
    let res: Response;
    let next: NextFunction;
    let jsonHandler: ReturnType<typeof vi.fn>;
    let urlencodedHandler: ReturnType<typeof vi.fn>;
    let textHandler: ReturnType<typeof vi.fn>;
    let rawHandler: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, number> = {
                'request.body.json.limitInBytes': 1000,
                'request.body.text.limitInBytes': 2000,
                'request.body.urlencoded.limitInBytes': 3000,
                'request.body.applicationOctetStream.limitInBytes': 4000,
            };
            return values[key];
        });

        jsonHandler = vi.fn();
        urlencodedHandler = vi.fn();
        textHandler = vi.fn();
        rawHandler = vi.fn();
        (
            bodyParser.json as unknown as ReturnType<typeof vi.fn>
        ).mockReturnValue(jsonHandler);
        (
            bodyParser.urlencoded as unknown as ReturnType<typeof vi.fn>
        ).mockReturnValue(urlencodedHandler);
        (
            bodyParser.text as unknown as ReturnType<typeof vi.fn>
        ).mockReturnValue(textHandler);
        (bodyParser.raw as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
            rawHandler
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestBodyParserMiddleware,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        middleware = module.get(RequestBodyParserMiddleware);

        req = { get: vi.fn() } as unknown as Request;
        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('parses a json body', () => {
            (req.get as ReturnType<typeof vi.fn>).mockReturnValue(
                'application/json'
            );

            middleware.use(req, res, next);

            expect(bodyParser.json).toHaveBeenCalledWith({
                limit: 1000,
                type: 'application/json',
            });
            expect(jsonHandler).toHaveBeenCalledWith(req, res, next);
        });

        it('parses a urlencoded body', () => {
            (req.get as ReturnType<typeof vi.fn>).mockReturnValue(
                'application/x-www-form-urlencoded'
            );

            middleware.use(req, res, next);

            expect(bodyParser.urlencoded).toHaveBeenCalledWith({
                extended: true,
                limit: 3000,
                type: 'application/x-www-form-urlencoded',
            });
            expect(urlencodedHandler).toHaveBeenCalledWith(req, res, next);
        });

        it('parses a text body', () => {
            (req.get as ReturnType<typeof vi.fn>).mockReturnValue('text/plain');

            middleware.use(req, res, next);

            expect(bodyParser.text).toHaveBeenCalledWith({
                limit: 2000,
                type: 'text/*',
            });
            expect(textHandler).toHaveBeenCalledWith(req, res, next);
        });

        it('parses an octet-stream body', () => {
            (req.get as ReturnType<typeof vi.fn>).mockReturnValue(
                'application/octet-stream'
            );

            middleware.use(req, res, next);

            expect(bodyParser.raw).toHaveBeenCalledWith({
                limit: 4000,
                type: 'application/octet-stream',
            });
            expect(rawHandler).toHaveBeenCalledWith(req, res, next);
        });

        it('skips parsing and calls next for an unrecognized content-type', () => {
            (req.get as ReturnType<typeof vi.fn>).mockReturnValue(
                'multipart/form-data'
            );

            middleware.use(req, res, next);

            expect(bodyParser.json).not.toHaveBeenCalled();
            expect(bodyParser.urlencoded).not.toHaveBeenCalled();
            expect(bodyParser.text).not.toHaveBeenCalled();
            expect(bodyParser.raw).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('skips parsing and calls next when content-type is absent', () => {
            (req.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

            middleware.use(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });
    });
});
