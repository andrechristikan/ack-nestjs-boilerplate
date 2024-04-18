import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class MessageCustomLanguageMiddleware implements NestMiddleware {
    constructor(private readonly messageService: MessageService) {}

    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        let customLang: string = this.messageService.getLanguage();

        const reqLanguages: string = req.headers['x-custom-lang'] as string;
        if (reqLanguages) {
            const language: string[] =
                this.messageService.filterLanguage(reqLanguages);

            if (language.length > 0) {
                customLang = reqLanguages;
            }
        }

        req.__language = customLang;
        req.headers['x-custom-lang'] = customLang;

        next();
    }
}
