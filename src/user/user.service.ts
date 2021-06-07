import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from 'src/user/user.schema';
import { UserDocument, UserDocumentFull } from 'src/user/user.interface';
import { HashService } from 'src/hash/hash.service';
import { Hash } from 'src/hash/hash.decorator';
import { IErrors } from 'src/message/message.interface';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';
import { RoleEntity } from 'src/role/role.schema';
import { RoleDocument } from 'src/role/role.interface';
import { PermissionService } from 'src/permission/permission.service';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(UserEntity.name)
        private readonly userModel: Model<UserDocument>,
        @InjectModel(RoleEntity.name)
        private readonly roleModel: Model<RoleDocument>,
        private readonly permissionService: PermissionService,
        @Hash() private readonly hashService: HashService,
        @Message() private readonly messageService: MessageService
    ) {}

    async findAll(
        offset: number,
        limit: number,
        find?: Record<string, any>
    ): Promise<UserDocument[]> {
        return this.userModel
            .find(find)
            .select('-__v -password')
            .skip(offset)
            .limit(limit)
            .lean();
    }

    async totalData(find?: Record<string, any>): Promise<number> {
        return this.userModel.countDocuments(find);
    }

    async findOneById(userId: string): Promise<UserDocumentFull> {
        return this.userModel
            .findById(userId)
            .select('-__v')
            .populate({
                path: 'role',
                model: this.roleModel,
                match: { isActive: true },
                select: '-__v',
                populate: {
                    path: 'permissions',
                    model: this.permissionService,
                    match: { isActive: true },
                    select: '-__v'
                }
            })
            .lean();
    }

    async findOneByEmail(email: string): Promise<UserDocumentFull> {
        return this.userModel
            .findOne({
                email: email
            })
            .select('-__v')
            .populate({
                path: 'role',
                model: this.roleModel,
                match: { isActive: true },
                select: '-__v',
                populate: {
                    path: 'permissions',
                    model: this.permissionService,
                    match: { isActive: true },
                    select: '-__v'
                }
            })
            .lean();
    }

    async findOneByMobileNumber(
        mobileNumber: string
    ): Promise<UserDocumentFull> {
        return this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .select('-__v')
            .populate({
                path: 'role',
                model: this.roleModel,
                match: { isActive: true },
                select: '-__v',
                populate: {
                    path: 'permissions',
                    model: this.permissionService,
                    match: { isActive: true },
                    select: '-__v'
                }
            })
            .lean();
    }

    async create(data: Record<string, any>): Promise<UserDocument> {
        const salt: string = await this.hashService.randomSalt();
        const passwordHash = await this.hashService.hashPassword(
            data.password,
            salt
        );

        const create: UserDocument = new this.userModel({
            firstName: data.firstName.toLowerCase(),
            lastName: data.lastName.toLowerCase(),
            email: data.email.toLowerCase(),
            mobileNumber: data.mobileNumber,
            password: passwordHash
        });
        return create.save();
    }

    async deleteOneById(userId: string): Promise<UserDocument> {
        return this.userModel.deleteOne({
            _id: userId
        });
    }

    async updateOneById(
        userId: string,
        data: Record<string, any>
    ): Promise<UserDocument> {
        return this.userModel.updateOne(
            {
                _id: userId
            },
            {
                firstName: data.firstName.toLowerCase(),
                lastName: data.lastName.toLowerCase()
            }
        );
    }

    async checkExist(
        email: string,
        mobileNumber: string,
        userId?: string
    ): Promise<IErrors[]> {
        const existEmail: UserDocument = await this.userModel
            .findOne({
                email: email
            })
            .where('_id')
            .ne(userId)
            .lean();

        const existMobileNumber: UserDocument = await this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .where('_id')
            .ne(userId)
            .lean();

        const errors: IErrors[] = [];
        if (existEmail) {
            errors.push({
                message: this.messageService.get('user.create.emailExist'),
                property: 'email'
            });
        }
        if (existMobileNumber) {
            errors.push({
                message: this.messageService.get(
                    'user.create.mobileNumberExist'
                ),
                property: 'mobileNumber'
            });
        }

        return errors;
    }
}
