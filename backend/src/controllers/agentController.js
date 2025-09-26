import Agent from '../models/agent.js';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import UserPolicy from '../models/userPolicy.js';
import Payment from '../models/payment.js';
import Claim from '../models/claim.js';

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
  // Get details for a specific claim by claimId (agent)
  async getClaimById(req, res) {
    try {
      const claim = await Claim.findById(req.params.id).populate('userId userPolicyId decidedByAgentId');
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
    const { claimId } = req.body;
    const claim = await Claim.findById(claimId);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    claim.status = 'Approved';
    claim.decidedByAgentId = req.user.userId;
    await claim.save();
    // Update user policy status to 'Claimed'
    const userPolicy = await UserPolicy.findById(claim.userPolicyId);
    if (userPolicy) {
      userPolicy.status = 'Claimed';
      await userPolicy.save();
    }
    res.json({ success: true, claim });
  },

  // View policies assigned to agent
  async assignedPolicies(req, res) {
    // Allow retrieval by agentId from query or authenticated agent
    const agentId = req.query.agentId || req.user.userId;
    const PolicyProduct = (await import('../models/policyProduct.js')).default;
    // Find products assigned to agent
    const assignedProducts = await PolicyProduct.find({ assignedAgentId: agentId });
    const productIds = assignedProducts.map(p => p._id);
    // Find policies assigned via product or directly via UserPolicy.assignedAgentId
    const policies = await UserPolicy.find({
      $or: [
        { policyProductId: { $in: productIds } },
        { assignedAgentId: agentId }
      ]
    }).populate('policyProductId');
    // Only return policy name and policy id
    const result = policies.map(p => ({
      policyId: p._id,
      policyName: p.policyProductId?.title || ''
    }));
    res.json(result);
  },

  // View payments for assigned policies
  async assignedPayments(req, res) {
    const policies = await UserPolicy.find({ agentId: req.user.userId });
    const payments = await Payment.find({ userPolicyId: { $in: policies.map(p => p._id) } });
    res.json({ success: true, payments });
  },

  // Approve a policy
  async approvePolicy(req, res) {
    const { userPolicyId } = req.body;
    const userPolicy = await UserPolicy.findById(userPolicyId);
    if (!userPolicy) return res.status(404).json({ success: false, message: 'User policy not found' });
    userPolicy.status = 'Approved';
    userPolicy.verificationType = 'Agent';
    await userPolicy.save();
    res.json({
      success: true,
      userPolicyId: userPolicy._id,
      status: userPolicy.status,
      verificationType: userPolicy.verificationType
    });
  },

  // Add claim for a policy
  async addClaim(req, res) {
    const { userPolicyId, description, amount } = req.body;
    const claim = await Claim.create({
      userPolicyId,
      agentId: req.user.userId,
      description,
      amount,
      status: 'Pending'
    });
    res.json({ success: true, claim });
  },
   // View all claims for policies assigned to the agent
  async assignedClaims(req, res) {
    try {
      // Find all user policies where this agent is assigned
      const userPolicies = await UserPolicy.find({ assignedAgentId: req.user.userId });
      const userPolicyIds = userPolicies.map(up => up._id);
      // Find all claims for these user policies
      const claims = await Claim.find({ userPolicyId: { $in: userPolicyIds } }).populate('userId userPolicyId');
      res.json({ success: true, claims });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
  // Get details for a specific claim by claimId (agent)
  async getClaimById(req, res) {
    try {
      const claim = await Claim.findById(req.params.id).populate('userId userPolicyId decidedByAgentId');
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
};

export default agentController;
