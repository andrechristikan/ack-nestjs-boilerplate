import { Module, Global } from '@nestjs/common';
import { MessageService } from 'src/message/message.service';
import * as path from 'path';
import { I18nModule, I18nJsonParser, HeaderResolver } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { ENUM_MESSAGE_LANGUAGE } from './message.constant';

@Global()
@Module({
    providers: [MessageService],
    exports: [MessageService],
    imports: [
        I18nModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                fallbackLanguage: configService.get<string>('app.language'),
                fallbacks: Object.values(ENUM_MESSAGE_LANGUAGE).reduce(
                    (a, v) => ({ ...a, [`${v}-*`]: v }),
                    {}
                ),
                parserOptions: {
                    path: path.join(__dirname, '/languages/'),
                    watch: true,
                },
            }),
            parser: I18nJsonParser,
            inject: [ConfigService],
            resolvers: [new HeaderResolver(['x-custom-lang'])],
        }),
    ],
    controllers: [],
})
export class MessageModule {}
