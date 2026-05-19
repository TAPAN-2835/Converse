import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  inviteMember,
  acceptInvite,
  rejectInvite,
  requestJoin,
  approveRequest,
  addGroupMemberDirect,
  removeGroupMember,
  updateGroup,
  leaveGroup,
  deleteGroup,
  promoteToAdmin,
  demoteFromAdmin,
  pinGroupMessage,
  unpinGroupMessage,
} from "../controllers/group.controller.js";

const router = express.Router();

// Parameter normalizer to support both :id and :groupId perfectly
router.param("id", (req, res, next, id) => {
  req.params.groupId = id;
  next();
});
router.param("groupId", (req, res, next, groupId) => {
  req.params.id = groupId;
  next();
});

// Group Management
router.post("/create", protectRoute, createGroup);
router.post("/", protectRoute, createGroup);

router.get("/my", protectRoute, getUserGroups);
router.get("/:groupId", protectRoute, getGroupById);
router.get("/:id", protectRoute, getGroupById);
router.get("/", protectRoute, getUserGroups);

// Settings update
router.patch("/:groupId/update", protectRoute, updateGroup);
router.patch("/:id/update", protectRoute, updateGroup);
router.patch("/:groupId", protectRoute, updateGroup); // fallback

// Deletion
delete router.delete; // keep it clean
router.delete("/:groupId/delete", protectRoute, deleteGroup);
router.delete("/:id/delete", protectRoute, deleteGroup);
router.delete("/:groupId", protectRoute, deleteGroup); // fallback

// Direct Membership manipulation (Admins only)
router.post("/:groupId/add-member", protectRoute, addGroupMemberDirect);
router.post("/:id/add-member", protectRoute, addGroupMemberDirect);
router.post("/:groupId/remove-member", protectRoute, removeGroupMember);
router.post("/:id/remove-member", protectRoute, removeGroupMember);

// Leave
router.post("/:groupId/leave", protectRoute, leaveGroup);
router.post("/:id/leave", protectRoute, leaveGroup);

// Invitations & Requests
router.post("/:groupId/invite", protectRoute, inviteMember);
router.post("/:groupId/accept-invite", protectRoute, acceptInvite);
router.post("/:groupId/reject-invite", protectRoute, rejectInvite);
router.post("/:groupId/request-join", protectRoute, requestJoin);
router.post("/:groupId/approve-request", protectRoute, approveRequest);

// Role Promotions & Demotions
router.post("/:groupId/promote", protectRoute, promoteToAdmin);
router.post("/:groupId/demote", protectRoute, demoteFromAdmin);

// Message Pinning Contexts
router.post("/:groupId/pins", protectRoute, pinGroupMessage);
router.delete("/:groupId/pins/:messageId", protectRoute, unpinGroupMessage);

// Backward Compatibility Handlers for Legacy client routes
router.post("/:groupId/members", protectRoute, inviteMember);
router.delete("/:groupId/members/:userId", protectRoute, removeGroupMember);

// Support both :groupId and :id parameters seamlessly by mapping params:
router.use((req, res, next) => {
  if (req.params.id && !req.params.groupId) {
    req.params.groupId = req.params.id;
  }
  next();
});

export default router;
