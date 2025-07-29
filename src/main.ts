import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        "https://time-tracker-medical.vercel.app",
        "https://helpful-marigold-200840.netlify.app"
      ];
      
      // Allow Vercel preview deployments
      if (origin && origin.match(/https:\/\/time-tracker-medical-.*\.vercel\.app$/)) {
        return callback(null, true);
      }
      
      // Allow listed origins or no origin (for mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Accept', 
      'Authorization', 
      'X-Requested-With', 
      'Origin', 
      'Cookie',
      'Access-Control-Allow-Credentials'
    ],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  const port = process.env.PORT || 3000;
  console.log(`Application is running on port ${port}`);
  await app.listen(port, "0.0.0.0"); // Important: Listen on 0.0.0.0 for Railway
}
bootstrap();
