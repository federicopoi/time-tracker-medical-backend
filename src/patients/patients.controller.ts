import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { PatientsService, Patient } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  async createPatient(@Body() patientDto: CreatePatientDto) {
    try {
      console.log('Received patient data:', patientDto);
      return await this.patientsService.createPatient(patientDto as Patient);
    } catch (error) {
      console.error('Error in createPatient controller:', error);
      throw new HttpException(`Failed to create patient: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async getPatients() {
    try {
      return await this.patientsService.getPatients();
    } catch (error) {
      throw new HttpException('Failed to fetch patients', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getPatientById(@Param('id') id: string) {
    try {
      const patient = await this.patientsService.getPatientById(parseInt(id));
      if (!patient) {
        throw new HttpException('Patient not found', HttpStatus.NOT_FOUND);
      }
      return patient;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch patient', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updatePatient(@Param('id') id: string, @Body() patient: Partial<Patient>) {
    try {
      const updatedPatient = await this.patientsService.updatePatient(parseInt(id), patient);
      if (!updatedPatient) {
        throw new HttpException('Patient not found', HttpStatus.NOT_FOUND);
      }
      return updatedPatient;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update patient', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deletePatient(@Param('id') id: string) {
    try {
      await this.patientsService.deletePatient(parseInt(id));
      return { message: 'Patient deleted successfully' };
    } catch (error) {
      throw new HttpException('Failed to delete patient', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Optimized endpoint: Get patient with all activities and user details
  @Get(':id/with-activities-and-users')
  async getPatientWithActivitiesAndUsers(@Param('id') id: string) {
    try {
      const patient = await this.patientsService.getPatientWithActivitiesAndUsers(parseInt(id));
      if (!patient) {
        throw new HttpException('Patient not found', HttpStatus.NOT_FOUND);
      }
      return patient;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error in getPatientWithActivitiesAndUsers controller:', error);
      throw new HttpException('Failed to fetch patient with activities and users', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Optimized endpoint: Get all patients with activity summary
  @Get('with-activity-summary/all')
  async getPatientsWithActivitySummary() {
    try {
      return await this.patientsService.getPatientsWithActivitySummary();
    } catch (error) {
      console.error('Error in getPatientsWithActivitySummary controller:', error);
      throw new HttpException('Failed to fetch patients with activity summary', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Optimized endpoint: Get patients by site with activity counts
  @Get('site/:siteName/with-activity-counts')
  async getPatientsBySiteWithActivityCounts(@Param('siteName') siteName: string) {
    try {
      return await this.patientsService.getPatientsBySiteWithActivityCounts(siteName);
    } catch (error) {
      console.error('Error in getPatientsBySiteWithActivityCounts controller:', error);
      throw new HttpException('Failed to fetch patients by site with activity counts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get patients by site ID
  @Get('site-id/:siteId')
  async getPatientsBySiteId(@Param('siteId') siteId: string) {
    try {
      return await this.patientsService.getPatientsBySiteId(parseInt(siteId));
    } catch (error) {
      console.error('Error in getPatientsBySiteId controller:', error);
      throw new HttpException('Failed to fetch patients by site ID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
