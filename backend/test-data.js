import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Agent from './src/models/agent.js';
import User from './src/models/User.js'; // Customer model
import PolicyProduct from './src/models/policyProduct.js';
import UserPolicy from './src/models/userPolicy.js';
import Claim from './src/models/claim.js';
import Payment from './src/models/payment.js';

dotenv.config();

const createTestData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    // Create test agent
    const testAgent = await Agent.findOneAndUpdate(
      { email: 'agent@test.com' },
      {
        name: 'John Agent',
        email: 'agent@test.com',
        password: 'password123',
        agentCode: 'AGT001'
      },
      { upsert: true, new: true }
    );
    console.log('Test agent created/updated:', testAgent.email);

    // Create test customers
    const testCustomer = await User.findOneAndUpdate(
      { email: 'customer@test.com' },
      {
        name: 'Jane Customer',
        email: 'customer@test.com',
        password: 'password123',
        role: 'Customer'
      },
      { upsert: true, new: true }
    );
    
    const testCustomer2 = await User.findOneAndUpdate(
      { email: 'customer2@test.com' },
      {
        name: 'Bob Customer',
        email: 'customer2@test.com',
        password: 'password123',
        role: 'Customer'
      },
      { upsert: true, new: true }
    );
    console.log('Test customers created/updated');

    // Create test policy products
    const policyProducts = [];
    
    const healthPolicy = await PolicyProduct.findOneAndUpdate(
      { code: 'HEALTH001' },
      {
        code: 'HEALTH001',
        title: 'Premium Health Insurance',
        description: 'Comprehensive health coverage with worldwide protection',
        premium: 500,
        termMonths: 12,
        minSumInsured: 100000,
        maxSumInsured: 1000000,
        assignedAgentId: testAgent._id,
        assignedAgentName: testAgent.name
      },
      { upsert: true, new: true }
    );
    policyProducts.push(healthPolicy);

    const carPolicy = await PolicyProduct.findOneAndUpdate(
      { code: 'AUTO001' },
      {
        code: 'AUTO001',
        title: 'Auto Insurance Pro',
        description: 'Complete car protection with accident coverage',
        premium: 300,
        termMonths: 12,
        minSumInsured: 50000,
        maxSumInsured: 500000,
        assignedAgentId: testAgent._id,
        assignedAgentName: testAgent.name
      },
      { upsert: true, new: true }
    );
    policyProducts.push(carPolicy);

    console.log('Policy products created/updated');

    // Create test user policies - multiple customers for same policies
    const userPolicies = [];
    
    const userPolicy1 = await UserPolicy.findOneAndUpdate(
      { userId: testCustomer._id, policyProductId: healthPolicy._id },
      {
        userId: testCustomer._id,
        policyProductId: healthPolicy._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        premiumPaid: 500,
        status: 'Pending',
        assignedAgentId: testAgent._id,
        verificationType: 'None'
      },
      { upsert: true, new: true }
    );
    userPolicies.push(userPolicy1);

    const userPolicy2 = await UserPolicy.findOneAndUpdate(
      { userId: testCustomer._id, policyProductId: carPolicy._id },
      {
        userId: testCustomer._id,
        policyProductId: carPolicy._id,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
        premiumPaid: 300,
        status: 'Approved',
        assignedAgentId: testAgent._id,
        verificationType: 'Agent'
      },
      { upsert: true, new: true }
    );
    userPolicies.push(userPolicy2);

    // Add second customer for health policy
    const userPolicy3 = await UserPolicy.findOneAndUpdate(
      { userId: testCustomer2._id, policyProductId: healthPolicy._id },
      {
        userId: testCustomer2._id,
        policyProductId: healthPolicy._id,
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 355 * 24 * 60 * 60 * 1000),
        premiumPaid: 500,
        status: 'Approved',
        assignedAgentId: testAgent._id,
        verificationType: 'Agent'
      },
      { upsert: true, new: true }
    );
    userPolicies.push(userPolicy3);

    console.log('User policies created/updated');

    // Create test payments - multiple payments per policy
    await Payment.findOneAndUpdate(
      { userId: testCustomer._id, userPolicyId: userPolicy1._id, reference: 'PAY001' },
      {
        userId: testCustomer._id,
        userPolicyId: userPolicy1._id,
        amount: 500,
        method: 'Card',
        reference: 'PAY001'
      },
      { upsert: true, new: true }
    );

    await Payment.findOneAndUpdate(
      { userId: testCustomer._id, userPolicyId: userPolicy2._id, reference: 'PAY002' },
      {
        userId: testCustomer._id,
        userPolicyId: userPolicy2._id,
        amount: 300,
        method: 'UPI',
        reference: 'PAY002'
      },
      { upsert: true, new: true }
    );

    await Payment.findOneAndUpdate(
      { userId: testCustomer2._id, userPolicyId: userPolicy3._id, reference: 'PAY003' },
      {
        userId: testCustomer2._id,
        userPolicyId: userPolicy3._id,
        amount: 500,
        method: 'Netbanking',
        reference: 'PAY003'
      },
      { upsert: true, new: true }
    );

    // Add additional payments for testing payment history
    await Payment.findOneAndUpdate(
      { userId: testCustomer._id, userPolicyId: userPolicy1._id, reference: 'PAY004' },
      {
        userId: testCustomer._id,
        userPolicyId: userPolicy1._id,
        amount: 100,
        method: 'UPI',
        reference: 'PAY004'
      },
      { upsert: true, new: true }
    );

    await Payment.findOneAndUpdate(
      { userId: testCustomer2._id, userPolicyId: userPolicy3._id, reference: 'PAY005' },
      {
        userId: testCustomer2._id,
        userPolicyId: userPolicy3._id,
        amount: 150,
        method: 'Card',
        reference: 'PAY005'
      },
      { upsert: true, new: true }
    );

    console.log('Payments created/updated');

    // Create test claims
    await Claim.findOneAndUpdate(
      { userId: testCustomer._id, userPolicyId: userPolicy2._id },
      {
        userId: testCustomer._id,
        userPolicyId: userPolicy2._id,
        incidentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        description: 'Car accident - rear collision',
        amountClaimed: 15000,
        status: 'Pending'
      },
      { upsert: true, new: true }
    );

    console.log('Claims created/updated');

    console.log('\n=== Test Data Summary ===');
    console.log('Agent: agent@test.com / password123');
    console.log('Customer 1: customer@test.com / password123');
    console.log('Customer 2: customer2@test.com / password123');
    console.log('Health Policy: 2 customers (1 pending, 1 approved)');
    console.log('Auto Policy: 1 customer (approved)');
    console.log('Payment History: Multiple payments per customer for testing');
    console.log('- Customer 1: 2 payments (Health: $600 total, Auto: $300)');
    console.log('- Customer 2: 2 payments (Health: $650 total)');
    console.log('Created policies, payments, and claims for testing');
    console.log('========================\n');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestData();
}

export default createTestData;