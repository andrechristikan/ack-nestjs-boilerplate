import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';

@Injectable()
export class AppCustomCountryMiddleware implements NestMiddleware {
    private readonly availableCountry: string[];
    private readonly headerCountry: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService
    ) {
        this.availableCountry = this.configService.get<string[]>(
            'app.country.available'
        );
        this.headerCountry =
            this.configService.get<string>('app.country.header');
    }

    async use(
        req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        let customCountry: string = this.configService.get<string>(
            'app.country.default'
        );

        const reqCountries: string = req.headers[this.headerCountry] as string;
        if (reqCountries) {
            const country: string[] = this.filterCountry(reqCountries);

            if (country.length > 0) {
                customCountry = reqCountries;
            }
        }

        req.__country = customCountry;
        req.headers[this.headerCountry] = customCountry;

        next();
    }

    private filterCountry(customCountry: string): string[] {
        return this.helperArrayService.getIntersection(
            [customCountry],
            this.availableCountry
        );
    }
}
