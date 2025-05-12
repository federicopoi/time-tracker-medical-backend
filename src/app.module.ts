import { Module } from '@nestjs/common';

import { UserModule } from './user/user.module'; // Import the UserModule
import { PatientsModule } from './patients/patients.module'; // Import the PatientsModule
import { ActivitiesModule } from './activities/activities.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
   // Register DatabaseModule here
    UserModule, 
    PatientsModule,      // Register UserModule here
    ActivitiesModule, AuthModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
