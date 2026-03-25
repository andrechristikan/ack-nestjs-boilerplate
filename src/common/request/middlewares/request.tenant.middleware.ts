import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import { IConfigTenant } from '@configs/tenant.config';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';

@Injectable()
export class RequestTenantMiddleware implements NestMiddleware {
    private readonly headerName: string;

    constructor(private readonly configService: ConfigService) {
        this.headerName =
            this.configService.get<IConfigTenant>('tenant').header;
    }

    use(req: IRequestAppWithTenant, _res: Response, next: NextFunction): void {
        const tenantId = req.headers[this.headerName];
        if (tenantId && typeof tenantId === 'string') {
            req.__tenantId = tenantId;
        }

        next();
    }
}
