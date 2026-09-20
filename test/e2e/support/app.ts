import { VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@app/app.module';
import { ConfigService } from '@nestjs/config';
import { RequestThrottleDefaultGuard } from '@common/request/guards/request.throttle-default.guard';
import { RequestThrottleRouteGuard } from '@common/request/guards/request.throttle-route.guard';
import { afterAll, beforeAll } from 'vitest';

// Both throttle guards are registered as global `APP_GUARD` providers via `useClass` (see
// `src/common/request/request.middleware.module.ts`). NestJS's `DependenciesScanner` stores an
// `APP_GUARD` `useClass` entry under a synthesized UUID token instead of the class itself
// (`@nestjs/core/scanner.js` `insertProvider`), so `TestingModuleBuilder#overrideGuard(Class)`
// never finds a matching provider to replace and silently no-ops — confirmed by real 429s still
// firing with that override in place. Patching `canActivate` on the prototype is the only
// test-only way to neutralize a guard that is invisible to DI by its own class token.
const noopCanActivate = async (): Promise<boolean> => true;
RequestThrottleDefaultGuard.prototype.canActivate = noopCanActivate;
RequestThrottleRouteGuard.prototype.canActivate = noopCanActivate;

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

export function useE2eApp(): () => INestApplication {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createE2eApplication();
    });

    afterAll(async () => {
        await closeE2eApplication(app);
    });

    return () => app;
}
