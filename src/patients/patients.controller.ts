import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { Patient } from "./patient.interface";
import { AuthGuard } from "../auth/auth.guard";

@Controller("patients")
@UseGuards(AuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  async createPatient(@Body() patientDto: CreatePatientDto) {
    try {
      console.log("Received patient data:", patientDto);
      return await this.patientsService.createPatient(patientDto as Patient);
    } catch (error) {
      console.error("Error in createPatient controller:", error);
      throw new HttpException(
        `Failed to create patient: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getPatients(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // Parse pagination parameters
      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 50; // Default to 50 items per page
      const offset = (pageNum - 1) * limitNum;

      // If user is admin, get all patients with pagination
      if (userRole === "admin") {
        return await this.patientsService.getPatients(limitNum, offset);
      }

      // For non-admin users, get only patients from their assigned sites with pagination
      return await this.patientsService.getPatientsByUserAccess(userId, limitNum, offset);
    } catch (error) {
      throw new HttpException(
        "Failed to fetch patients",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  async getPatientById(@Param("id") id: string, @Request() req) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, get any patient
      if (userRole === "admin") {
        const patient = await this.patientsService.getPatientById(parseInt(id));
        if (!patient) {
          throw new HttpException("Patient not found", HttpStatus.NOT_FOUND);
        }
        return patient;
      }

      // For non-admin users, check if they have access to this patient
      const patient = await this.patientsService.getPatientByIdWithAccessCheck(
        parseInt(id),
        userId,
      );
      if (!patient) {
        throw new HttpException(
          "Patient not found or access denied",
          HttpStatus.NOT_FOUND,
        );
      }
      return patient;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to fetch patient",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(":id")
  async updatePatient(
    @Param("id") id: string,
    @Body() patient: Partial<Patient>,
    @Request() req,
  ) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, update any patient
      if (userRole === "admin") {
        const updatedPatient = await this.patientsService.updatePatient(
          parseInt(id),
          patient,
        );
        if (!updatedPatient) {
          throw new HttpException("Patient not found", HttpStatus.NOT_FOUND);
        }
        return updatedPatient;
      }

      // For non-admin users, check if they have access to this patient
      const updatedPatient =
        await this.patientsService.updatePatientWithAccessCheck(
          parseInt(id),
          patient,
          userId,
        );
      if (!updatedPatient) {
        throw new HttpException(
          "Patient not found or access denied",
          HttpStatus.NOT_FOUND,
        );
      }
      return updatedPatient;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to update patient",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  async deletePatient(@Param("id") id: string, @Request() req) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, delete any patient
      if (userRole === "admin") {
        await this.patientsService.deletePatient(parseInt(id));
        return { message: "Patient deleted successfully" };
      }

      // For non-admin users, check if they have access to this patient
      const deleted = await this.patientsService.deletePatientWithAccessCheck(
        parseInt(id),
        userId,
      );
      if (!deleted) {
        throw new HttpException(
          "Patient not found or access denied",
          HttpStatus.NOT_FOUND,
        );
      }
      return { message: "Patient deleted successfully" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to delete patient",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("site/:siteName")
  async getPatientsBySiteName(
    @Param("siteName") siteName: string,
    @Request() req,
  ) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, get all patients for the site
      if (userRole === "admin") {
        return await this.patientsService.getPatientsBySiteName(siteName);
      }

      // For non-admin users, check if they have access to this site
      return await this.patientsService.getPatientsBySiteNameWithAccessCheck(
        siteName,
        userId,
      );
    } catch (error) {
      throw new HttpException(
        `Failed to fetch patients for site: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
