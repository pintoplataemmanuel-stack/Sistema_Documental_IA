const mongoose = require("mongoose");
const { mongodbUri } = require("./env");

async function connectDB() {
  try {
    const conn = await mongoose.connect(mongodbUri);
    console.log(`MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error conectando a MongoDB: ${error.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
