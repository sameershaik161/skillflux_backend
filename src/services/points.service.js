import User from "../models/User.js";

/**
 * Add points to a user (atomic)
 * @param {String} userId
 * @param {Number} points
 */
export async function addPoints(userId, points) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  user.totalPoints = (user.totalPoints || 0) + Number(points || 0);
  await user.save();
  return user.totalPoints;
}

/**
 * Adjust points by delta (can be negative)
 */
export async function adjustPoints(userId, delta) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  user.totalPoints = (user.totalPoints || 0) + Number(delta || 0);
  if (user.totalPoints < 0) user.totalPoints = 0;
  await user.save();
  return user.totalPoints;
}
