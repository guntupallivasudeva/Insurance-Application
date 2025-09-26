import express from 'express';
import customerController from '../controllers/customerController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
const customerAuth = [authenticateToken, authorizeRoles('Customer')];

router.get('/policies', customerAuth, customerController.viewPolicies);
router.post('/purchase', customerAuth, customerController.purchasePolicy);
router.post('/pay', customerAuth, customerController.makePayment);
router.get('/payments', customerAuth, customerController.paymentHistory);
router.get('/mypolicies', customerAuth, customerController.myPolicies);
router.post('/raiseclaim', customerAuth, customerController.raiseClaim);
router.post('/cancelpolicy', customerAuth, customerController.cancelPolicy);
// Get a policy by its ID
router.get('/policy/:id', customerAuth, customerController.getPolicyById);
// Get details for a specific claim by claimId
router.get('/claim/:id', customerAuth, customerController.getClaimById);



export default router;
