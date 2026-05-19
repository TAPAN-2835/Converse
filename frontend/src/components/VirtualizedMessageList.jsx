import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useChannelStateContext } from "stream-chat-react";
import {
  getMessagesHistoryFromBackend,
  markMessagesAsRead,
  syncMessageToBackend,
  editMessageInBackend,
  deleteMessageInBackend
} from "../lib/api";
import { Loader2, CornerDownLeft, Maximize2, Quote, Trash2, Edit2, Reply } from "lucide-react";
import toast from "react-hot-toast";

// Memoized individual message row for pristine render performance
const MessageRow = React.memo(({ msg, authUser, onImageClick, lastReadByPeer, onReply, onJumpToMessage, onLocalDelete }) => {
  const isMe = msg.senderId._id === authUser._id || msg.senderId === authUser._id;
  const senderName = msg.senderId?.fullName || "Chat Peer";
  const avatar = msg.senderId?.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId?._id || "user"}`;
  const dateStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.message);

  // Soft Deletion check
  const isDeleted = msg.isDeleted || msg.type === "deleted";

  // Calculate if the peer has seen this message using timestamps
  const isReadByPeer = useMemo(() => {
    if (!isMe || !lastReadByPeer) return false;
    return new Date(msg.createdAt) <= new Date(lastReadByPeer);
  }, [isMe, msg.createdAt, lastReadByPeer]);

  // Group reactions by emoji type
  const groupedReactions = useMemo(() => {
    if (!msg.reactions) return {};
    return msg.reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
  }, [msg.reactions]);

  // Reply parent resolution
  const parentMsg = useMemo(() => {
    if (msg.parentMessageId) {
      return {
        id: msg.parentMessageId.streamMessageId || msg.parentMessageId._id,
        senderName: msg.parentMessageId.senderId?.fullName || "User",
        message: msg.parentMessageId.message,
      };
    }
    return null;
  }, [msg.parentMessageId]);

  const handleEditSave = async () => {
    if (!editText.trim()) return;
    try {
      await editMessageInBackend(msg.streamMessageId || msg._id, editText);
      setIsEditing(false);
      toast.success("Message edited successfully");
    } catch (err) {
      console.error("Failed to edit:", err);
      toast.error("Failed to edit message");
    }
  };

  const handleDeleteClick = () => {
    // Elegant dropdown or confirmation trigger
    const confirmDelete = window.confirm(
      isMe
        ? "Do you want to delete this message? Cancel = Delete for Me only, OK = Delete for Everyone."
        : "Delete this message for yourself? (OK = Delete for Me)"
    );

    if (isMe && confirmDelete) {
      // Delete for everyone
      deleteMessageInBackend(msg.streamMessageId || msg._id, "everyone")
        .then(() => toast.success("Message deleted for everyone"))
        .catch(() => toast.error("Failed to delete message"));
    } else {
      // Delete for me
      deleteMessageInBackend(msg.streamMessageId || msg._id, "me")
        .then(() => {
          onLocalDelete(msg.streamMessageId || msg._id);
          toast.success("Message deleted for you");
        })
        .catch(() => toast.error("Failed to delete message"));
    }
  };

  return (
    <div
      id={`msg-row-${msg.streamMessageId || msg._id}`}
      className={`flex items-start gap-3 my-4 px-4 group/row ${isMe ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Sender Avatar */}
      <div className="avatar">
        <div className="w-10 h-10 rounded-full border border-base-300 shadow-sm overflow-hidden">
          <img src={avatar} alt={senderName} loading="lazy" className="object-cover w-full h-full" />
        </div>
      </div>

      {/* Bubble Container */}
      <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
        {/* Sender Name + Time stamp */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-semibold opacity-75">{senderName}</span>
          <span className="text-[10px] opacity-50">{dateStr}</span>
          {msg.isEdited && <span className="text-[9px] opacity-40 font-bold bg-base-300 px-1 rounded-sm">EDITED</span>}
        </div>

        {/* Reply Quote Block */}
        {parentMsg && (
          <div
            onClick={() => onJumpToMessage(parentMsg.id)}
            className="flex items-center gap-1.5 bg-base-300/40 border-l-2 border-primary px-2.5 py-1 rounded-md text-[11px] opacity-75 mb-1 cursor-pointer hover:bg-base-300/70 transition-all select-none max-w-xs truncate"
            title="Jump to original message"
          >
            <Quote className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="font-semibold text-primary/95">{parentMsg.senderName}:</span>
            <span className="truncate">{parentMsg.message}</span>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`p-3 rounded-2xl shadow-sm text-sm border relative group ${
            isMe
              ? "bg-primary text-primary-content border-primary/20 rounded-tr-none"
              : "bg-base-200 text-base-content border-base-300/50 rounded-tl-none"
          }`}
        >
          {isDeleted ? (
            <p className="text-xs italic opacity-60">This message has been deleted.</p>
          ) : isEditing ? (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <input
                type="text"
                className="input input-sm input-bordered w-full text-base-content"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
              />
              <div className="flex gap-1.5 justify-end">
                <button onClick={() => setIsEditing(false)} className="btn btn-ghost btn-xs text-xs">Cancel</button>
                <button onClick={handleEditSave} className="btn btn-primary btn-xs text-xs">Save</button>
              </div>
            </div>
          ) : (
            <>
              <p className="break-words leading-relaxed whitespace-pre-wrap pr-4">{msg.message}</p>

              {/* Media Attachments Rendering */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {msg.attachments.map((url, idx) => (
                    <div key={idx} className="relative group/img rounded-xl overflow-hidden border border-base-300/30">
                      <img
                        src={url}
                        alt="Chat Attachment"
                        className="max-h-[220px] object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                        onClick={() => onImageClick(url)}
                      />
                      <button
                        onClick={() => onImageClick(url)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Read Ticks (seen status indicator) */}
          {isMe && !isDeleted && (
            <div className="absolute bottom-1 right-2 flex items-center justify-end scale-75 select-none opacity-85">
              {isReadByPeer ? (
                <span className="text-blue-300 font-bold" title="Seen">✓✓</span>
              ) : (
                <span className="text-gray-400 font-bold" title="Delivered">✓✓</span>
              )}
            </div>
          )}
        </div>

        {/* Hover Action Bar inside Row */}
        {!isDeleted && !isEditing && (
          <div className="flex gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity mt-1.5 duration-200 items-center justify-end w-full">
            <button
              onClick={() => onReply(msg)}
              className="btn btn-xs btn-ghost gap-1 px-1.5 py-0.5 h-auto min-h-0 text-[10px] opacity-70 hover:opacity-100"
              title="Reply"
            >
              <Reply className="w-3 h-3 text-primary" /> Reply
            </button>
            {isMe && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-xs btn-ghost gap-1 px-1.5 py-0.5 h-auto min-h-0 text-[10px] opacity-70 hover:opacity-100"
                title="Edit"
              >
                <Edit2 className="w-3 h-3 text-warning" /> Edit
              </button>
            )}
            <button
              onClick={handleDeleteClick}
              className="btn btn-xs btn-ghost gap-1 px-1.5 py-0.5 h-auto min-h-0 text-[10px] opacity-70 hover:opacity-100 text-error"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-error" /> Delete
            </button>
          </div>
        )}

        {/* Custom Reactions Counts Pills */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <div
                key={emoji}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-base-300/55 backdrop-blur-md border border-base-300 text-xs font-medium cursor-default shadow-xs"
              >
                <span>{emoji}</span>
                <span className="text-[10px] opacity-75">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

MessageRow.displayName = "MessageRow";

export default function VirtualizedMessageList({ authUser, targetUserId, onReply }) {
  const { channel } = useChannelStateContext();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Presence and Ephemeral Systems States
  const [isOnline, setIsOnline] = useState(false);
  const [lastActive, setLastActive] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [peerLastRead, setPeerLastRead] = useState(null);

  const containerRef = useRef(null);
  const isFetchingRef = useRef(false);

  // 1. Initial Load of Chat History from secure local MongoDB
  const loadInitialHistory = useCallback(async () => {
    if (!targetUserId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const data = await getMessagesHistoryFromBackend(targetUserId, "", 30);
      if (data.success) {
        setMessages(data.messages);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);

        await markMessagesAsRead(targetUserId).catch((err) =>
          console.error("Mongoose background read receipt persist failed:", err)
        );

        if (channel) {
          await channel.markRead().catch((err) => console.error("Stream markRead failed:", err));
        }

        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
      toast.error("Failed to load older messages");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [targetUserId, channel]);

  useEffect(() => {
    loadInitialHistory();
  }, [loadInitialHistory]);

  // 2. Fetch older messages on reverse scroll
  const handleScroll = async (e) => {
    const element = e.target;
    if (element.scrollTop < 100 && hasMore && !loadingMore && !isFetchingRef.current) {
      isFetchingRef.current = true;
      setLoadingMore(true);

      const previousScrollHeight = element.scrollHeight;
      const previousScrollTop = element.scrollTop;

      try {
        const data = await getMessagesHistoryFromBackend(targetUserId, cursor, 30);
        if (data.success) {
          setMessages((prev) => [...data.messages, ...prev]);
          setCursor(data.nextCursor);
          setHasMore(data.hasMore);

          setTimeout(() => {
            if (element) {
              element.scrollTop = element.scrollHeight - previousScrollHeight + previousScrollTop;
            }
          }, 0);
        }
      } catch (err) {
        console.error("Error paginating chat messages:", err);
      } finally {
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    }
  };

  // Jump to specific message block in list scroll
  const handleJumpToMessage = useCallback((msgId) => {
    const targetElement = document.getElementById(`msg-row-${msgId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add visual highlight flash
      targetElement.classList.add("bg-primary/10", "rounded-xl", "transition-all", "duration-500");
      setTimeout(() => {
        targetElement.classList.remove("bg-primary/10");
      }, 2000);
    } else {
      toast.error("Original message not found in this segment");
    }
  }, []);

  // Filter message locally when deleted "for me"
  const handleLocalDelete = useCallback((msgId) => {
    setMessages((prev) => prev.filter((m) => m._id !== msgId && m.streamMessageId !== msgId));
  }, []);

  // 3. Duplex Realtime Integration: Capture incoming Stream events and reconcile state
  useEffect(() => {
    if (!channel) return;

    const isGroup = targetUserId.startsWith("group-");
    if (isGroup) {
      const activeMembers = Object.values(channel.state.members);
      const onlineCount = activeMembers.filter((m) => m.user?.online).length;
      setIsOnline(onlineCount > 0);
      setLastActive(null);
      setPeerLastRead(null);
    } else {
      const otherMember = Object.values(channel.state.members).find((m) => m.user.id === targetUserId);
      setIsOnline(otherMember?.user?.online || false);
      setLastActive(otherMember?.user?.last_active || null);
      setPeerLastRead(otherMember?.last_read || null);
    }

    const handleNewMessage = (event) => {
      const isFromMe = event.message.user?.id === authUser._id;
      const isFromCurrentChannel = isGroup
        ? event.channel_id === targetUserId
        : event.message.user?.id === targetUserId || isFromMe;

      if (isFromCurrentChannel) {
        const streamMessageId = event.message.id;
        const parentId = event.message.parent_id || event.message.custom_parent_id || null;
        const attachmentsList = event.message.attachments
          ? event.message.attachments.map((a) => a.image_url || a.asset_url || a.file_url)
          : [];

        const formattedMsg = {
          _id: streamMessageId,
          streamMessageId,
          senderId: {
            _id: event.message.user.id,
            fullName: event.message.user.name,
            profilePic: event.message.user.image,
          },
          receiverId: isFromMe ? targetUserId : authUser._id,
          message: event.message.text || "",
          attachments: attachmentsList,
          parentMessageId: parentId, // Temp placeholder (populated by history load)
          streamParentId: parentId,
          reactions: [],
          isDeleted: event.message.type === "deleted",
          createdAt: event.message.created_at || new Date().toISOString(),
        };

        // Check if reply parent details are present directly in custom properties of event
        if (event.message.parent_text && event.message.parent_sender_name) {
          formattedMsg.parentMessageId = {
            streamMessageId: parentId,
            message: event.message.parent_text,
            senderId: {
              fullName: event.message.parent_sender_name
            }
          };
        }

        setMessages((prev) => {
          if (prev.some((m) => m._id === formattedMsg._id)) return prev;
          return [...prev, formattedMsg];
        });

        // 🚀 Distribute authoritatively to MongoDB mirror
        syncMessageToBackend({
          streamMessageId,
          senderId: event.message.user.id,
          receiverId: isFromMe ? targetUserId : authUser._id,
          message: event.message.text || "",
          attachments: attachmentsList,
          streamParentId: parentId,
          createdAt: event.message.created_at
        }).catch((err) => console.error("Realtime background save synchronization failed:", err));

        if (!isFromMe) {
          markMessagesAsRead(targetUserId).catch((err) =>
            console.error("Mongoose background read receipt fail:", err)
          );
          channel.markRead().catch((err) => console.error("Stream markRead failed:", err));
        }

        setTimeout(() => {
          if (containerRef.current) {
            const isNearBottom =
              containerRef.current.scrollHeight - containerRef.current.scrollTop - containerRef.current.clientHeight < 250;
            if (isNearBottom || isFromMe) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }
        }, 100);
      }
    };

    const handleMessageUpdated = (event) => {
      const { message } = event;
      if (!message || !message.id) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === message.id || m.streamMessageId === message.id) {
            return {
              ...m,
              message: message.text || "",
              isEdited: true,
              isDeleted: message.type === "deleted",
              attachments: message.attachments
                ? message.attachments.map((a) => a.image_url || a.asset_url || a.file_url)
                : m.attachments
            };
          }
          return m;
        })
      );
    };

    const handleMessageDeleted = (event) => {
      const { message } = event;
      if (!message || !message.id) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === message.id || m.streamMessageId === message.id) {
            return {
              ...m,
              isDeleted: true
            };
          }
          return m;
        })
      );
    };

    const handleReactionEvent = (event) => {
      const { message } = event;
      if (!message || !message.id) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === message.id || m.streamMessageId === message.id) {
            const formattedReactions = Object.entries(message.latest_reactions || {}).flatMap(([emoji, list]) =>
              list.map((r) => ({
                userId: {
                  _id: r.user.id,
                  fullName: r.user.name,
                  profilePic: r.user.image,
                },
                emoji: r.type,
              }))
            );
            return { ...m, reactions: formattedReactions };
          }
          return m;
        })
      );
    };

    const handlePresenceEvent = (event) => {
      if (event.user?.id === targetUserId) {
        setIsOnline(event.user.online);
        setLastActive(event.user.last_active);
      }
    };

    const handleTypingStart = (event) => {
      if (event.user?.id === targetUserId) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (event) => {
      if (event.user?.id === targetUserId) {
        setIsTyping(false);
      }
    };

    const handleReadEvent = (event) => {
      if (event.user?.id === targetUserId) {
        setPeerLastRead(event.created_at || new Date().toISOString());
      }
    };

    // Bind clean duplex WebSocket event listeners
    channel.on("message.new", handleNewMessage);
    channel.on("message.updated", handleMessageUpdated);
    channel.on("message.deleted", handleMessageDeleted);
    channel.on("reaction.new", handleReactionEvent);
    channel.on("reaction.deleted", handleReactionEvent);
    channel.on("user.presence.changed", handlePresenceEvent);
    channel.on("typing.start", handleTypingStart);
    channel.on("typing.stop", handleTypingStop);
    channel.on("message.read", handleReadEvent);

    return () => {
      channel.off("message.new", handleNewMessage);
      channel.off("message.updated", handleMessageUpdated);
      channel.off("message.deleted", handleMessageDeleted);
      channel.off("reaction.new", handleReactionEvent);
      channel.off("reaction.deleted", handleReactionEvent);
      channel.off("user.presence.changed", handlePresenceEvent);
      channel.off("typing.start", handleTypingStart);
      channel.off("typing.stop", handleTypingStop);
      channel.off("message.read", handleReadEvent);
    };
  }, [channel, targetUserId, authUser]);

  return (
    <div className="flex-1 flex flex-col h-[75vh] relative overflow-hidden bg-base-100/40 border border-base-300/40 rounded-2xl shadow-inner">
      {/* 🚀 Active Now Glowing Presence Banner */}
      <div className="px-4 py-2.5 border-b border-base-300/40 bg-base-200/35 backdrop-blur-md flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-400"}`}></span>
          <span className="text-xs font-semibold opacity-75">
            {targetUserId.startsWith("group-")
              ? `${Object.keys(channel.state.members).length} members • ${Object.values(channel.state.members).filter(m => m.user?.online).length} online`
              : (isOnline ? "Active Now" : lastActive ? `Active ${new Date(lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Offline")
            }
          </span>
        </div>
        {isTyping && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold animate-pulse">
            <div className="flex space-x-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span>typing...</span>
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-100/90 backdrop-blur-sm z-30">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <span className="text-xs font-semibold opacity-75">Compiling chat history...</span>
        </div>
      )}

      {/* Messages Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-1 py-4 scrollbar-thin scroll-smooth"
        style={{ overscrollBehaviorY: "contain" }}
      >
        {/* Loading older message spinner */}
        {loadingMore && (
          <div className="w-full flex items-center justify-center py-2 gap-2 text-xs opacity-75 font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Fetching older transcripts...</span>
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 animate-pulse">
              <CornerDownLeft className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg mb-1">Your Conversation Begins</h3>
            <p className="text-xs opacity-60 max-w-xs">
              Say hello! Upload media attachments or react to messages. All transmissions are persisted securely.
            </p>
          </div>
        )}

        {/* Message rows mapping */}
        {messages.map((msg) => (
          <MessageRow
            key={msg._id || msg.streamMessageId}
            msg={msg}
            authUser={authUser}
            onImageClick={setFullscreenImage}
            lastReadByPeer={peerLastRead}
            onReply={onReply}
            onJumpToMessage={handleJumpToMessage}
            onLocalDelete={handleLocalDelete}
          />
        ))}
      </div>

      {/* Image Fullscreen Modal Overlay */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-300"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={fullscreenImage}
              alt="Fullscreen Preview"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200"
            />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2.5 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
