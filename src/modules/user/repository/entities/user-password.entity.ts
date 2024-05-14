import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const UserPasswordDatabaseName = 'userpasswords';

@DatabaseEntity({ collection: UserPasswordDatabaseName })
export class UserPasswordEntity extends DatabaseMongoUUIDEntityAbstract {
    @Prop({
        required: true,
        index: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    user: string;

    @Prop({
        required: true,
        type: String,
    })
    password: string;
}

export const UserPasswordSchema =
    SchemaFactory.createForClass(UserPasswordEntity);

export type UserPasswordDoc = UserPasswordEntity & Document;
