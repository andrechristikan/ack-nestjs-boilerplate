import { IRequestApp } from '@common/request/interfaces/request.interface';
import { TenantHeaderId } from '@modules/tenant/constants/tenant.constant';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';

@Injectable()
export class RequestTenantMiddleware implements NestMiddleware {
    use(req: IRequestApp, _res: Response, next: NextFunction): void {
        const tenantId = req.headers[TenantHeaderId];
        if (tenantId && typeof tenantId === 'string') {
            req.__tenantId = tenantId;
            req.headers[TenantHeaderId] = tenantId;
        }

        next();
    }
}
