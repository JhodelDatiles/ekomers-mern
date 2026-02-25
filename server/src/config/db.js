import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config();

const conn = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log("Successfully connected to DB!")
  } catch (error) {
    console.error("Error: ",error.message);
    process.exit(1);
  }
}
export default conn;