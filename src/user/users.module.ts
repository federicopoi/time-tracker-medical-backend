import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';


@Module({
  imports: [],
  providers: [UsersService,],
  controllers: [UsersController],
  exports: [UsersService], // Export UserService if you want to use it in other modules
})
export class UserModule {}
