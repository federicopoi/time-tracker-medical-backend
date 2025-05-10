import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseService } from '../database/database.service';

@Module({
  imports: [],
  providers: [UserService, DatabaseService],
  controllers: [UserController],
})
export class UserModule {}
