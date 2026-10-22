// MongoDB connection (Mongoose). §16.
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is missing. Did you create your .env file?');
  }
  // strictQuery keeps queries predictable across Mongoose versions.
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = connectDB;
