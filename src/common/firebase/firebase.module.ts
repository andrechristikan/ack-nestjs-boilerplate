import { DynamicModule, Module } from '@nestjs/common';
import { FirebaseService } from '@common/firebase/services/firebase.service';

/**
 * Global module that provides Firebase Admin SDK integration.
 *
 * Registers and exports `FirebaseService` for push notification delivery via FCM.
 * Declared as `@Global()` so it is available across all feature modules without
 * being re-imported.
 */
@Module({})
export class FirebaseModule {
    static forRoot(): DynamicModule {
        return {
            module: FirebaseModule,
            global: true,
            providers: [FirebaseService],
            exports: [FirebaseService],
            imports: [],
            controllers: [],
        };
    }
}
