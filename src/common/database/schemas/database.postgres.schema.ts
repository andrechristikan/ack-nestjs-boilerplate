import {
    CreateDateColumn,
    DeleteDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export class DatabasePostgresEntity {
    @PrimaryGeneratedColumn('uuid', {
        name: '_id',
    })
    _id: string;

    @CreateDateColumn({
        name: 'createdAt',
        type: Date,
    })
    createdAt: Date;

    @UpdateDateColumn({
        name: 'updatedAt',
        type: Date,
    })
    updatedAt: Date;

    @DeleteDateColumn({
        nullable: true,
        name: 'deletedAt',
        type: Date,
    })
    deletedAt?: Date;
}
