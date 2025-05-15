import { Request } from 'express';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { SessionCreateRequestDto } from 'src/modules/session/dtos/request/session.create.request.dto';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import {
    SessionDoc,
    SessionEntity,
} from 'src/modules/session/repository/entities/session.entity';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';

export interface ISessionService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SessionDoc[]>;
    findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SessionDoc[]>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<SessionDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<SessionDoc>;
    findOneActiveById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<SessionDoc>;
    findOneActiveByIdAndUser(
        _id: string,
        user: string,
        options?: IDatabaseOptions
    ): Promise<SessionDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    getTotalByUser(
        user: string,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    create(
        request: Request,
        { user }: SessionCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<SessionDoc>;
    mapList(
        userLogins: SessionDoc[] | SessionEntity[]
    ): SessionListResponseDto[];
    findLoginSession(_id: string): Promise<string>;
    setLoginSession(user: IUserDoc, session: SessionDoc): Promise<void>;
    deleteLoginSession(_id: string): Promise<void>;
    resetLoginSession(): Promise<void>;
    updateRevoke(
        repository: SessionDoc,
        options?: IDatabaseOptions
    ): Promise<SessionDoc>;
    updateManyRevokeByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<boolean>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
}
