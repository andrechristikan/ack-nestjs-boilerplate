import { Module } from '@nestjs/common';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { FirebaseUtil } from '@common/firebase/utils/firebase.util';

@Module({
    controllers: [],
    providers: [FirebaseUtil, FirebaseService],
    exports: [FirebaseUtil, FirebaseService],
    imports: [],
})
export class FirebaseModule {}
