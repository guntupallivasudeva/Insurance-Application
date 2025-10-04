import Agent from '../models/agent.js';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import UserPolicy from '../models/userPolicy.js';
import Payment from '../models/payment.js';
import Claim from '../models/claim.js';
import PolicyProduct from '../models/policyProduct.js';
import AuditLog from '../models/auditLog.js';
import User from '../models/User.js';

const agentLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Agent login controller
export const loginAgent = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { error } = agentLoginSchema.validate({ email, password });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const agent = await Agent.findOne({ email });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const isMatch = await agent.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: agent._id, role: agent.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    const { password: agentPassword, ...agentResponse } = agent.toObject();
    res.status(200).json({
      success: true,
      message: 'Agent login successful',
      token,
      agent: agentResponse
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to login agent: ' + err.message });
  }
};

const agentController = {
  // Update claim details (agent permitted fields)
  async updateClaim(req, res) {
    try {
      const { id } = req.params;
      // validate payload similar to admin but scoped for agents
      const schema = Joi.object({
        incidentDate: Joi.date().optional(),
        description: Joi.string().trim().min(1).max(1000).optional(),
        amountClaimed: Joi.number().positive().optional(),
        decisionNotes: Joi.string().trim().allow('', null).optional()
      }).min(1);
      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
      }

      const claim = await Claim.findById(id);
      if (!claim) {
        return res.status(404).json({ success: false, message: 'Claim not found' });
      }

      // Ensure agent is assigned to this claim's policy
      const userPolicy = await UserPolicy.findById(claim.userPolicyId);
      if (!userPolicy || String(userPolicy.assignedAgentId) !== String(req.user.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      // Apply updates
      ['incidentDate', 'description', 'amountClaimed', 'decisionNotes'].forEach((k) => {
        if (value[k] !== undefined) claim[k] = value[k];
      });
      await claim.save();

      const populated = await Claim.findById(id)
        .populate('userId', 'name email')
        .populate('userPolicyId')
        .populate('decidedByAgentId', 'name');
      res.json({ success: true, claim: populated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
  // View unique policy products assigned to agent
  async assignedPolicies(req, res) {
    try {
      // Only return policies where assignedAgentId matches the agent
      const agentId = req.query.agentId || req.user.userId;
      // Ensure agentId is ObjectId for query
      const mongoose = await import('mongoose');
      const agentObjectId = mongoose.default.Types.ObjectId.isValid(agentId) ? new mongoose.default.Types.ObjectId(agentId) : agentId;
      
      // Get unique policy products assigned to this agent
      const userPolicies = await UserPolicy.find({ assignedAgentId: agentObjectId })
        .populate('policyProductId')
        .distinct('policyProductId');
      
      const policyProductIds = userPolicies.filter(id => id); // Remove null values
      
      // Get policy product details with customer count
      const PolicyProduct = (await import('../models/policyProduct.js')).default;
      const policyProducts = await PolicyProduct.find({ _id: { $in: policyProductIds } });
      
      const result = await Promise.all(policyProducts.map(async (policy) => {
        const customerCount = await UserPolicy.countDocuments({ 
          policyProductId: policy._id,
          assignedAgentId: agentObjectId 
        });
        
        return {
          policyProductId: policy._id,
          code: policy.code,
          title: policy.title,
          description: policy.description,
          premium: policy.premium,
          termMonths: policy.termMonths,
          minSumInsured: policy.minSumInsured,
          maxSumInsured: policy.maxSumInsured,
          customerCount: customerCount,
          createdAt: policy.createdAt
        };
      }));
      
      res.json({ success: true, policies: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get all customers for a specific policy product
  async getPolicyCustomers(req, res) {
    try {
      const { policyProductId } = req.params;
      const agentId = req.user.userId;
      
      // Ensure agentId is ObjectId for query
      const mongoose = await import('mongoose');
      const agentObjectId = mongoose.default.Types.ObjectId.isValid(agentId) ? new mongoose.default.Types.ObjectId(agentId) : agentId;
      const policyObjectId = mongoose.default.Types.ObjectId.isValid(policyProductId) ? new mongoose.default.Types.ObjectId(policyProductId) : policyProductId;
      
      // Get all user policies for this policy product assigned to this agent
      const userPolicies = await UserPolicy.find({ 
        policyProductId: policyObjectId,
        assignedAgentId: agentObjectId 
      })
      .populate('userId', 'name email')
      .populate('policyProductId', 'code title premium description termMonths minSumInsured maxSumInsured');
      
      const customers = await Promise.all(userPolicies.map(async (up) => {
        // Get payment information for this user policy
        const payments = await Payment.find({ userPolicyId: up._id });
        const totalPayments = payments.length;
        const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        
        // Calculate installments (assuming monthly payments)
        const installmentsDone = totalPayments;
        const totalInstallments = up.policyProductId.termMonths || 12;
        
        // Calculate next payment due date (assuming monthly installments)
        const nextPaymentDate = new Date(up.startDate);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + installmentsDone + 1);
        
        return {
          userPolicyId: up._id,
          customerId: up.userId._id,
          customerName: up.userId.name,
          customerEmail: up.userId.email,
          customerPhone: null, // User model doesn't have phone field
          status: up.status,
          startDate: up.startDate,
          endDate: up.endDate,
          premiumPaid: up.premiumPaid || 0,
          verificationType: up.verificationType,
          createdAt: up.createdAt,
          purchaseDate: up.createdAt,
          policyCode: up.policyProductId.code,
          policyTitle: up.policyProductId.title,
          policyNumber: `POL-${up._id.toString().slice(-8).toUpperCase()}`,
          policyType: up.policyProductId.title,
          policyPremium: up.policyProductId.premium || 0,
          totalPremium: up.policyProductId.premium || 0,
          paymentMethod: payments.length > 0 ? payments[0].method : 'Not Set',
          installmentsDone: installmentsDone,
          totalInstallments: totalInstallments,
          nextPaymentDate: installmentsDone < totalInstallments ? nextPaymentDate : null,
          coverageAmount: up.policyProductId.maxSumInsured || up.policyProductId.minSumInsured || 0,
          deductible: (up.policyProductId.minSumInsured || 0) * 0.1, // 10% of min sum insured as deductible
          policyTerm: `${up.policyProductId.termMonths || 12} months`,
          renewalDate: up.endDate
        };
      }));
      
      res.json({ success: true, customers: customers });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get payment history for a specific customer's policy
  async getCustomerPayments(req, res) {
    try {
      const { userPolicyId } = req.params;
      const agentId = req.user.userId;
      
      // Debug log
      // Ensure agentId is ObjectId for query
      const mongoose = await import('mongoose');
      const agentObjectId = mongoose.default.Types.ObjectId.isValid(agentId) ? new mongoose.default.Types.ObjectId(agentId) : agentId;
      const userPolicyObjectId = mongoose.default.Types.ObjectId.isValid(userPolicyId) ? new mongoose.default.Types.ObjectId(userPolicyId) : userPolicyId;
      
      // First verify that this user policy is assigned to this agent
      const userPolicy = await UserPolicy.findOne({ 
        _id: userPolicyObjectId,
        assignedAgentId: agentObjectId 
      })
      .populate('userId', 'name email')
      .populate('policyProductId', 'code title premium');
      
      if (!userPolicy) {
        return res.status(403).json({ success: false, message: 'Access denied - policy not assigned to this agent' });
      }
      
      // Get all payments for this user policy
      const payments = await Payment.find({ userPolicyId: userPolicyObjectId })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 }); // Most recent first
      
      const paymentHistory = payments.map(payment => ({
        paymentId: payment._id,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        paymentDate: payment.createdAt,
        customerName: payment.userId.name,
        customerEmail: payment.userId.email
      }));
      
      const response = {
        success: true,
        userPolicy: {
          userPolicyId: userPolicy._id,
          customerName: userPolicy.userId.name,
          customerEmail: userPolicy.userId.email,
          policyCode: userPolicy.policyProductId.code,
          policyTitle: userPolicy.policyProductId.title,
          policyPremium: userPolicy.policyProductId.premium,
          status: userPolicy.status,
          startDate: userPolicy.startDate,
          endDate: userPolicy.endDate,
          premiumPaid: userPolicy.premiumPaid
        },
        payments: paymentHistory,
        totalPayments: paymentHistory.length,
        totalAmount: paymentHistory.reduce((sum, p) => sum + p.amount, 0)
      };
      
      res.json(response);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // View payments for assigned policies
  async assignedPayments(req, res) {
    try {
      const policies = await UserPolicy.find({ assignedAgentId: req.user.userId });
      const payments = await Payment.find({ userPolicyId: { $in: policies.map(p => p._id) } })
        .populate('userId', 'name email')
        .populate('userPolicyId');
      
      const result = payments.map(p => ({
        paymentId: p._id,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        customerName: p.userId.name,
        customerEmail: p.userId.email,
        policyId: p.userPolicyId._id,
        createdAt: p.createdAt
      }));
      
      res.json({ success: true, payments: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Approve a policy
  async approvePolicy(req, res) {
    try {
      const { userPolicyId } = req.body;
      const userPolicy = await UserPolicy.findById(userPolicyId);
      if (!userPolicy) {
        return res.status(404).json({ success: false, message: 'User policy not found' });
      }
      
      // Check if agent is assigned to this policy
      if (String(userPolicy.assignedAgentId) !== String(req.user.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      
      userPolicy.status = 'Approved';
      userPolicy.verificationType = 'Agent';
      await userPolicy.save();
      
      res.json({
        success: true,
        userPolicyId: userPolicy._id,
        status: userPolicy.status,
        verificationType: userPolicy.verificationType
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // View all claims for policies assigned to the agent
  async assignedClaims(req, res) {
    try {
      // Find all user policies where this agent is assigned
      const userPolicies = await UserPolicy.find({ assignedAgentId: req.user.userId });
      const userPolicyIds = userPolicies.map(up => up._id);
      
      // Find all claims for these user policies
      const claims = await Claim.find({ userPolicyId: { $in: userPolicyIds } })
        .populate('userId', 'name email')
        .populate('userPolicyId')
        .populate('decidedByAgentId', 'name');
      
      const result = claims.map(c => ({
        claimId: c._id,
        incidentDate: c.incidentDate,
        description: c.description,
        amountClaimed: c.amountClaimed,
        status: c.status,
        decisionNotes: c.decisionNotes,
        customerName: c.userId.name,
        customerEmail: c.userId.email,
        policyId: c.userPolicyId._id,
        decidedBy: c.decidedByAgentId?.name,
        createdAt: c.createdAt
      }));
      
      res.json({ success: true, claims: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get details for a specific claim by claimId (agent)
  async getClaimById(req, res) {
    try {
      const claim = await Claim.findById(req.params.id)
        .populate('userId', 'name email')
        .populate('userPolicyId')
        .populate('decidedByAgentId', 'name');
      
      if (!claim) {
        return res.status(404).json({ success: false, message: 'Claim not found' });
      }
      
      // Only allow agent to view claim if they are assigned to the policy
      const userPolicy = await UserPolicy.findById(claim.userPolicyId);
      if (!userPolicy || String(userPolicy.assignedAgentId) !== String(req.user.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      
      res.json({ success: true, claim });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Approve claim (agent)
  async approveClaim(req, res) {
    try {
      const { claimId, decisionNotes } = req.body;
      const claim = await Claim.findById(claimId);
      
      if (!claim) {
        return res.status(404).json({ success: false, message: 'Claim not found' });
      }
      
      // Check if agent is assigned to this policy
      const userPolicy = await UserPolicy.findById(claim.userPolicyId);
      if (!userPolicy || String(userPolicy.assignedAgentId) !== String(req.user.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      
      claim.status = 'Approved';
      claim.decidedByAgentId = req.user.userId;
      claim.decisionNotes = decisionNotes || '';
      claim.verificationType = 'Agent';
      await claim.save();
      
      // Update user policy status to 'Claimed'
      userPolicy.status = 'Claimed';
      await userPolicy.save();
      
      res.json({ success: true, claim });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Reject claim (agent)
  async rejectClaim(req, res) {
    try {
      const { claimId, decisionNotes } = req.body;
      const claim = await Claim.findById(claimId);
      
      if (!claim) {
        return res.status(404).json({ success: false, message: 'Claim not found' });
      }
      
      // Check if agent is assigned to this policy
      const userPolicy = await UserPolicy.findById(claim.userPolicyId);
      if (!userPolicy || String(userPolicy.assignedAgentId) !== String(req.user.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      
      claim.status = 'Rejected';
      claim.decidedByAgentId = req.user.userId;
      claim.decisionNotes = decisionNotes || '';
      claim.verificationType = 'Agent';
      await claim.save();
      
      res.json({ success: true, claim });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const agentId = req.user.userId;
      
      // Get assigned policies
      const policies = await UserPolicy.find({ assignedAgentId: agentId });
      const policyIds = policies.map(p => p._id);
      
      // Get unique customers from assigned policies
      const uniqueCustomerIds = [...new Set(policies.map(p => p.userId.toString()))];
      const approvedCustomers = policies.filter(p => p.status === 'Approved');
      const uniqueApprovedCustomerIds = [...new Set(approvedCustomers.map(p => p.userId.toString()))];
      
      // Get claims for assigned policies
      const claims = await Claim.find({ userPolicyId: { $in: policyIds } });
      
      // Get payments for assigned policies
      const payments = await Payment.find({ userPolicyId: { $in: policyIds } });
      
      const stats = {
        totalPolicies: policies.length,
        approvedPolicies: policies.filter(p => p.status === 'Approved').length,
        pendingPolicies: policies.filter(p => p.status === 'Pending').length,
        totalClaims: claims.length,
        pendingClaims: claims.filter(c => c.status === 'Pending').length,
        approvedClaims: claims.filter(c => c.status === 'Approved').length,
        rejectedClaims: claims.filter(c => c.status === 'Rejected').length,
        totalPayments: payments.length,
        totalPaymentAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        totalCustomers: uniqueCustomerIds.length,
        approvedCustomers: uniqueApprovedCustomerIds.length
      };
      
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get policy purchase requests assigned to this agent
  async getPolicyRequests(req, res) {
    try {
      const agentId = req.user.userId;
      
      // Ensure agentId is ObjectId for query
      const mongoose = await import('mongoose');
      const agentObjectId = mongoose.default.Types.ObjectId.isValid(agentId) ? new mongoose.default.Types.ObjectId(agentId) : agentId;
      
      // Get all user policies assigned to this agent with 'Pending' status
      const policyRequests = await UserPolicy.find({ 
        assignedAgentId: agentObjectId,
        status: 'Pending'
      })
      .populate('userId', 'name email')
      .populate('policyProductId', 'code title premium termMonths')
      .sort({ createdAt: -1 }); // Most recent first
      
      const requests = policyRequests.map(up => ({
        userPolicyId: up._id,
        customerId: up.userId._id,
        customerName: up.userId.name,
        customerEmail: up.userId.email,
        policyId: up.policyProductId._id,
        policyCode: up.policyProductId.code,
        policyTitle: up.policyProductId.title,
        premium: up.policyProductId.premium,
        termMonths: up.policyProductId.termMonths,
        status: up.status,
        requestDate: up.createdAt,
        verificationType: up.verificationType
      }));
      
      res.json({ success: true, requests: requests });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Approve a policy purchase request
  async approvePolicyRequest(req, res) {
    try {
      const { userPolicyId } = req.params;
      const agentId = req.user.userId;
      
      // Validate userPolicyId format
      if (!userPolicyId || userPolicyId.length !== 24) {
        console.log('Invalid userPolicyId format:', userPolicyId);
        return res.status(400).json({ success: false, message: 'Invalid policy ID format' });
      }
      
      // Ensure proper ObjectId conversion
      const mongoose = await import('mongoose');
      const agentObjectId = mongoose.default.Types.ObjectId.isValid(agentId) ? new mongoose.default.Types.ObjectId(agentId) : agentId;
      const policyObjectId = mongoose.default.Types.ObjectId.isValid(userPolicyId) ? new mongoose.default.Types.ObjectId(userPolicyId) : userPolicyId;
      
      console.log('Searching for policy with ID:', policyObjectId, 'assigned to agent:', agentObjectId);
      
      // Find the policy request and verify it's assigned to this agent
      const userPolicy = await UserPolicy.findOne({ 
        _id: policyObjectId,
        assignedAgentId: agentObjectId,
        status: 'Pending'
      }).populate('userId', 'name email')
        .populate('policyProductId', 'title code premium termMonths')
        .populate('assignedAgentId', 'name email agentCode');
      
      if (!userPolicy) {
        console.log('Policy request not found or already processed');
        return res.status(404).json({ success: false, message: 'Policy request not found or already processed' });
      }
      
      console.log('Found policy:', userPolicy.status, 'for customer:', userPolicy.userId?.name);
      
      // Update the policy status to Approved
      userPolicy.status = 'Approved';
      userPolicy.verificationType = 'Agent';
      userPolicy.startDate = new Date();
      
      // Calculate end date based on term months from policy product
      if (userPolicy.policyProductId) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (userPolicy.policyProductId.termMonths || 12));
        userPolicy.endDate = endDate;
      }
      
      await userPolicy.save();
      
      // Create audit log for admin notification
      await AuditLog.create({
        action: 'POLICY_APPROVED',
        userId: userPolicy.userId._id,
        details: `Policy ${userPolicy.policyProductId?.title || 'Unknown'} (${userPolicy.policyProductId?.code || 'N/A'}) approved by agent ${userPolicy.assignedAgentId?.name || 'Unknown'} for customer ${userPolicy.userId?.name || 'Unknown'}`
      });
      
      console.log('Policy approved successfully:', userPolicyId);
      res.json({ success: true, message: 'Policy request approved successfully' });
      
    } catch (err) {
      console.error('Error in approvePolicyRequest:', err.message);
      console.error('Full error:', err);
      res.status(500).json({ success: false, error: 'Failed to approve policy: ' + err.message });
    }
  },

  // Reject a policy purchase request
  async rejectPolicyRequest(req, res) {
    try {
      const { userPolicyId } = req.params;
      const agentId = req.user.userId;
      
      // Debug log
      // Validate userPolicyId format
      if (!userPolicyId || userPolicyId.length !== 24) {
        console.log('Invalid userPolicyId format:', userPolicyId);
        return res.status(400).json({ success: false, message: 'Invalid policy ID format' });
      }
      
      // Ensure proper ObjectId conversion
      const mongoose = await import('mongoose');
      const agentObjectId = mongoose.default.Types.ObjectId.isValid(agentId) ? new mongoose.default.Types.ObjectId(agentId) : agentId;
      const policyObjectId = mongoose.default.Types.ObjectId.isValid(userPolicyId) ? new mongoose.default.Types.ObjectId(userPolicyId) : userPolicyId;
      
      console.log('Searching for policy with ID:', policyObjectId, 'assigned to agent:', agentObjectId);
      
      // Find the policy request and verify it's assigned to this agent
      const userPolicy = await UserPolicy.findOne({ 
        _id: policyObjectId,
        assignedAgentId: agentObjectId,
        status: 'Pending'
      }).populate('userId', 'name email')
        .populate('policyProductId', 'title code premium termMonths')
        .populate('assignedAgentId', 'name email agentCode');
      
      if (!userPolicy) {
        console.log('Policy request not found or already processed');
        return res.status(404).json({ success: false, message: 'Policy request not found or already processed' });
      }
      
      console.log('Found policy:', userPolicy.status, 'for customer:', userPolicy.userId?.name);
      
      // Update the policy status to Rejected
      userPolicy.status = 'Rejected';
      userPolicy.verificationType = 'Agent';
      
      await userPolicy.save();
      
      // Create audit log for admin notification
      await AuditLog.create({
        action: 'POLICY_REJECTED',
        userId: userPolicy.userId._id,
        details: `Policy ${userPolicy.policyProductId?.title || 'Unknown'} (${userPolicy.policyProductId?.code || 'N/A'}) rejected by agent ${userPolicy.assignedAgentId?.name || 'Unknown'} for customer ${userPolicy.userId?.name || 'Unknown'}`
      });
      
      console.log('Policy rejected successfully:', userPolicyId);
      res.json({ success: true, message: 'Policy request rejected successfully' });
      
    } catch (err) {
      console.error('Error in rejectPolicyRequest:', err.message);
      console.error('Full error:', err);
      res.status(500).json({ success: false, error: 'Failed to reject policy: ' + err.message });
    }
  },

  // Get approved customers for this agent
  async getApprovedCustomers(req, res) {
    try {
      const agentId = req.user.userId;
      
      // Ensure proper ObjectId conversion
      const mongoose = await import('mongoose');
      const agentObjectId = mongoose.default.Types.ObjectId.isValid(agentId) ? new mongoose.default.Types.ObjectId(agentId) : agentId;
      
      // Find all approved user policies assigned to this agent
      const approvedPolicies = await UserPolicy.find({ 
        assignedAgentId: agentObjectId,
        status: 'Approved'
      })
      .populate('userId', 'name email phone')
      .populate('policyProductId', 'title code premium termMonths')
      .populate('assignedAgentId', 'name email agentCode')
      .sort({ startDate: -1 });
      
      // Transform the data to match the frontend Customer interface
      const customers = approvedPolicies.map(policy => ({
        userPolicyId: policy._id.toString(),
        customerId: policy.userId._id.toString(),
        customerName: policy.userId.name,
        customerEmail: policy.userId.email,
        customerPhone: policy.userId.phone || '',
        status: policy.status,
        startDate: policy.startDate,
        endDate: policy.endDate,
        premiumPaid: policy.premiumPaid,
        verificationType: policy.verificationType,
        createdAt: policy.createdAt,
        policyCode: policy.policyProductId.code,
        policyTitle: policy.policyProductId.title,
        policyPremium: policy.policyProductId.premium,
        policyNumber: `POL-${policy._id.toString().slice(-8).toUpperCase()}`,
        policyType: policy.policyProductId.title,
        purchaseDate: policy.createdAt,
        totalPremium: policy.premiumPaid,
        paymentMethod: 'Online', // Default value
        installmentsDone: 1 // Default value
      }));
      
      res.json({ success: true, customers });
      
    } catch (err) {
      console.error('Error in getApprovedCustomers:', err.message);
      console.error('Full error:', err);
      res.status(500).json({ success: false, error: 'Failed to get approved customers: ' + err.message });
    }
  },

  async getPaymentCustomers(req, res) {
    try {
      const agentId = req.user.userId;

      const mongoose = await import('mongoose');
      const agentObjectId = mongoose.default.Types.ObjectId.isValid(agentId) ? new mongoose.default.Types.ObjectId(agentId) : agentId;

      // Find all user policies assigned to this agent with payments
      const userPolicies = await UserPolicy.find({ 
        assignedAgentId: agentObjectId 
      })
      .populate('userId', 'name email')
      .populate('policyProductId', 'code title premium termMonths minSumInsured maxSumInsured')
      .sort({ createdAt: -1 });

      // Get payments for these policies
      const paymentCustomers = [];
      
      for (const userPolicy of userPolicies) {
        const payments = await Payment.find({ 
          userPolicyId: userPolicy._id 
        }).sort({ createdAt: -1 });

        if (payments.length > 0) {
          const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
          const lastPayment = payments[0];
          const paymentMethods = [...new Set(payments.map(p => p.method))];

          paymentCustomers.push({
            customerId: userPolicy.userId._id,
            customerName: userPolicy.userId.name,
            customerEmail: userPolicy.userId.email,
            policyTitle: userPolicy.policyProductId.title,
            policyCode: userPolicy.policyProductId.code,
            policyNumber: userPolicy._id.toString().slice(-8).toUpperCase(),
            policyPremium: userPolicy.policyProductId.premium,
            policyStatus: userPolicy.status,
            policyStartDate: userPolicy.startDate,
            policyEndDate: userPolicy.endDate,
            totalPayments: payments.length,
            totalAmount: totalAmount,
            lastPaymentDate: lastPayment.createdAt,
            primaryPaymentMethod: paymentMethods[0] || 'Online',
            paymentHistory: payments.map(payment => ({
              paymentId: payment._id,
              amount: payment.amount,
              method: payment.method,
              paymentDate: payment.createdAt,
              reference: payment.reference,
              status: 'Completed'
            }))
          });
        }
      }

      res.status(200).json({ success: true, customers: paymentCustomers });

    } catch (error) {
      console.error('Error getting payment customers:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error retrieving payment customers', 
        error: error.message 
      });
    }
  }
};

export default agentController;
