import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import responseTime from 'response-time';
import { RequestResponseTimeMiddleware } from '@common/request/middlewares/request.response-time.middleware';

vi.mock('response-time', () => ({
    default: vi.fn(),
}));

describe('RequestResponseTimeMiddleware', () => {
    let middleware: RequestResponseTimeMiddleware;
    let req: Request;
    let res: Response;
    let next: NextFunction;
    let handler: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.resetAllMocks();

        handler = vi.fn();
        (responseTime as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
            handler
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [RequestResponseTimeMiddleware],
        }).compile();

        middleware = module.get(RequestResponseTimeMiddleware);

        req = {} as Request;
        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('adds the X-Response-Time header via response-time', async () => {
            await middleware.use(req, res, next);

            expect(responseTime).toHaveBeenCalledWith();
            expect(handler).toHaveBeenCalledWith(req, res, next);
        });
    });
});
