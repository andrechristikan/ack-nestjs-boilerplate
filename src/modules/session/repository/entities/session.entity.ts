import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { ENUM_SESSION_STATUS } from '@module/session/enums/session.enum';
import { UserEntity } from '@module/user/repository/entities/user.entity';

export const SessionTableName = 'Sessions';

@DatabaseEntity({ collection: SessionTableName })
export class SessionEntity extends DatabaseUUIDEntityBase {
    @DatabaseProp({
        required: true,
        index: true,
        type: String,
        enum: ENUM_SESSION_STATUS,
        default: ENUM_SESSION_STATUS.ACTIVE,
    })
    status: ENUM_SESSION_STATUS;

    @DatabaseProp({
        required: false,
        type: Date,
    })
    revokeAt?: Date;

    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    user: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    ip: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    hostname: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    protocol: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    originalUrl: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
    })
    method: string;

    @DatabaseProp({
        required: false,
        trim: true,
        type: String,
    })
    userAgent?: string;

    @DatabaseProp({
        required: false,
        trim: true,
        type: String,
    })
    xForwardedFor?: string;

    @DatabaseProp({
        required: false,
        trim: true,
        type: String,
    })
    xForwardedHost?: string;

    @DatabaseProp({
        required: false,
        trim: true,
        type: String,
    })
    xForwardedPorto?: string;

    @DatabaseProp({
        required: true,
        type: Date,
    })
    expiredAt: Date;
}

export const SessionSchema = DatabaseSchema(SessionEntity);
export type SessionDoc = IDatabaseDocument<SessionEntity>;
