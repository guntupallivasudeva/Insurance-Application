import mongoose from 'mongoose';

const PolicyProductSchema = new mongoose.Schema({
  assignedAgentName: {
    type: String,
    default: null
  },
  assignedAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  code: 
  { 
    type: String, 
    required: true, 
    unique: true 
},
  title: 
  { 
    type: String,
    required: true 
    },
  description: 
  { 
    type: String ,
    required: true
  },
  premium: 
  { 
    type: Number, 
    required: true 
    },        // monthly or yearly depending on term
  termMonths: 
  { 
    type: Number, 
    required: true 
    },  // duration in months
  minSumInsured: 
  { 
    type: Number, 
    default: 0 
    }, // minimum coverage amount
    createdAt: 
    { 
      type: Date,
      default: Date.now
    }
});

export default mongoose.model('PolicyProduct', PolicyProductSchema);

