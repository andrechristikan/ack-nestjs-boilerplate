import {
    DynamicModule,
    FactoryProvider,
    Global,
    Module,
} from '@nestjs/common';
import { InviteService } from '@modules/invite/services/invite.service';
import { InviteRepository } from '@modules/invite/repositories/invite.repository';
import {
    InviteUtil,
    mergeInviteConfig,
    validateInviteConfig,
} from '@modules/invite/utils/invite.util';
import { EmailModule } from '@modules/email/email.module';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import {
    InviteConfig,
    InviteConfigOverride,
    InviteModuleForFeatureAsyncOptions,
} from '@modules/invite/interfaces/invite.interface';
import { InviteConfigRegistry } from '@modules/invite/services/invite-config.registry';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({})
export class InviteModule {
    static forRoot(): DynamicModule {
        return {
            module: InviteModule,
            imports: [UserModule, AuthModule, EmailModule],
            providers: [
                InviteService,
                InviteRepository,
                InviteConfigRegistry,
                InviteUtil,
            ],
            exports: [InviteService, InviteConfigRegistry, InviteUtil],
        };
    }

    static forFeatureAsync(
        options: InviteModuleForFeatureAsyncOptions
    ): DynamicModule {
        const configOverrideToken = Symbol(
            `INVITE_CONFIG_OVERRIDE_${options.invitationType}`
        );
        const registrationToken = Symbol(
            `INVITE_CONFIG_REGISTER_${options.invitationType}`
        );

        const configProvider: FactoryProvider<InviteConfigOverride> = {
            provide: configOverrideToken,
            useFactory: options.useFactory ?? (() => ({})),
            inject: options.inject ?? [],
        };

        const registrationProvider: FactoryProvider<boolean> = {
            provide: registrationToken,
            useFactory: (
                configService: ConfigService,
                registry: InviteConfigRegistry,
                overrideConfig: InviteConfigOverride
            ): boolean => {
                const defaultConfig =
                    configService.getOrThrow<InviteConfig>('invite');
                const config = mergeInviteConfig(defaultConfig, overrideConfig);
                validateInviteConfig(config, options.invitationType);

                registry.register(options.invitationType, config);

                return true;
            },
            inject: [ConfigService, InviteConfigRegistry, configOverrideToken],
        };

        return {
            module: InviteModule,
            imports: options.imports ?? [],
            providers: [configProvider, registrationProvider],
            exports: [],
        };
    }
}
