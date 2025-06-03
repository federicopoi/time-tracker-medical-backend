import { Controller, Post, Get, Body, Param, ParseIntPipe } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecord } from './medical-record.interface';

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  async createMedicalRecord(@Body() medicalRecord: MedicalRecord): Promise<MedicalRecord> {
    return this.medicalRecordsService.createMedicalRecord(medicalRecord);
  }

  @Get('patient/:patientId')
  async getMedicalRecordsByPatientId(
    @Param('patientId', ParseIntPipe) patientId: number
  ): Promise<MedicalRecord[]> {
    return this.medicalRecordsService.getMedicalRecordsByPatientId(patientId);
  }
} 