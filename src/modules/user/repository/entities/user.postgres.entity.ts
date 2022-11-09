import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { DatabasePostgresEntityAbstract } from 'src/common/database/abstracts/database.postgres-entity.abstract';
import { DatabasePostgresSchema } from 'src/common/database/decorators/database.decorator';
import { RoleDatabaseName } from 'src/modules/role/repository/entities/role.entity';
import { RolePostgresEntity } from 'src/modules/role/repository/entities/role.postgres.entity';
import { UserDatabaseName } from 'src/modules/user/repository/entities/user.entity';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    JoinColumn,
    ManyToOne,
    OneToMany,
} from 'typeorm';

@DatabasePostgresSchema({ name: UserDatabaseName })
export class UserPostgresEntity extends DatabasePostgresEntityAbstract {
    @Column({
        nullable: false,
        type: String,
        unique: true,
        length: 100,
    })
    username: string;

    @Column({
        nullable: false,
        type: String,
        length: 50,
    })
    firstName: string;

    @Column({
        nullable: false,
        type: String,
        length: 50,
    })
    lastName: string;

    @Column({
        nullable: false,
        unique: true,
        type: String,
        length: 15,
    })
    mobileNumber: string;

    @Column({
        nullable: false,
        unique: true,
        type: String,
        length: 100,
    })
    email: string;

    @OneToMany(() => RolePostgresEntity, (role) => role._id, {
        cascade: true,
        lazy: true,
        eager: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'role', referencedColumnName: '_id' })
    @Column({
        nullable: false,
        type: 'uuid',
    })
    role: string;

    @Column({
        nullable: false,
        type: String,
    })
    password: string;

    @Column({
        nullable: false,
        type: String,
    })
    passwordExpired: Date;

    @Column({
        nullable: false,
        type: String,
    })
    salt: string;

    @Column({
        nullable: false,
        default: true,
        type: Boolean,
    })
    isActive: boolean;

    @Column({
        nullable: true,
        type: 'json',
    })
    photo?: AwsS3Serialization;

    @BeforeInsert()
    @BeforeUpdate()
    beforeSave() {
        this.email = this.email.toLowerCase().trim();
        this.firstName = this.firstName.toLowerCase().trim();
        this.lastName = this.lastName.toLowerCase().trim();
        this.mobileNumber = this.mobileNumber.trim();
    }
}
