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
} from "@nestjs/common";
import { ActivitiesService } from "./activities.service";
import { CreateActivityDto } from "./dto/create-activity.dto";
import { UpdateActivityDto } from "./dto/update-activity.dto";
import { Activity } from "./activites.interface";
import { AuthGuard } from "../auth/auth.guard";

@Controller("activities")
@UseGuards(AuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  async createActivity(@Body() activityDto: CreateActivityDto, @Request() req) {
    try {
      console.log("Received activity data:", activityDto);
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, create activity for any patient
      if (userRole === "admin") {
        return await this.activitiesService.createActivity(
          activityDto as Activity,
        );
      }

      // For non-admin users, check if they have access to the patient
      return await this.activitiesService.createActivityWithAccessCheck(
        activityDto as Activity,
        userId,
      );
    } catch (error) {
      console.error("Error in createActivity controller:", error);
      throw new HttpException(
        `Failed to create activity: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getActivites(@Request() req) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, get all activities
      if (userRole === "admin") {
        return await this.activitiesService.getActivites();
      }

      // For non-admin users, get only activities for patients they have access to
      return await this.activitiesService.getActivitiesByUserAccess(userId);
    } catch (error) {
      throw new HttpException(
        "Failed to fetch activities",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  async getActivityById(@Param("id") id: string, @Request() req) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, get any activity
      if (userRole === "admin") {
        const activity = await this.activitiesService.getActivityById(
          parseInt(id),
        );
        if (!activity) {
          throw new HttpException("Activity not found", HttpStatus.NOT_FOUND);
        }
        return activity;
      }

      // For non-admin users, check if they have access to this activity
      const activity =
        await this.activitiesService.getActivityByIdWithAccessCheck(
          parseInt(id),
          userId,
        );
      if (!activity) {
        throw new HttpException(
          "Activity not found or access denied",
          HttpStatus.NOT_FOUND,
        );
      }
      return activity;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch activity",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("patient/:patientId")
  async getActivitiesByPatientId(
    @Param("patientId") patientId: string,
    @Request() req,
  ) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, get all activities for the patient
      if (userRole === "admin") {
        return await this.activitiesService.getActivitesByPatientId(
          parseInt(patientId),
        );
      }

      // For non-admin users, check if they have access to the patient
      return await this.activitiesService.getActivitiesByPatientIdWithAccessCheck(
        parseInt(patientId),
        userId,
      );
    } catch (error) {
      throw new HttpException(
        "Failed to fetch activities for patient",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(":id")
  async updateActivity(
    @Param("id") id: string,
    @Body() activityDto: UpdateActivityDto,
    @Request() req,
  ) {
    try {
      console.log("Received update data:", activityDto);
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, update any activity
      if (userRole === "admin") {
        return await this.activitiesService.updateActivity(
          parseInt(id),
          activityDto,
        );
      }

      // For non-admin users, check if they have access to this activity
      const updatedActivity =
        await this.activitiesService.updateActivityWithAccessCheck(
          parseInt(id),
          activityDto,
          userId,
        );
      if (!updatedActivity) {
        throw new HttpException(
          "Activity not found or access denied",
          HttpStatus.NOT_FOUND,
        );
      }
      return updatedActivity;
    } catch (error) {
      console.error("Error in updateActivity controller:", error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message.includes("not found")) {
        throw new HttpException("Activity not found", HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Failed to update activity: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  async deleteActivity(@Param("id") id: string, @Request() req) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, delete any activity
      if (userRole === "admin") {
        await this.activitiesService.deleteActivity(parseInt(id));
        return { message: "Activity deleted successfully" };
      }

      // For non-admin users, check if they have access to this activity
      const deleted =
        await this.activitiesService.deleteActivityWithAccessCheck(
          parseInt(id),
          userId,
        );
      if (!deleted) {
        throw new HttpException(
          "Activity not found or access denied",
          HttpStatus.NOT_FOUND,
        );
      }
      return { message: "Activity deleted successfully" };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to delete activity",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
