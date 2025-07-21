import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';

@Injectable()
export class AppCustomCountryMiddleware implements NestMiddleware {
    private readonly headerCountry: string;
    private readonly defaultCountry: string;

    constructor(private readonly configService: ConfigService) {
        this.headerCountry =
            this.configService.get<string>('app.country.header');
        this.defaultCountry = this.configService.get<string>(
            'app.country.default'
        );
    }

    async use(
        req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        let customCountry: string = this.defaultCountry;
        const reqCountries: string = req.headers[this.headerCountry] as string;

        if (reqCountries) {
            customCountry = reqCountries;
        }

        req.__country = customCountry;
        req.headers[this.headerCountry] = customCountry;

        next();
    }
}
