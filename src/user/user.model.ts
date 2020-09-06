import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as DocumentMongoose } from 'mongoose';

@Schema()
export class User extends DocumentMongoose {
    @Prop({
        required: true,
        index: true,
        lowercase: true,
    })
    firstName: string;

    @Prop({
        required: true,
        index: true,
        lowercase: true,
    })
    lastName: string;

    @Prop({
        required: true,
        index: true,
        unique: true,
    })
    mobileNumber: string;

    @Prop({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
    })
    email: string;

    @Prop({
        required: true,
    })
    password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

export class UserStoreFillableFields {
    email: string;
    firstName: string;
    lastName: string;
    mobileNumber: string;
    password: string;
}

export class UserUpdateFillableFields {
    firstName: string;
    lastName: string;
}
