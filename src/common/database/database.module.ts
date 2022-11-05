import { DynamicModule, Module, Provider } from '@nestjs/common';
import {
    IDatabaseRepositoryAsyncModuleOptions,
    IDatabaseRepositoryModuleOptionsFactory,
} from 'src/common/database/interfaces/database.interface';

@Module({})
export class DatabaseModule {
    static forFeatureAsync(
        options: IDatabaseRepositoryAsyncModuleOptions
    ): DynamicModule {
        console.log('process.env.DATABASE_TYPE', process.env.DATABASE_TYPE);
        return {
            module: DatabaseModule,
            providers: [...this.createProviders(options)],
            exports: [],
            controllers: [],
            imports: options.imports || [],
        };
    }

    private static createProviders(
        options: IDatabaseRepositoryAsyncModuleOptions
    ): Provider[] {
        if (options.useExisting || options.useFactory) {
            return [this.createProvider(options)];
        }

        // for useClass
        return [
            this.createProvider(options),
            {
                provide: options.useClass,
                useClass: options.useClass,
            },
        ];
    }

    private static createProvider(
        options: IDatabaseRepositoryAsyncModuleOptions
    ): Provider {
        if (options.useFactory) {
            // for useFactory
            return {
                provide: options.name,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }

        // For useExisting...
        return {
            provide: options.name,
            useFactory: async (
                optionsFactory: IDatabaseRepositoryModuleOptionsFactory
            ) => await optionsFactory.createMassiveConnectOptions(),
            inject: [options.useExisting || options.useClass],
        };
    }
}
