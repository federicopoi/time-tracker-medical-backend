import { Injectable } from "@nestjs/common";
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();



@Injectable()
export class DatabaseService {
    private pool = new Pool({connectionString: process.env.DATABASE_URL});

    async query<T = any>(sql:string, params?: any[]): Promise<T[]> {
        const result = await this.pool.query(sql, params);
        return result.rows;
    }
}