import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';


@Module({
  imports: [],
  providers: [UserService,],
  controllers: [UserController],
  exports: [UserService], // Export UserService if you want to use it in other modules
})
export class UserModule {}
