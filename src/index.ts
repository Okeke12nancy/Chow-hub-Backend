import "reflect-metadata";
import dotenv from "dotenv";
import { AppDataSource } from "./data-source";
import app from "./app";

dotenv.config();

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log("Database connection initialized successfully");
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Error initializing database connection:", error);
    process.exit(1);
  });