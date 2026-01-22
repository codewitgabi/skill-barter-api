import mongoose from "mongoose";
import { config } from "dotenv";
config();

const connectDb = async () => {
  return await mongoose.connect(process.env.DATABASE_URI as string);
};

export default connectDb;
