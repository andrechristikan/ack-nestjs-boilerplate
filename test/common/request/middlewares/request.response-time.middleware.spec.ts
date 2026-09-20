import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

import { RequestResponseTimeMiddleware } from '@common/request/middlewares/request.response-time.middleware';

describe('RequestResponseTimeMiddleware', () => {
    const middleware = new RequestResponseTimeMiddleware();

    it('calls next and adds X-Response-Time in milliseconds when headers are written', async () => {
        const req = new IncomingMessage(new Socket());
        const res = new ServerResponse(req);
        const next = vi.fn();

        await middleware.use(
            req as Request,
            res as Response,
            next as NextFunction
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.getHeader('X-Response-Time')).toBeUndefined();

        res.writeHead(200);

        expect(res.getHeader('X-Response-Time')).toMatch(/^\d+(\.\d+)?ms$/);
    });
});
