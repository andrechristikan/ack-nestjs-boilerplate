import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { NextFunction, Response } from 'express';
import compression from 'compression';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestCompressionMiddleware } from '@common/request/middlewares/request.compression.middleware';

vi.mock('compression', () => ({
    default: vi.fn(),
}));

describe('RequestCompressionMiddleware', () => {
    let middleware: RequestCompressionMiddleware;
    let req: IRequestApp;
    let res: Response;
    let next: NextFunction;
    let handler: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.resetAllMocks();

        handler = vi.fn();
        (compression as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
            handler
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [RequestCompressionMiddleware],
        }).compile();

        middleware = module.get(RequestCompressionMiddleware);

        req = {} as IRequestApp;
        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('applies compression to the response', () => {
            middleware.use(req, res, next);

            expect(compression).toHaveBeenCalledWith();
            expect(handler).toHaveBeenCalledWith(req, res, next);
        });
    });
});
