import { DynamicModule, Global, Module } from '@nestjs/common';
import * as path from 'path';
import { I18nModule, HeaderResolver, I18nJsonLoader } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { MessageService } from 'src/common/message/services/message.service';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

@Global()
@Module({})
export class MessageModule {
    static forRoot(): DynamicModule {
        return {
            module: MessageModule,
            providers: [MessageService],
            exports: [MessageService],
            imports: [
                I18nModule.forRootAsync({
                    loader: I18nJsonLoader,
                    inject: [ConfigService],
                    resolvers: [new HeaderResolver(['x-custom-lang'])],
                    useFactory: (configService: ConfigService) => ({
                        fallbackLanguage: configService
                            .get<string[]>('message.availableLanguage')
                            .join(','),
                        fallbacks: Object.values(ENUM_MESSAGE_LANGUAGE).reduce(
                            (a, v) => ({ ...a, [`${v}-*`]: v }),
                            {}
                        ),
                        loaderOptions: {
                            path: path.join(__dirname, '../../languages'),
                            watch: true,
                        },
                    }),
                }),
            ],
            controllers: [],
        };
    }
}
