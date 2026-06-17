import { DynamicModule, Module } from '@nestjs/common';
import * as path from 'path';
import { HeaderResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { MessageService } from '@common/message/services/message.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

/**
 * Global i18n module: JSON loader plus `x-custom-lang` header resolver, exposing `MessageService`.
 */
@Module({})
export class MessageModule {
    static forRoot(): DynamicModule {
        return {
            module: MessageModule,
            global: true,
            providers: [MessageService],
            exports: [MessageService],
            imports: [
                I18nModule.forRootAsync({
                    loader: I18nJsonLoader,
                    inject: [ConfigService],
                    resolvers: [new HeaderResolver(['x-custom-lang'])],
                    useFactory: (configService: ConfigService) => ({
                        fallbackLanguage: configService
                            .get<string[]>('message.availableLanguage')!
                            .join(','),
                        fallbacks: Object.values(EnumMessageLanguage).reduce(
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
