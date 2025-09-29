// Customer Controller
// Handles viewing policies, purchasing, making payments, viewing history
import PolicyProduct from '../models/policyProduct.js';
import UserPolicy from '../models/userPolicy.js';
import Payment from '../models/payment.js';
import Joi from 'joi';

const nomineeRelations = ['Spouse','Parent','Child','Sibling','Relative','Friend','Other'];
const purchaseSchema = Joi.object({
  policyProductId: Joi.string().required(),
  startDate: Joi.date().required(),
  nominee: Joi.object({
    name: Joi.string().required(),
    relation: Joi.string().valid(...nomineeRelations).required()
  }).optional()
});

// Payment request: backend derives amount from policy premium; client only supplies method
const paymentSchema = Joi.object({
  userPolicyId: Joi.string().required(),
  method: Joi.string().valid('Card', 'Netbanking', 'Offline', 'UPI', 'Simulated').required(),
  reference: Joi.string().optional()
});

const customerController = {
  // Get details for a specific claim by claimId (customer)
  async getClaimById(req, res) {
    try {
      const Claim = (await import('../models/claim.js')).default;
      const claim = await Claim.findById(req.params.id)
        .populate({ path: 'userPolicyId', populate: { path: 'policyProductId', populate: { path: 'assignedAgentId', model: 'Agent' } } })
        .populate({ path: 'userPolicyId', populate: { path: 'assignedAgentId', model: 'Agent' } })
        .populate('userId decidedByAgentId');
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
    const userPolicy = await UserPolicy.findById(userPolicyId)
      .populate({ path: 'policyProductId', populate: { path: 'assignedAgentId', model: 'Agent' } })
      .populate({ path: 'assignedAgentId', model: 'Agent' });
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
    res.json({ success: true, claim, userPolicy });
  },
  // View all policies
  async viewPolicies(req, res) {
    const policies = await PolicyProduct.find()
      .populate({ path: 'assignedAgentId', model: 'Agent' });
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
    try {
      // Validate and strip unknown fields (e.g., client-supplied amount will be ignored)
      const { error, value } = paymentSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) return res.status(400).json({ success: false, error: error.details });

      const { userPolicyId, method, reference } = value;
      const userId = req.user.userId;

      // Ensure policy exists and belongs to the user
      const userPolicy = await UserPolicy.findById(userPolicyId).populate('policyProductId');
      if (!userPolicy) {
        return res.status(404).json({ success: false, message: 'User policy not found' });
      }
      if (String(userPolicy.userId) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'You do not have permission to pay for this policy' });
      }

      // Only allow payments for approved policies
      if (userPolicy.status !== 'Approved') {
        return res.status(400).json({ success: false, message: 'Payments are allowed only for approved policies' });
      }

      // Derive amount and term from the product
      const product = userPolicy.policyProductId; // populated PolicyProduct
      if (!product) {
        return res.status(500).json({ success: false, message: 'Linked policy product not found' });
      }
      const installmentAmount = Number(product.premium || 0);
      const termMonths = Number(product.termMonths || 0);
      if (!installmentAmount || !termMonths) {
        return res.status(400).json({ success: false, message: 'Policy product has invalid premium or term' });
      }

      // Prevent paying more installments than term
      const paidCount = await Payment.countDocuments({ userPolicyId: userPolicy._id });
      if (paidCount >= termMonths) {
        return res.status(400).json({ success: false, message: 'All installments for this policy have already been paid' });
      }

      // Create payment with server-calculated amount
      const payment = await Payment.create({
        userId,
        userPolicyId: userPolicy._id,
        amount: installmentAmount,
        method,
        reference: reference || `PAY_${Date.now()}`
      });

      // Update aggregate premium paid on the user policy
      userPolicy.premiumPaid = Number(userPolicy.premiumPaid || 0) + installmentAmount;
      await userPolicy.save();

      res.json({
        success: true,
        message: 'Payment successful',
        payment,
        meta: {
          paidCount: paidCount + 1,
          termMonths,
          remaining: Math.max(0, termMonths - (paidCount + 1)),
          installmentAmount
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to process payment', error: err.message });
    }
  },

  // View payment history
  async paymentHistory(req, res) {
    const payments = await Payment.find({ userId: req.user.userId })
      .populate({ path: 'userPolicyId', populate: { path: 'policyProductId', populate: { path: 'assignedAgentId', model: 'Agent' } } })
      .populate({ path: 'userPolicyId', populate: { path: 'assignedAgentId', model: 'Agent' } });
    res.json({ success: true, payments });
  },

  // View claims raised by this customer
  async myClaims(req, res) {
    try {
      const Claim = (await import('../models/claim.js')).default;
      const claims = await Claim.find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .populate({ path: 'userPolicyId', populate: { path: 'policyProductId', populate: { path: 'assignedAgentId', model: 'Agent' } } })
        .populate({ path: 'userPolicyId', populate: { path: 'assignedAgentId', model: 'Agent' } });
      res.json({ success: true, claims });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to load claims', error: err.message });
    }
  },

  // View purchased policies
  async myPolicies(req, res) {
    const policies = await UserPolicy.find({ userId: req.user.userId })
      .populate({ path: 'policyProductId', populate: { path: 'assignedAgentId', model: 'Agent' } })
      .populate({ path: 'assignedAgentId', model: 'Agent' });
    const result = policies.map(p => ({
      userPolicyId: p._id,
      status: p.status,
      verificationType: p.verificationType,
      policy: p.policyProductId,
      startDate: p.startDate,
      endDate: p.endDate,
      nominee: p.nominee,
      assignedAgentId: p.assignedAgentId // populated Agent object if present
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
