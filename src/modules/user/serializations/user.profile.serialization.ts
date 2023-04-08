import { OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { UserGetSerialization } from './user.get.serialization';

export class UserProfileSerialization extends OmitType(UserGetSerialization, [
    'isActive',
    'blocked',
    'passwordExpired',
    'passwordCreated',
    'passwordAttempt',
    'inactiveDate',
    'inactivePermanent',
    'blockedDate',
] as const) {
    @Exclude()
    readonly isActive: boolean;

    @Exclude()
    readonly inactivePermanent: boolean;

    @Exclude()
    readonly blocked: boolean;

    @Exclude()
    readonly passwordExpired: Date;

    @Exclude()
    readonly passwordCreated: Date;

    @Exclude()
    readonly passwordAttempt: number;

    @Exclude()
    readonly inactiveDate?: Date;

    @Exclude()
    readonly blockedDate?: Date;
}
