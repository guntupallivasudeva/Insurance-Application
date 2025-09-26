// Admin Controller
// Handles viewing all user policies, payments, assigning policies to agents, agent account creation
import UserPolicy from '../models/userPolicy.js';
import Payment from '../models/payment.js';
import User from '../models/User.js';
import Agent from '../models/agent.js';
import PolicyProduct from '../models/policyProduct.js';
import Joi from 'joi';


// Validation schemas
const createPolicySchema = Joi.object({
    code: Joi.string().trim().min(2).max(20).required(),
    title: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(0).max(500).required(),
    premium: Joi.number().positive().required(),
    termMonths: Joi.number().integer().min(1).max(600).required(), // max 50 years
    minSumInsured: Joi.number().min(0).default(0)
});

const updatePolicySchema = Joi.object({
    code: Joi.string().trim().min(2).max(20).optional(),
    title: Joi.string().trim().min(3).max(100).optional(),
    description: Joi.string().trim().min(0).max(500).optional(), // Allow empty description for updates
    premium: Joi.number().positive().optional(),
    termMonths: Joi.number().integer().min(1).max(600).optional(),
    minSumInsured: Joi.number().min(0).optional(),
    maxSumInsured: Joi.number().min(0).optional()
}).min(1); // Require at least one field to be updated

const adminController = {
    // Approve claim (admin)
    async approveClaim(req, res) {
        const { claimId, status } = req.body;
        const Claim = (await import('../models/claim.js')).default;
        const claim = await Claim.findById(claimId);
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
        claim.status = status || 'Approved';
        await claim.save();
        // Update user policy status to match claim status if approved/claimed
        if (claim.userPolicyId) {
            const userPolicy = await UserPolicy.findById(claim.userPolicyId);
            if (userPolicy && (status === 'Approved' || status === 'Claimed')) {
                userPolicy.status = 'Claimed';
                await userPolicy.save();
            }
        }
        res.json({ success: true, claim });
    },
        // Get last N audit logs (admin only)
        async getAuditLogs(req, res) {
            try {
                const AuditLog = (await import('../models/auditLog.js')).default;
                const limit = parseInt(req.query.limit) || 20;
                const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
                res.json({ success: true, logs });
            } catch (err) {
                res.status(500).json({ success: false, error: err.message });
            }
        },
        // Get minimal KPIs summary (admin only)
        async getSummaryKPIs(req, res) {
            try {
                const Claim = (await import('../models/claim.js')).default;
                const usersCount = await User.countDocuments();
                const policiesSold = await UserPolicy.countDocuments({ status: 'Approved' });
                const claimsPending = await Claim.countDocuments({ status: 'Pending' });
                const claimsApproved = await Claim.countDocuments({ status: 'Approved' });
                const agentsCount = await Agent.countDocuments();
                const paymentsPending = await Payment.countDocuments({ status: 'Pending' });
                const paymentsDone = await Payment.countDocuments({ status: 'Done' });
                const totalPayments = await Payment.aggregate([
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);
                res.json({
                    success: true,
                    usersCount,
                    policiesSold,
                    claimsPending,
                    claimsApproved,
                    agentsCount,
                    paymentsPending,
                    paymentsDone,
                    totalPayments: totalPayments[0]?.total || 0
                });
            } catch (err) {
                res.status(500).json({ success: false, error: err.message });
            }
        },
        // List all agents (admin only)
        async allAgents(req, res) {
            try {
                const agents = await Agent.find();
                res.json({ success: true, agents });
            } catch (err) {
                res.status(500).json({ success: false, error: err.message });
            }
        },
    // Get details for a specific claim by claimId (admin)
    async getClaimById(req, res) {
        try {
            const Claim = (await import('../models/claim.js')).default;
            const claim = await Claim.findById(req.params.id).populate('userId userPolicyId decidedByAgentId');
            if (!claim) {
                return res.status(404).json({ success: false, message: 'Claim not found' });
            }
            res.json({ success: true, claim });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    // Approve a policy (admin)
    async approvePolicy(req, res) {
                const { userPolicyId } = req.body;
                const userPolicy = await UserPolicy.findById(userPolicyId);
                if (!userPolicy) return res.status(404).json({ success: false, message: 'User policy not found' });
                        userPolicy.status = 'Approved';
                userPolicy.verificationType = 'Admin';
                await userPolicy.save();
                res.json({
                    success: true,
                    userPolicyId: userPolicy._id,
                    status: userPolicy.status,
                    verificationType: userPolicy.verificationType
                });
    },
    // View all user policies
    async allUserPolicies(req, res) {
        const policies = await UserPolicy.find().populate('userId policyProductId');
        res.json({ success: true, policies });
    },

    // View all payments
    async allPayments(req, res) {
        const payments = await Payment.find().populate('userId userPolicyId');
        res.json({ success: true, payments });
    },

    // Assign policy to agent
    async assignPolicyToAgent(req, res) {
        const { policyProductId, agentId } = req.body;
        const policyProduct = await PolicyProduct.findById(policyProductId);
        if (!policyProduct) return res.status(404).json({ success: false, message: 'Policy product not found' });
        const agent = await Agent.findById(agentId);
        if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
        policyProduct.assignedAgentId = agentId;
        policyProduct.assignedAgentName = agent.name;
        await policyProduct.save();
        res.json({
            success: true,
            message: 'Policy product assigned by admin to agent',
            policyProductId: policyProduct._id,
            assignedAgentId: policyProduct.assignedAgentId,
            assignedAgentName: policyProduct.assignedAgentName
        });
    },

    // Create agent account
    async createAgent(req, res) {
        const { name, email, password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password is required and must be at least 6 characters.' });
        }
        // Check for duplicate email
        const existingAgent = await Agent.findOne({ email });
        if (existingAgent) {
            return res.status(409).json({ success: false, message: 'Agent with this email already exists.' });
        }
        const agent = new Agent({ name, email, password });
        await agent.save();
        // Only return agent info, no token
        res.json({ success: true, agent: { _id: agent._id, name: agent.name, email: agent.email, role: agent.role } });
    },



    // View all customer policies and payments
    async allCustomerData(req, res) {
        const customers = await User.find({ role: 'Customer' });
        const data = await Promise.all(customers.map(async (customer) => {
            const policies = await UserPolicy.find({ userId: customer._id });
            const payments = await Payment.find({ userId: customer._id });
            return { customer, policies, payments };
        }));
        res.json({ success: true, data });
    },

    // Add policy (Admin only)
     async addPolicy(req, res) {
        try {
            // Validate request body
            const { error, value } = createPolicySchema.validate(req.body);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }

            const { code, title, description, premium, termMonths, minSumInsured } = value;

            // Check if policy with same code already exists
            const existingPolicy = await PolicyProduct.findOne({ code });
            
            if (existingPolicy) {
                return res.status(409).json({
                    success: false,
                    message: 'Policy with this code already exists'
                });
            }

            // Create new policy
            const newPolicy = new PolicyProduct({
                code,
                title,
                description,
                premium,
                termMonths,
                minSumInsured: minSumInsured || 0
            });

            const savedPolicy = await newPolicy.save();

            res.status(201).json({
                success: true,
                message: 'Policy added successfully',
                data: savedPolicy
            });

        } catch (error) {
            console.error('Add policy error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },

    // Get all policies for admin (Admin only)
    async getPolicies(req, res) {
        try {
            // Admin access - Get all policies in natural order (no sorting)
            const policies = await PolicyProduct.find();

            res.status(200).json({
                success: true,
                message: 'Admin: All policies retrieved successfully',
                data: policies,
                count: policies.length,
                adminAccess: true
            });

        } catch (error) {
            console.error('Admin get policies error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },

    // Update policy (Admin only)
    async updatePolicy(req, res) {
        try {
            const { id } = req.params;
            
            console.log('Update Policy Request - ID:', id);
            console.log('Update Policy Request - Body:', req.body);
            console.log('Fields to update:', Object.keys(req.body));

            // Validate MongoDB ObjectId format
            if (!id || id.length !== 24) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid policy ID format. Must be 24 characters long.'
                });
            }

            // Validate request body
            const { error, value } = updatePolicySchema.validate(req.body);
            
            if (error) {
                console.log('Validation Error:', error.details);
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }

            console.log('Validated fields to update:', Object.keys(value));

            // Check if policy exists
            const existingPolicy = await PolicyProduct.findById(id);
            
            if (!existingPolicy) {
                console.log('Policy not found with ID:', id);
                return res.status(404).json({
                    success: false,
                    message: 'Policy not found'
                });
            }

            console.log('Existing Policy Found:', existingPolicy);

            // If code is being updated, check for duplicates
            if (value.code && value.code !== existingPolicy.code) {
                const codeExists = await PolicyProduct.findOne({ 
                    code: value.code, 
                    _id: { $ne: id } // Exclude current policy from check
                });
                
                if (codeExists) {
                    return res.status(409).json({
                        success: false,
                        message: 'Policy code already exists'
                    });
                }
            }

            // Prepare update object with only provided fields
            const updateData = { ...value, updatedAt: new Date() };
            console.log('Updating policy with data:', updateData);

            // Update policy - only the fields that were provided
            const updatedPolicy = await PolicyProduct.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );

            console.log('Policy Updated Successfully:', updatedPolicy);
            console.log('Updated fields:', Object.keys(value));

            res.status(200).json({
                success: true,
                message: 'Admin: Policy updated successfully',
                data: updatedPolicy
            });

        } catch (error) {
            console.error('Update policy error:', error);
            
            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid policy ID format'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },

    // Delete policy (Admin only)
    async deletePolicy(req, res) {
        try {
            const { id } = req.params;

            // Check if policy exists and delete
            const deletedPolicy = await PolicyProduct.findByIdAndDelete(id);
            
            if (!deletedPolicy) {
                return res.status(404).json({
                    success: false,
                    message: 'Policy not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Policy deleted successfully',
                data: {
                    deletedPolicyId: id,
                    deletedPolicyCode: deletedPolicy.code,
                    deletedPolicyTitle: deletedPolicy.title
                }
            });

        } catch (error) {
            console.error('Delete policy error:', error);
            
            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid policy ID format'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },
};

export default adminController;