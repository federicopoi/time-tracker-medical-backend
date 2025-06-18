import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { Patient } from './patient.interface';
import { AuthGuard } from '../auth/auth.guard';

@Controller('patients')
@UseGuards(AuthGuard)
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

  @Get('site/:siteName')
  async getPatientsBySiteName(@Param('siteName') siteName: string) {
    try {
      return await this.patientsService.getPatientsBySiteName(siteName);
    } catch (error) {
      throw new HttpException(`Failed to fetch patients for site: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
