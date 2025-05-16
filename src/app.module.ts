import { Module } from '@nestjs/common';

import { UserModule } from './user/users.module';
import { PatientsModule } from './patients/patients.module'; // Import the PatientsModule
import { ActivitiesModule } from './activities/activities.module';
import { AuthModule } from './auth/auth.module';
import { SitesModule } from './sites/sites.module';

@Module({
  imports: [
   // Register DatabaseModule here
    UserModule, 
    PatientsModule,      // Register UserModule here
    ActivitiesModule, AuthModule,
    SitesModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
