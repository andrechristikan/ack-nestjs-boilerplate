import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';

@Injectable()
export class AppCountryMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    async use(
        req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        const customCountry: string =
            this.configService.get<string>('app.country');
        req['__country'] = customCountry;

        next();
    }
}
