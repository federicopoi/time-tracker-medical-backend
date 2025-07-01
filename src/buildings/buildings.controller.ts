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
} from "@nestjs/common";
import { BuildingsService } from "./buildings.service";
import { CreateBuildingDto, UpdateBuildingDto } from "./building.interface";
import { AuthGuard } from "../auth/auth.guard";

@Controller("buildings")
@UseGuards(AuthGuard)
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  async createBuilding(@Body() building: CreateBuildingDto) {
    try {
      return await this.buildingsService.createBuilding(building);
    } catch (error) {
      throw new HttpException(
        "Failed to create building",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getBuildings() {
    try {
      return await this.buildingsService.getBuildings();
    } catch (error) {
      throw new HttpException(
        "Failed to fetch buildings",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("site/:siteId")
  async getBuildingsBySiteId(@Param("siteId") siteId: string) {
    try {
      const parsedSiteId = parseInt(siteId);
      if (isNaN(parsedSiteId)) {
        throw new HttpException(
          "Invalid site ID provided",
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.buildingsService.getBuildingsBySiteId(parsedSiteId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to fetch buildings for site",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  async getBuildingById(@Param("id") id: string) {
    try {
      const building = await this.buildingsService.getBuildingById(
        parseInt(id),
      );
      if (!building) {
        throw new HttpException("Building not found", HttpStatus.NOT_FOUND);
      }
      return building;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to fetch building",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(":id")
  async updateBuilding(
    @Param("id") id: string,
    @Body() building: UpdateBuildingDto,
  ) {
    try {
      const updatedBuilding = await this.buildingsService.updateBuilding(
        parseInt(id),
        building,
      );
      if (!updatedBuilding) {
        throw new HttpException("Building not found", HttpStatus.NOT_FOUND);
      }
      return updatedBuilding;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to update building",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  async deleteBuilding(@Param("id") id: string) {
    try {
      await this.buildingsService.deleteBuilding(parseInt(id));
      return { message: "Building deleted successfully" };
    } catch (error) {
      throw new HttpException(
        "Failed to delete building",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
