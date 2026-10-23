import mongoose from 'mongoose';

export const connectToDatabase = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  await mongoose.connect(uri);

  console.log('MongoDB connected');
};

export const disconnectFromDatabase = async () => {
  await mongoose.disconnect();
};
