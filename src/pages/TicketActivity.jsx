import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  User,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  Calendar,
  Tag,
  Lock,
} from "lucide-react";

const TicketActivity = () => {
  const { referenceNumber } = useParams();
  const navigate = useNavigate();
  const { user, userRole, userDepartment } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const commentsEndRef = useRef(null);

  const statusConfig = {
    submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800", icon: FileText },
    verified: { label: "Verified", color: "bg-gold-100 text-gold-800", icon: CheckCircle },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
    in_progress: { label: "In Progress", color: "bg-orange-100 text-orange-800", icon: Clock },
    resolved: { label: "Resolved", color: "bg-green-100 text-green-800", icon: CheckCircle },
    closed: { label: "Closed", color: "bg-gray-100 text-gray-800", icon: Lock },
    disputed: { label: "Disputed", color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  };

  useEffect(() => {
    if (referenceNumber) {
      fetchComplaint();
    }
  }, [referenceNumber]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchComplaint = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("reference_number", referenceNumber.toUpperCase())
        .single();

      if (error) throw error;
      setComplaint(data);

      // Fetch audit trail
      const { data: trailData } = await supabase
        .from("audit_trail")
        .select("*")
        .eq("complaint_id", data.id)
        .order("created_at", { ascending: true });

      if (trailData) setAuditTrail(trailData);

      // Fetch all comments (admin/department can see internal ones)
      await fetchComments(data.id);
    } catch (err) {
      console.error("Error fetching feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (complaintId) => {
    const { data: commentsData } = await supabase
      .from("ticket_comments")
      .select("*")
      .eq("complaint_id", complaintId)
      .order("created_at", { ascending: true });

    if (commentsData) setComments(commentsData);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !complaint || !user) return;

    setCommentLoading(true);
    try {
      const authorName = user.full_name || user.email?.split("@")[0] || "Staff";
      
      // Determine author_type based on userRole from AuthContext
      let authorType = "admin";
      if (userRole === "department_staff" || userDepartment) {
        authorType = "department";
      }

      const { error } = await supabase.from("ticket_comments").insert({
        complaint_id: complaint.id,
        content: newComment.trim(),
        author_name: authorName,
        author_type: authorType,
        author_id: user.id,
        is_internal: isInternal,
      });

      if (error) throw error;

      setNewComment("");
      await fetchComments(complaint.id);
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Failed to post comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCommentDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-maroon-800" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Ticket Not Found</h2>
          <p className="text-gray-500 mt-2">The requested ticket could not be found.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-maroon-800 text-white rounded-lg hover:bg-maroon-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = statusConfig[complaint.status]?.icon || FileText;

  return (
    <div className="min-h-[calc(100vh-200px)] py-6 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-maroon-800 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ticket Activity</h1>
              <p className="text-maroon-800 font-mono font-semibold">{complaint.reference_number}</p>
            </div>
            <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[complaint.status]?.color}`}>
              <StatusIcon size={16} />
              <span>{statusConfig[complaint.status]?.label}</span>
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Ticket Info & Timeline */}
          <div className="lg:col-span-1 space-y-6">
            {/* Ticket Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Ticket Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <User size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500">Complainant</p>
                    <p className="font-medium text-gray-900">{complaint.name}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Tag size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-medium text-gray-900 capitalize">{complaint.category}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Calendar size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500">Submitted</p>
                    <p className="font-medium text-gray-900">{formatDate(complaint.created_at)}</p>
                  </div>
                </div>
                {complaint.assigned_department && (
                  <div className="flex items-start space-x-2">
                    <Building2 size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">Department</p>
                      <p className="font-medium text-gray-900 capitalize">{complaint.assigned_department}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Activity Timeline</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {auditTrail.map((entry, index) => (
                  <div key={entry.id} className="flex space-x-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${index === auditTrail.length - 1 ? 'bg-maroon-800' : 'bg-gray-300'}`}></div>
                      {index < auditTrail.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                      <p className="text-xs text-gray-500">{formatDate(entry.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Discussion */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
              {/* Discussion Header */}
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                  <MessageSquare size={20} className="text-maroon-800" />
                  <span>Discussion</span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Internal comments are only visible to admin and department staff
                </p>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[500px]">
                {comments.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No comments yet</p>
                    <p className="text-gray-400 text-sm">Start the conversation</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className={`flex space-x-3 ${comment.is_internal ? 'bg-amber-50 -mx-4 px-4 py-3 border-l-4 border-amber-400' : ''}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        comment.author_type === 'admin' 
                          ? 'bg-maroon-100 text-maroon-800' 
                          : comment.author_type === 'department'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <User size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-medium text-gray-900 text-sm">
                            {comment.author_name}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            comment.author_type === 'admin' 
                              ? 'bg-maroon-100 text-maroon-700' 
                              : comment.author_type === 'department'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {comment.author_type}
                          </span>
                          {comment.is_internal && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center space-x-1">
                              <EyeOff size={10} />
                              <span>Internal</span>
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatCommentDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm mt-1 break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-gray-100">
                {/* Internal Comment Toggle */}
                <label className="flex items-center space-x-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center space-x-1">
                    {isInternal ? <EyeOff size={14} className="text-amber-600" /> : <Eye size={14} className="text-gray-400" />}
                    <span>Internal comment (hidden from complainant)</span>
                  </span>
                </label>

                <div className="flex space-x-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={isInternal ? "Write an internal note..." : "Write a comment..."}
                    rows={3}
                    className={`flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:border-maroon-500 outline-none resize-none ${
                      isInternal ? 'border-amber-300 bg-amber-50 focus:ring-amber-200' : 'border-gray-300 focus:ring-maroon-200'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handlePostComment();
                      }
                    }}
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={commentLoading || !newComment.trim()}
                    className={`px-5 py-3 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                      isInternal ? 'bg-amber-600 hover:bg-amber-700' : 'bg-maroon-800 hover:bg-maroon-700'
                    }`}
                  >
                    {commentLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Press Ctrl+Enter to send</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketActivity;
