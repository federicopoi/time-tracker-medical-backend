import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Enable CORS
  app.enableCors({
    origin: "http://localhost:5173", // Use your frontend URL in production
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  console.log(`Application is running on port ${port}`);
  await app.listen(port, "0.0.0.0"); // Important: Listen on 0.0.0.0 for Railway
}
bootstrap();
