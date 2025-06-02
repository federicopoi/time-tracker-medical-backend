import { Module } from '@nestjs/common';

import { UserModule } from './user/users.module';
import { PatientsModule } from './patients/patients.module'; // Import the PatientsModule
import { ActivitiesModule } from './activities/activities.module';
import { AuthModule } from './auth/auth.module';
import { SitesModule } from './sites/sites.module';
import { BuildingsModule } from './buildings/buildings.module';

@Module({
  imports: [
    UserModule, 
    PatientsModule,    
    ActivitiesModule, AuthModule,
    SitesModule,
    BuildingsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
