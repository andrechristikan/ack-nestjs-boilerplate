import { DynamicModule, Module } from '@nestjs/common';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { FirebaseUtil } from '@common/firebase/utils/firebase.util';

/**
 * Global module exposing `FirebaseService` (Admin SDK) for FCM push delivery app-wide.
 */
@Module({})
export class FirebaseModule {
    static forRoot(): DynamicModule {
        return {
            module: FirebaseModule,
            global: true,
            providers: [FirebaseUtil, FirebaseService],
            exports: [FirebaseUtil, FirebaseService],
            imports: [],
            controllers: [],
        };
    }
}
