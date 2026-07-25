import mongoose from 'mongoose'
import { config } from '.././envconfig.js'

const conn = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri)
    console.log("Successfully connected to DB!")
  } catch (error) {
    console.error("Error: ",error.message);
    process.exit(1);
  }
}
export default conn;