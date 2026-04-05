import mongoose from 'mongoose';

const allowedNomineeRelations = ['Spouse','Parent','Child','Sibling','Relative','Friend','Other'];
const NomineeSchema = new mongoose.Schema({
  name: { type: String },
  relation: { type: String, enum: allowedNomineeRelations }
});

const UserPolicySchema = new mongoose.Schema({
  verificationType: {
    type: String,
    enum: ['Agent', 'Admin', 'None'],
    default: 'None'
  },
  userId: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
},
  policyProductId: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PolicyProduct', 
    required: true 
},
  startDate: 
  { 
    type: Date, 
    required: true 
},
  endDate: 
  { 
    type: Date, 
    required: true 
},
  premiumPaid: 
  { 
    type: Number, 
    default: 0 
},
  status: 
  { 
    type: String, 
    enum: ['Pending','Approved','Cancelled','Expired','Claimed'], 
    default: 'Pending' 
  },
  assignedAgentId: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent' 
},
  nominee: 
  { 
    type: NomineeSchema
},
  createdAt:
    { type: Date, 
      default: Date.now 
    }
});

export default mongoose.model('UserPolicy', UserPolicySchema);

