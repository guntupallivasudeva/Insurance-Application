
// Admin Controller
import UserPolicy from '../models/userPolicy.js';
import Payment from '../models/payment.js';
import User from '../models/User.js';
import Agent from '../models/agent.js';
import PolicyProduct from '../models/policyProduct.js';
import Joi from 'joi';
import Counter from '../models/counter.js';

const createPolicySchema = Joi.object({
    code: Joi.string().trim().min(2).max(20).required(),
    title: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(0).max(500).required(),
    premium: Joi.number().positive().required(),
    termMonths: Joi.number().integer().min(1).max(600).required(),
    minSumInsured: Joi.number().min(0).default(0),
    maxSumInsured: Joi.number().min(0).allow(null)
}).custom((value, helpers) => {
    if (value.maxSumInsured != null && value.minSumInsured != null) {
        if (value.maxSumInsured < value.minSumInsured) {
            return helpers.error('any.invalid', { message: 'maxSumInsured must be greater than or equal to minSumInsured' });
        }
    }
    return value;
});

const updatePolicySchema = Joi.object({
    code: Joi.string().trim().min(2).max(20).optional(),
    title: Joi.string().trim().min(3).max(100).optional(),
    description: Joi.string().trim().min(0).max(500).optional(),
    premium: Joi.number().positive().optional(),
    termMonths: Joi.number().integer().min(1).max(600).optional(),
    minSumInsured: Joi.number().min(0).optional(),
    maxSumInsured: Joi.number().min(0).optional()
}).min(1);

// Agent validation schemas
const createAgentSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).optional().default('agent123'),
    agentCode: Joi.string().trim().pattern(/^AGT\d{2,}$/i).optional()
});

const updateAgentSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    email: Joi.string().trim().email().optional(),
    password: Joi.string().min(6).optional(),
    agentCode: Joi.string().trim().pattern(/^AGT\d{2,}$/i).optional()
}).min(1);

// Claim update validation (admin can edit details but not owner, policy, or status here)
const updateClaimSchema = Joi.object({
    incidentDate: Joi.date().optional(),
    description: Joi.string().trim().min(1).max(1000).optional(),
    amountClaimed: Joi.number().positive().optional(),
    decisionNotes: Joi.string().trim().allow('', null).optional()
}).min(1);

const adminController = {
    async dbStatus(req, res) {
        try {
            const mongoose = (await import('mongoose')).default;
            const conn = mongoose.connection;
            const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
            const state = stateMap[conn.readyState] || 'unknown';

            // If not connected, return minimal info to avoid blocking calls
            if (conn.readyState !== 1) {
                return res.status(200).json({
                    success: true,
                    connection: {
                        code: conn.readyState,
                        state,
                        host: conn?.host || null,
                        dbName: conn?.name || null
                    },
                    counts: null,
                    serverTime: new Date().toISOString()
                });
            }

            // Lazy import models not already imported at file top
            const Claim = (await import('../models/claim.js')).default;
            const AuditLog = (await import('../models/auditLog.js')).default;
            const Admin = (await import('../models/admin.js')).default;

            const [users, agents, admins, policies, userPolicies, claims, payments, auditLogs] = await Promise.all([
                User.countDocuments({}).catch(() => 0),
                Agent.countDocuments({}).catch(() => 0),
                Admin.countDocuments({}).catch(() => 0),
                PolicyProduct.countDocuments({}).catch(() => 0),
                UserPolicy.countDocuments({}).catch(() => 0),
                Claim.countDocuments({}).catch(() => 0),
                Payment.countDocuments({}).catch(() => 0),
                AuditLog.countDocuments({}).catch(() => 0)
            ]);

            return res.status(200).json({
                success: true,
                connection: {
                    code: conn.readyState,
                    state,
                    host: conn?.host || null,
                    dbName: conn?.name || null
                },
                counts: { users, agents, admins, policies, userPolicies, claims, payments, auditLogs },
                serverTime: new Date().toISOString()
            });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    },
    async allClaims(req, res) {
        try {
            const Claim = (await import('../models/claim.js')).default;
            const claims = await Claim.find()
                .populate('userId')
                .populate({
                    path: 'userPolicyId',
                    populate: {
                        path: 'policyProductId',
                        model: 'PolicyProduct'
                    }
                })
                .populate('decidedByAgentId');
            
            // Update verificationType for existing claims if not set
            for (let claim of claims) {
                if (!claim.verificationType || claim.verificationType === 'None') {
                    if (claim.status !== 'Pending') {
                        // If claim is approved/rejected and has decidedByAgentId, it was decided by Agent
                        if (claim.decidedByAgentId) {
                            claim.verificationType = 'Agent';
                        } else {
                            // If no decidedByAgentId, it was likely decided by Admin
                            claim.verificationType = 'Admin';
                        }
                        await claim.save();
                    }
                }
            }
            
            res.json({ success: true, claims });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async getPolicyById(req, res) {
        try {
            const policy = await PolicyProduct.findById(req.params.id);
            if (!policy) {
                return res.status(404).json({ success: false, message: 'Policy not found' });
            }
            res.json({ success: true, policy });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async approveClaim(req, res) {
        try {
            const { claimId, status } = req.body;
            const Claim = (await import('../models/claim.js')).default;
            const claim = await Claim.findById(claimId);
            if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
            claim.status = status || 'Approved';
            claim.verificationType = 'Admin';
            await claim.save();
            if (claim.userPolicyId) {
                const userPolicy = await UserPolicy.findById(claim.userPolicyId);
                if (userPolicy && (status === 'Approved' || status === 'Claimed')) {
                    userPolicy.status = 'Claimed';
                    await userPolicy.save();
                }
            }
            res.json({ success: true, claim });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async updateClaim(req, res) {
        try {
            const { id } = req.params;
            const { error, value } = updateClaimSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
            }
            const Claim = (await import('../models/claim.js')).default;
            const claim = await Claim.findById(id);
            if (!claim) {
                return res.status(404).json({ success: false, message: 'Claim not found' });
            }
            // Apply allowed updates
            ['incidentDate', 'description', 'amountClaimed', 'decisionNotes'].forEach((k) => {
                if (value[k] !== undefined) claim[k] = value[k];
            });
            await claim.save();
            const populated = await Claim.findById(id).populate('userId userPolicyId decidedByAgentId');
            res.json({ success: true, claim: populated });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
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
    async allAgents(req, res) {
        try {
            const agents = await Agent.find();
            res.json({ success: true, agents });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
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
    async approvePolicy(req, res) {
        try {
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
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async rejectPolicy(req, res) {
        try {
            const { userPolicyId } = req.body;
            const userPolicy = await UserPolicy.findById(userPolicyId);
            if (!userPolicy) return res.status(404).json({ success: false, message: 'User policy not found' });
            userPolicy.status = 'Rejected';
            userPolicy.verificationType = 'Admin';
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
    async allUserPolicies(req, res) {
        try {
            const policies = await UserPolicy.find().populate('userId policyProductId');
            res.json({ success: true, policies });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async allPayments(req, res) {
        try {
            const payments = await Payment.find().populate('userId userPolicyId');
            res.json({ success: true, payments });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async assignPolicyToAgent(req, res) {
        try {
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
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async unassignPolicyAgent(req, res) {
        try {
            const { policyProductId } = req.body;
            if (!policyProductId) {
                return res.status(400).json({ success: false, message: 'policyProductId is required' });
            }
            const policyProduct = await PolicyProduct.findById(policyProductId);
            if (!policyProduct) return res.status(404).json({ success: false, message: 'Policy product not found' });
            policyProduct.assignedAgentId = null;
            policyProduct.assignedAgentName = null;
            await policyProduct.save();
            res.json({
                success: true,
                message: 'Agent unassigned from policy product',
                policyProductId: policyProduct._id
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async createAgent(req, res) {
        try {
            const { error, value } = createAgentSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
            }
            const { name, email, password, agentCode } = value;
            const existingAgent = await Agent.findOne({ email });
            if (existingAgent) {
                return res.status(409).json({ success: false, message: 'Agent with this email already exists.' });
            }
            // If code provided, ensure uniqueness and use it; else auto-generate from counter
            if (agentCode) {
                const codeExists = await Agent.findOne({ agentCode });
                if (codeExists) {
                    return res.status(409).json({ success: false, message: 'Agent code already exists.' });
                }
            }

            let finalCode = agentCode || null;
            if (!finalCode) {
                const counter = await Counter.findByIdAndUpdate(
                    'agentCode',
                    { $inc: { seq: 1 } },
                    { upsert: true, new: true }
                );
                const seq = counter.seq || 1;
                finalCode = `AGT${String(seq).padStart(2, '0')}`;
            }

            const agent = new Agent({ name, email, password, agentCode: finalCode });
            await agent.save();
            res.json({ success: true, agent: { _id: agent._id, name: agent.name, email: agent.email, role: agent.role, agentCode: agent.agentCode } });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async updateAgent(req, res) {
        try {
            const { id } = req.params;
            if (!id || id.length !== 24) {
                return res.status(400).json({ success: false, message: 'Invalid agent ID format. Must be 24 characters long.' });
            }
            const { error, value } = updateAgentSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
            }
            const agent = await Agent.findById(id);
            if (!agent) {
                return res.status(404).json({ success: false, message: 'Agent not found' });
            }
            if (value.email && value.email !== agent.email) {
                const emailExists = await Agent.findOne({ email: value.email, _id: { $ne: id } });
                if (emailExists) {
                    return res.status(409).json({ success: false, message: 'Another agent with this email already exists.' });
                }
            }
            // Assign fields; if password present, setting it then saving triggers pre-save hash
            ['name', 'email', 'password'].forEach((k) => {
                if (value[k] !== undefined) agent[k] = value[k];
            });
            // Handle editable agentCode
            if (value.agentCode && value.agentCode !== agent.agentCode) {
                const duplicate = await Agent.findOne({ agentCode: value.agentCode, _id: { $ne: id } });
                if (duplicate) {
                    return res.status(409).json({ success: false, message: 'Agent code already exists.' });
                }
                agent.agentCode = value.agentCode;
            }
            await agent.save();
            res.json({ success: true, agent: { _id: agent._id, name: agent.name, email: agent.email, role: agent.role, agentCode: agent.agentCode } });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async deleteAgent(req, res) {
        try {
            const { id } = req.params;
            const deleted = await Agent.findByIdAndDelete(id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Agent not found' });
            }
            res.json({ success: true, message: 'Agent deleted successfully', data: { deletedAgentId: id, deletedAgentEmail: deleted.email } });
        } catch (err) {
            if (err.name === 'CastError') {
                return res.status(400).json({ success: false, message: 'Invalid agent ID format' });
            }
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async allCustomerData(req, res) {
        try {
            const customers = await User.find({ role: 'Customer' });
            const data = await Promise.all(customers.map(async (customer) => {
                const policies = await UserPolicy.find({ userId: customer._id })
                  .populate({ path: 'policyProductId' })
                  .populate({ path: 'assignedAgentId' });
                const payments = await Payment.find({ userId: customer._id });
                return { customer, policies, payments };
            }));
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async addPolicy(req, res) {
        try {
            const { error, value } = createPolicySchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }
            const { code, title, description, premium, termMonths, minSumInsured, maxSumInsured } = value;
            const existingPolicy = await PolicyProduct.findOne({ code });
            if (existingPolicy) {
                return res.status(409).json({
                    success: false,
                    message: 'Policy with this code already exists'
                });
            }
            const newPolicy = new PolicyProduct({
                code,
                title,
                description,
                premium,
                termMonths,
                minSumInsured: minSumInsured || 0,
                maxSumInsured: maxSumInsured ?? null
            });
            const savedPolicy = await newPolicy.save();
            res.status(201).json({
                success: true,
                message: 'Policy added successfully',
                data: savedPolicy
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async getPolicies(req, res) {
        try {
            const policies = await PolicyProduct.find();
            res.status(200).json({
                success: true,
                message: 'Admin: All policies retrieved successfully',
                data: policies,
                count: policies.length,
                adminAccess: true
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async updatePolicy(req, res) {
        try {
            const { id } = req.params;
            if (!id || id.length !== 24) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid policy ID format. Must be 24 characters long.'
                });
            }
            const { error, value } = updatePolicySchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map(detail => detail.message)
                });
            }
            const existingPolicy = await PolicyProduct.findById(id);
            if (!existingPolicy) {
                return res.status(404).json({
                    success: false,
                    message: 'Policy not found'
                });
            }
            if (value.code && value.code !== existingPolicy.code) {
                const codeExists = await PolicyProduct.findOne({ code: value.code, _id: { $ne: id } });
                if (codeExists) {
                    return res.status(409).json({
                        success: false,
                        message: 'Policy code already exists'
                    });
                }
            }
            const updateData = { ...value, updatedAt: new Date() };
            const updatedPolicy = await PolicyProduct.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );
            res.status(200).json({
                success: true,
                message: 'Admin: Policy updated successfully',
                data: updatedPolicy
            });
        } catch (err) {
            if (err.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid policy ID format'
                });
            }
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async deletePolicy(req, res) {
        try {
            const { id } = req.params;
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
        } catch (err) {
            if (err.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid policy ID format'
                });
            }
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

export default adminController;