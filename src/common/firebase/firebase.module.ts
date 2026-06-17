import { DynamicModule, Module } from '@nestjs/common';
import { FirebaseService } from '@common/firebase/services/firebase.service';

/**
 * Global module exposing `FirebaseService` (Admin SDK) for FCM push delivery app-wide.
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
