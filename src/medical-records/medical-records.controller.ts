import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { MedicalRecordsService } from "./medical-records.service";
import { MedicalRecord } from "./medical-record.interface";
import { AuthGuard } from "../auth/auth.guard";

@Controller("medical-records")
@UseGuards(AuthGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  async createMedicalRecord(
    @Body() medicalRecord: MedicalRecord,
  ): Promise<MedicalRecord> {
    return this.medicalRecordsService.createMedicalRecord(medicalRecord);
  }

  @Get("patient/:patientId")
  async getMedicalRecordsByPatientId(
    @Param("patientId", ParseIntPipe) patientId: number,
  ): Promise<MedicalRecord[]> {
    return this.medicalRecordsService.getMedicalRecordsByPatientId(patientId);
  }

  @Get("patient/:patientId/latest")
  async getLatestMedicalRecordByPatientId(
    @Param("patientId", ParseIntPipe) patientId: number,
  ): Promise<MedicalRecord | null> {
    return this.medicalRecordsService.getLatestMedicalRecordByPatientId(
      patientId,
    );
  }
}
