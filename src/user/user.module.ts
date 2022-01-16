import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserDatabaseName, UserSchema } from 'src/user/user.schema';
import { UserService } from 'src/user/user.service';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import { UserDocument } from './user.interface';

@Module({
    imports: [
        MongooseModule.forFeatureAsync(
            [
                {
                    name: UserEntity.name,
                    useFactory: () => {
                        const schema = UserSchema;
                        schema.pre<UserDocument>('save', function (next) {
                            this.email = this.email.toLowerCase();
                            this.firstName = this.email.toLowerCase();

                            if (this.lastName) {
                                this.lastName = this.lastName.toLowerCase();
                            }
                            next();
                        });
                        return schema;
                    },
                    collection: UserDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
    exports: [UserService],
    providers: [UserService],
    controllers: [],
})
export class UserModule {}
