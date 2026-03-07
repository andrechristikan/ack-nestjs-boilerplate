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
            imports: [UserModule, AuthModule],
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
            `INVITE_CONFIG_OVERRIDE_${options.inviteType}`
        );
        const registrationToken = Symbol(
            `INVITE_CONFIG_REGISTER_${options.inviteType}`
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
                validateInviteConfig(config, options.inviteType);

                registry.register(options.inviteType, config);

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
