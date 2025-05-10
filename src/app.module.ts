import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module'; // Import the DatabaseModule
import { UserModule } from './user/user.module'; // Import the UserModule
import { PatientsModule } from './patients/patients.module'; // Import the PatientsModule
import { ActivitiesModule } from './activities/activities.module';

@Module({
  imports: [
    DatabaseModule,   // Register DatabaseModule here
    UserModule, 
    PatientsModule,      // Register UserModule here
    ActivitiesModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
