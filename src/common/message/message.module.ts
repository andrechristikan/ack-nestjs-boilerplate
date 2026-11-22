import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import * as path from 'path';
import { HeaderResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { MessageService } from '@common/message/services/message.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { RequestCustomLangHeaderName } from '@common/request/constants/request.constant';

/** Shared module: MessageService for every service, filter, and interceptor translating a message key. */
@Global()
@Module({})
export class MessageModule {
    static forRoot(): DynamicModule {
        return {
            module: MessageModule,
            controllers: [],
            providers: [MessageService],
            exports: [MessageService],
            imports: [
                I18nModule.forRootAsync({
                    imports: [],
                    loader: I18nJsonLoader,
                    inject: [ConfigService],
                    resolvers: [
                        new HeaderResolver([RequestCustomLangHeaderName]),
                    ],
                    useFactory: (configService: ConfigService) => ({
                        fallbackLanguage: configService.get<string>(
                            'message.defaultLanguage'
                        )!,
                        fallbacks: Object.values(EnumMessageLanguage).reduce(
                            (a, v) => ({ ...a, [`${v}-*`]: v }),
                            {}
                        ),
                        loaderOptions: {
                            path: path.join(
                                import.meta.dirname,
                                '../../languages'
                            ),
                            watch: true,
                        },
                    }),
                }),
            ],
        };
    }
}
