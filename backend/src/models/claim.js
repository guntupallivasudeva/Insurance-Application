import mongoose from 'mongoose';

const ClaimSchema = new mongoose.Schema({
  userId: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
    },
  userPolicyId: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UserPolicy', 
    required: true 
    },
  incidentDate: 
  { 
    type: Date, 
    required: true 
    },
  description: 
  { 
    type: String , 
    required: true
},
  amountClaimed: 
  { 
    type: Number, 
    required: true 
},
  status: 
  { 
    type: String, 
    enum: ['Pending','Approved','Rejected'], 
    default: 'Pending' 
},
  decisionNotes: 
  {
    type: String 
    },
  decidedByAgentId: 
  { 
    type: mongoose.Schema.Types.ObjectId,
     ref: 'Agent' 
    },
    createdAt:
    { type: Date, 
      default: Date.now 
    }
});

export default mongoose.model('Claim', ClaimSchema);
