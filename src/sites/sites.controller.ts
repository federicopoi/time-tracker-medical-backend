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
import { SitesService, Site } from "./sites.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("sites")
@UseGuards(AuthGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  async createSite(@Body() site: Site) {
    try {
      return await this.sitesService.createSite(site);
    } catch (error) {
      throw new HttpException(
        "Failed to create site",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getSites(@Request() req) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, get all sites
      if (userRole === "admin") {
        return await this.sitesService.getAllSitesByAdmin();
      }

      // For non-admin users, get only sites they're assigned to
      return await this.sitesService.getSites(userId);
    } catch (error) {
      throw new HttpException(
        "Failed to fetch sites",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get all sites for admin (no filtering)
  @Get("admin/all")
  async getAllSitesByAdmin(@Request() req) {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        throw new HttpException(
          "Access denied. Admin role required.",
          HttpStatus.FORBIDDEN,
        );
      }
      return await this.sitesService.getAllSitesByAdmin();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to fetch all sites",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get all sites with their building names for admin (no user filtering)
  @Get("admin/sites-and-buildings")
  async getAllSitesAndBuildings(@Request() req) {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        throw new HttpException(
          "Access denied. Admin role required.",
          HttpStatus.FORBIDDEN,
        );
      }
      return await this.sitesService.getAllSitesAndBuildings();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to fetch all sites and buildings",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get all sites with their building names
  @Get("sites-and-buildings")
  async getSitesAndBuildings(@Request() req) {
    try {
      const userId = parseInt(req.user.sub);
      const userRole = req.user.role;

      // If user is admin, get all sites and buildings
      if (userRole === "admin") {
        return await this.sitesService.getAllSitesAndBuildings();
      }

      // For non-admin users, get only sites they're assigned to
      return await this.sitesService.getSitesAndBuildings(userId);
    } catch (error) {
      throw new HttpException(
        "Failed to fetch sites and buildings",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  async getSiteById(@Param("id") id: string) {
    try {
      const site = await this.sitesService.getSiteById(parseInt(id));
      if (!site) {
        throw new HttpException("Site not found", HttpStatus.NOT_FOUND);
      }
      return site;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to fetch site",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(":id")
  async updateSite(@Param("id") id: string, @Body() site: Partial<Site>) {
    try {
      const updatedSite = await this.sitesService.updateSite(
        parseInt(id),
        site,
      );
      if (!updatedSite) {
        throw new HttpException("Site not found", HttpStatus.NOT_FOUND);
      }
      return updatedSite;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        "Failed to update site",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  async deleteSite(@Param("id") id: string) {
    try {
      await this.sitesService.deleteSite(parseInt(id));
      return { message: "Site deleted successfully" };
    } catch (error) {
      throw new HttpException(
        "Failed to delete site",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
