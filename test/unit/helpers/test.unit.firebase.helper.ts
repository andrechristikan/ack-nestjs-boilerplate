import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { App as FirebaseApp } from 'firebase-admin/app';
import type { Messaging } from 'firebase-admin/messaging';
import type { MockProxy } from 'vitest-mock-extended';
import type { FirebaseService } from '@common/firebase/services/firebase.service';
import type { FirebaseUtil } from '@common/firebase/utils/firebase.util';
import type { HelperArrayService } from '@common/helper/services/helper.array.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export interface IFirebaseCredentials {
    projectId: string | null;
    clientEmail: string | null;
    privateKey: string | null;
}

export interface IFirebaseServiceDoubles {
    firebaseUtil: MockProxy<FirebaseUtil>;
    helperArrayService: MockProxy<HelperArrayService>;
}

export async function createFirebaseService(
    credentials: IFirebaseCredentials,
    doubles: IFirebaseServiceDoubles,
    rawPrivateKey: string | null = 'raw-private-key'
): Promise<FirebaseService> {
    const [
        { FirebaseService: FirebaseServiceClass },
        { FirebaseUtil: FirebaseUtilClass },
        { HelperArrayService: HelperArrayServiceClass },
    ] = await Promise.all([
        import('@common/firebase/services/firebase.service'),
        import('@common/firebase/utils/firebase.util'),
        import('@common/helper/services/helper.array.service'),
    ]);
    const configService = buildConfigService({
        'firebase.projectId': credentials.projectId,
        'firebase.clientEmail': credentials.clientEmail,
        'firebase.privateKey': rawPrivateKey,
    });
    doubles.firebaseUtil.normalizePrivateKey.mockReturnValue(
        credentials.privateKey
    );

    const module = await Test.createTestingModule({
        providers: [
            FirebaseServiceClass,
            { provide: ConfigService, useValue: configService },
            { provide: FirebaseUtilClass, useValue: doubles.firebaseUtil },
            {
                provide: HelperArrayServiceClass,
                useValue: doubles.helperArrayService,
            },
        ],
    }).compile();

    return module.get(FirebaseServiceClass);
}

export async function createInitializedFirebaseService(
    credentials: IFirebaseCredentials,
    doubles: IFirebaseServiceDoubles,
    messaging: MockProxy<Messaging>
): Promise<FirebaseService> {
    const [firebaseAdmin, { getMessaging }, initialized] = await Promise.all([
        import('firebase-admin'),
        import('firebase-admin/messaging'),
        createFirebaseService(credentials, doubles),
    ]);
    const app = {} as FirebaseApp;
    vi.mocked(firebaseAdmin.cert).mockReturnValue('credential' as never);
    vi.mocked(firebaseAdmin.initializeApp).mockReturnValue(app);
    vi.mocked(getMessaging).mockReturnValue(messaging);

    await initialized.onModuleInit();

    return initialized;
}
