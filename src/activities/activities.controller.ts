import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ActivitiesService, Activity } from './activities.service';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { AuthGuard } from 'src/auth/auth.guard';



@UseGuards(AuthGuard,RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

@Roles('admin')
  @Post()
  async createActivity(@Body() activity: Activity) {
    try {
      return await this.activitiesService.createActivity(activity);
    } catch (error) {
      throw new HttpException('Failed to create activity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
@Roles('user','admin')
  @Get()
  async getActivities() {
    try {
      return await this.activitiesService.getActivities();
    } catch (error) {
      throw new HttpException('Failed to fetch activities', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getActivityById(@Param('id') id: string) {
    try {
      const activity = await this.activitiesService.getActivityById(parseInt(id));
      if (!activity) {
        throw new HttpException('Activity not found', HttpStatus.NOT_FOUND);
      }
      return activity;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch activity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('patient/:patientId')
  async getActivitiesByPatientId(@Param('patientId') patientId: string) {
    try {
      return await this.activitiesService.getActivitiesByPatientId(parseInt(patientId));
    } catch (error) {
      throw new HttpException('Failed to fetch patient activities', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateActivity(@Param('id') id: string, @Body() activity: Partial<Activity>) {
    try {
      const updatedActivity = await this.activitiesService.updateActivity(parseInt(id), activity);
      if (!updatedActivity) {
        throw new HttpException('Activity not found', HttpStatus.NOT_FOUND);
      }
      return updatedActivity;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update activity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteActivity(@Param('id') id: string) {
    try {
      await this.activitiesService.deleteActivity(parseInt(id));
      return { message: 'Activity deleted successfully' };
    } catch (error) {
      throw new HttpException('Failed to delete activity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 