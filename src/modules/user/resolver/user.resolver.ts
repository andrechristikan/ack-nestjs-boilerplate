import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UserService } from '../services/user.service';


@Resolver()
export class UserResolver {
  constructor(private userService: UserService) {}

  // @Roles("Admin")
  @Query(returns => [UserType])
  async users() {
    return await this.userService.getTotal();
  }
}
