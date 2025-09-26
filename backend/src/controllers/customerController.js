// Customer Controller
// Handles viewing policies, purchasing, making payments, viewing history
import PolicyProduct from '../models/policyProduct.js';
import UserPolicy from '../models/userPolicy.js';
import Payment from '../models/payment.js';
import Joi from 'joi';

const purchaseSchema = Joi.object({
  policyProductId: Joi.string().required(),
  startDate: Joi.date().required(),
  nominee: Joi.object({
    name: Joi.string().required(),
    relation: Joi.string().required()
  }).optional()
});

const paymentSchema = Joi.object({
  userPolicyId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  method: Joi.string().valid('Card', 'Netbanking', 'Offline', 'Simulated').default('Simulated'),
  reference: Joi.string().optional()
});

const customerController = {
  // Get details for a specific claim by claimId (customer)
  async getClaimById(req, res) {
    try {
      const Claim = (await import('../models/claim.js')).default;
      const claim = await Claim.findById(req.params.id).populate('userId userPolicyId decidedByAgentId');
      if (!claim) {
        return res.status(404).json({ success: false, message: 'Claim not found' });
      }
      // Only allow customer to view claim if they are the owner
      if (String(claim.userId) !== String(req.user.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      res.json({ success: true, claim });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
  // Raise a claim for a policy
  async raiseClaim(req, res) {
    const { userPolicyId, incidentDate, description, amountClaimed } = req.body;
    const userPolicy = await UserPolicy.findById(userPolicyId);
    if (!userPolicy) return res.status(404).json({ success: false, message: 'User policy not found' });
    const Claim = (await import('../models/claim.js')).default;
    const claim = await Claim.create({
      userId: req.user.userId,
      userPolicyId,
      incidentDate,
      description,
      amountClaimed,
      status: 'Pending'
    });
    res.json({ success: true, claim });
  },
  // View all policies
  async viewPolicies(req, res) {
    const policies = await PolicyProduct.find();
    res.json({ success: true, policies });
  },

  // Purchase a policy
  async purchasePolicy(req, res) {
    const { error, value } = purchaseSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details });
    const { policyProductId, startDate, nominee } = value;
    const userId = req.user.userId;
    const policyProduct = await PolicyProduct.findById(policyProductId);
    if (!policyProduct) return res.status(404).json({ success: false, message: 'Policy not found' });
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + policyProduct.termMonths);
    const userPolicy = await UserPolicy.create({
      userId,
      policyProductId,
      startDate,
      endDate,
      status: 'Pending',
      nominee,
      assignedAgentId: policyProduct.assignedAgentId || null
    });
    res.json({ success: true, userPolicy });
  },

  // Make payment for a policy
  async makePayment(req, res) {
    const { error, value } = paymentSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details });
    const { userPolicyId, amount, method, reference } = value;
    const userPolicy = await UserPolicy.findById(userPolicyId);
    if (!userPolicy) return res.status(404).json({ success: false, message: 'User policy not found' });
    const payment = await Payment.create({
      userId: req.user.userId,
      userPolicyId,
      amount,
      method,
      reference: reference || `PAY_${Date.now()}`
    });
    userPolicy.premiumPaid = (userPolicy.premiumPaid || 0) + amount;
    await userPolicy.save();
    res.json({ success: true, payment });
  },

  // View payment history
  async paymentHistory(req, res) {
    const payments = await Payment.find({ userId: req.user.userId }).populate('userPolicyId');
    res.json({ success: true, payments });
  },

  // View purchased policies
  async myPolicies(req, res) {
    const policies = await UserPolicy.find({ userId: req.user.userId }).populate('policyProductId');
    const result = policies.map(p => ({
      userPolicyId: p._id,
      status: p.status,
      verificationType: p.verificationType,
      policy: p.policyProductId,
      startDate: p.startDate,
      endDate: p.endDate,
      nominee: p.nominee
    }));
    res.json({ success: true, policies: result });
  },

  // Cancel a policy
  async cancelPolicy(req, res) {
    try {
      const { userPolicyId } = req.body;
      const userId = req.user.userId;

      // Find the user policy and ensure it belongs to the authenticated user
      const userPolicy = await UserPolicy.findOne({
        _id: userPolicyId,
        userId: userId
      });

      if (!userPolicy) {
        return res.status(404).json({ 
          success: false, 
          message: 'User policy not found or you do not have permission to cancel this policy' 
        });
      }

      if (userPolicy.status === 'Cancelled') {
        return res.status(400).json({ 
          success: false, 
          message: 'Policy is already cancelled.' 
        });
      }

      if (userPolicy.status !== 'Approved') {
        return res.status(400).json({ 
          success: false, 
          message: 'Only approved policies can be cancelled.' 
        });
      }

      // Update policy status to cancelled
      userPolicy.status = 'Cancelled';
      await userPolicy.save();

      res.json({
        success: true,
        userPolicyId: userPolicy._id,
        status: userPolicy.status,
        message: 'Policy cancelled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error cancelling policy',
        error: error.message
      });
    }
  },
    // Get a policy by its ID (customer)
  async getPolicyById(req, res) {
    try {
      const { id } = req.params;
      const policy = await PolicyProduct.findById(id);
      if (!policy) {
        return res.status(404).json({ success: false, message: 'Policy not found' });
      }
      res.json({ success: true, policy });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

export default customerController;
