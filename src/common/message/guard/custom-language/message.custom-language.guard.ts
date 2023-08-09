import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { MessageService } from 'src/common/message/services/message.service';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import {GqlExecutionContext} from "@nestjs/graphql";
@Injectable()
export class MessageCustomLanguageGuard implements CanActivate {
    constructor(
        private readonly helperArrayService: HelperArrayService,
        private readonly messageService: MessageService
    ) {}

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const gqlContext=GqlExecutionContext.create(context)
        const request: IRequestApp = gqlContext.getContext().req;

        let language: string = this.messageService.getLanguage();
        const availableLanguages: string[] =
            this.messageService.getAvailableLanguages();
        let customLang: string[] = [language];

        const reqLanguages: string = request.headers['x-custom-lang'] as string;
        if (reqLanguages) {
            const splitLanguage: string[] = reqLanguages
                .split(',')
                .map((val) => val.toLowerCase());
            const languages: string[] =
                this.helperArrayService.filterIncludeUniqueByArray(
                    availableLanguages,
                    splitLanguage
                );

            if (languages.length > 0) {
                language = languages.join(',');
                customLang = languages;
            }
        }

        request.__customLang = customLang;
        request.__xCustomLang = language;
        request.headers['x-custom-lang'] = language;

        return true;
    }
}