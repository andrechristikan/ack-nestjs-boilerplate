import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@app/app.module';
import { ConfigService } from '@nestjs/config';

export async function createE2eApplication(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);

    app.setGlobalPrefix(configService.get<string>('app.globalPrefix')!);

    if (configService.get<boolean>('app.urlVersion.enable')) {
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: configService.get<string>(
                'app.urlVersion.version'
            )!,
            prefix: configService.get<string>('app.urlVersion.prefix')!,
        });
    }

    await app.init();

    return app;
}

export async function closeE2eApplication(
    app: INestApplication | undefined
): Promise<void> {
    if (!app) {
        return;
    }

    await app.close();
}
