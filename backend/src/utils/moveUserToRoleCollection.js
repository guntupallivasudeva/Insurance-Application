import Customer from '../models/User.js';
import Admin from '../models/admin.js';
import Agent from '../models/agent.js';

/**
 * Move a user to a new collection when their role changes.
 * @param {String} email - User's email
 * @param {String} newRole - New role ('Customer', 'Admin', 'Agent')
 * @returns {Promise<Object>} - The new user document
 */
export async function moveUserToRoleCollection(email, newRole) {
  let sourceModel, targetModel;
  // Find which model currently contains the user
  const models = [Customer, Admin, Agent];
  let userDoc;
  for (const model of models) {
    userDoc = await model.findOne({ email });
    if (userDoc) {
      sourceModel = model;
      break;
    }
  }
  if (!userDoc) throw new Error('User not found in any collection');

  // Determine target model
  if (newRole === 'Admin') targetModel = Admin;
  else if (newRole === 'Agent') targetModel = Agent;
  else targetModel = Customer;

  // Remove from source collection
  await sourceModel.deleteOne({ email });

  // Create in target collection
  const newUser = new targetModel({
    name: userDoc.name,
    email: userDoc.email,
    password: userDoc.password, // already hashed
    role: newRole
  });
  await newUser.save();
  return newUser;
}
