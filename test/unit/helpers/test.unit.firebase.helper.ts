import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { cert, initializeApp } from 'firebase-admin';
import type { App as FirebaseApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { Messaging } from 'firebase-admin/messaging';
import type { MockProxy } from 'vitest-mock-extended';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export interface IFirebaseCredentials {
    projectId: string | null;
    clientEmailAddress: string | null;
    privateKey: string | null;
}

export async function createFirebaseService(
    credentials: IFirebaseCredentials
): Promise<FirebaseService> {
    const configService = buildConfigService({
        ...TestUnitKitConfigValues,
        'firebase.projectId': credentials.projectId,
        'firebase.clientEmailAddress': credentials.clientEmailAddress,
        'firebase.privateKey': credentials.privateKey,
    });

    const module = await Test.createTestingModule({
        providers: [
            ...TestUnitKitProviders,
            FirebaseService,
            { provide: ConfigService, useValue: configService },
        ],
    }).compile();

    return module.get(FirebaseService);
}

export async function createInitializedFirebaseService(
    credentials: IFirebaseCredentials,
    messaging: MockProxy<Messaging>
): Promise<FirebaseService> {
    const initialized = await createFirebaseService(credentials);
    const app = {} as FirebaseApp;
    vi.mocked(cert).mockReturnValue('credential' as never);
    vi.mocked(initializeApp).mockReturnValue(app);
    vi.mocked(getMessaging).mockReturnValue(messaging);

    await initialized.onModuleInit();

    return initialized;
}
