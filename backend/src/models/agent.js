import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['Agent'], default: 'Agent' },
  agentCode: { type: String, unique: true, sparse: true, index: true }
});

AgentSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

AgentSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

// This model is now for agents only. Collection name: 'agents'.
export default mongoose.model('Agent', AgentSchema, 'agents');