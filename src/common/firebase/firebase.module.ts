import { Global, Module } from '@nestjs/common';
import { FirebaseService } from '@common/firebase/services/firebase.service';

@Global()
@Module({
    providers: [FirebaseService],
    exports: [FirebaseService],
})
export class FirebaseModule {}
