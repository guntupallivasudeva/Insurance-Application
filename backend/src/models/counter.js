import mongoose from 'mongoose';

// Generic counter collection to store sequences for auto-generated codes
// Document shape: { _id: 'agentCode', seq: Number }
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export default mongoose.model('Counter', CounterSchema, 'counters');
