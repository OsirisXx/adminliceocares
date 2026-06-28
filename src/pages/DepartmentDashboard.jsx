import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  sendTicketInProgressEmail,
  sendTicketResolvedEmail,
  sendTicketStatusChangedEmail,
} from "../lib/resend";
import {
  Building2,
  CheckCircle,
  Clock,
  FileText,
  Search,
  Filter,
  Eye,
  X,
  RefreshCw,
  PlayCircle,
  MessageSquare,
  Upload,
  Image,
  Calendar,
  Tag,
  User,
  AlertCircle,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  Minimize2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Columns,
  Kanban,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DepartmentDashboard = () => {
  const navigate = useNavigate();
  const { user, userDepartment } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [departmentRemarks, setDepartmentRemarks] = useState("");
  const [resolutionImage, setResolutionImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [showStatusChangeSection, setShowStatusChangeSection] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [departmentStaff, setDepartmentStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [viewMode, setViewMode] = useState("expanded");
  const [listLayout, setListLayout] = useState("list"); // 'list' or 'kanban'
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [columnCount, setColumnCount] = useState(1);

  // Fetch department info from database
  useEffect(() => {
    const fetchDepartmentInfo = async () => {
      if (!userDepartment) return;
      try {
        const { data } = await supabase
          .from("departments")
          .select("*")
          .eq("code", userDepartment)
          .single();
        if (data) {
          setDepartmentInfo(data);
        }
      } catch (err) {
        console.error("Error fetching department info:", err);
      }
    };
    fetchDepartmentInfo();
  }, [userDepartment]);

  // Get department display name
  const getDepartmentName = () => {
    if (departmentInfo?.name) return departmentInfo.name;
    // Fallback to formatted code
    return (
      userDepartment
        ?.replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()) || "Department"
    );
  };

  const statusConfig = {
    verified: {
      label: "Pending",
      color: "bg-gold-100 text-gold-800",
      icon: Clock,
    },
    in_progress: {
      label: "In Progress",
      color: "bg-orange-100 text-orange-800",
      icon: Clock,
    },
    backlog: {
      label: "Backlog",
      color: "bg-purple-100 text-purple-800",
      icon: Clock,
    },
    resolved: {
      label: "Resolved",
      color: "bg-green-100 text-green-800",
      icon: CheckCircle,
    },
    closed: {
      label: "Closed",
      color: "bg-gray-100 text-gray-800",
      icon: CheckCircle,
    },
    disputed: {
      label: "Disputed",
      color: "bg-amber-100 text-amber-800",
      icon: AlertCircle,
    },
  };

  // Fetch staff from the same department
  useEffect(() => {
    const fetchDepartmentStaff = async () => {
      if (!userDepartment) {
        setDepartmentStaff([]);
        return;
      }

      setStaffLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, email, role")
          .eq("department", userDepartment)
          .neq("role", "student")
          .order("full_name");

        if (error) throw error;

        const formattedStaff = (data || []).map((staff) => ({
          value: staff.id,
          label: staff.full_name || staff.email,
          role: staff.role,
        }));
        setDepartmentStaff(formattedStaff);
      } catch (err) {
        console.error("Error fetching department staff:", err);
        setDepartmentStaff([]);
      } finally {
        setStaffLoading(false);
      }
    };

    fetchDepartmentStaff();
  }, [userDepartment]);

  useEffect(() => {
    if (user?.id) {
      fetchComplaints();
    }
  }, [user?.id, filterStatus]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("complaints")
        .select("*")
        .eq("assigned_to", user.id)
        .in("status", [
          "verified",
          "in_progress",
          "backlog",
          "resolved",
          "closed",
          "disputed",
        ])
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComplaints(data || []);
    } catch (err) {
      console.error("Error fetching complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartProgress = async () => {
    setActionLoading(true);
    try {
      const updateData = {
        status: "in_progress",
        department_remarks: departmentRemarks,
        started_at: new Date().toISOString(),
        started_by: user.id,
      };

      // If staff member is selected, reassign to them
      if (selectedStaff) {
        updateData.assigned_to = selectedStaff;
      }

      const { error: updateError } = await supabase
        .from("complaints")
        .update(updateData)
        .eq("id", selectedComplaint.id);

      if (updateError) throw updateError;

      const staffName = selectedStaff
        ? departmentStaff.find((s) => s.value === selectedStaff)?.label
        : null;

      await supabase.from("audit_trail").insert({
        complaint_id: selectedComplaint.id,
        action: "Started Processing",
        performed_by: user.id,
        details: `${staffName ? `Assigned to ${staffName}. ` : ""}${
          departmentRemarks
            ? `Remarks: ${departmentRemarks}`
            : "Department started working on the feedback"
        }`,
      });

      // Send email notification if user provided email
      if (selectedComplaint.email) {
        const deptLabel = getDepartmentName();
        await sendTicketInProgressEmail({
          to: selectedComplaint.email,
          referenceNumber: selectedComplaint.reference_number,
          department: deptLabel,
          remarks: departmentRemarks,
        });
      }

      setShowModal(false);
      setSelectedComplaint(null);
      setDepartmentRemarks("");
      setSelectedStaff("");
      fetchComplaints();
    } catch (err) {
      console.error("Error updating feedback:", err);
      alert("Failed to update feedback");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolutionImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageError("File size must be less than 5MB");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageError("Please upload an image file (JPG, PNG, GIF, etc.)");
      e.target.value = "";
      return;
    }

    setImageError("");
    setResolutionImage(file);
  };

  const handleResolve = async () => {
    setActionLoading(true);
    try {
      // Upload resolution image if provided
      let resolutionImageUrl = null;
      if (resolutionImage) {
        const fileExt = resolutionImage.name.split(".").pop();
        const fileName = `resolution-${
          selectedComplaint.reference_number
        }-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(fileName, resolutionImage);

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("attachments").getPublicUrl(fileName);
          resolutionImageUrl = publicUrl;
        }
      }

      const { error: updateError } = await supabase
        .from("complaints")
        .update({
          status: "resolved",
          resolution_details: resolutionDetails,
          department_remarks: departmentRemarks,
          resolution_image_url: resolutionImageUrl,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", selectedComplaint.id);

      if (updateError) throw updateError;

      await supabase.from("audit_trail").insert({
        complaint_id: selectedComplaint.id,
        action: "Feedback Resolved",
        performed_by: user.id,
        details: resolutionDetails
          ? `Resolution: ${resolutionDetails}`
          : "Feedback marked as resolved",
      });

      // Send email notification if user provided email
      if (selectedComplaint.email) {
        await sendTicketResolvedEmail({
          to: selectedComplaint.email,
          referenceNumber: selectedComplaint.reference_number,
          resolutionDetails: resolutionDetails,
          departmentRemarks: departmentRemarks,
        });
      }

      setShowModal(false);
      setSelectedComplaint(null);
      setResolutionDetails("");
      setDepartmentRemarks("");
      setResolutionImage(null);
      fetchComplaints();
    } catch (err) {
      console.error("Error resolving feedback:", err);
      alert("Failed to resolve feedback");
    } finally {
      setActionLoading(false);
    }
  };

  // Generic status change handler for dropdown selections
  const handleStatusChange = async () => {
    if (!newStatus) {
      alert("Please select a new status");
      return;
    }

    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("complaints")
        .update({
          status: newStatus,
          department_remarks:
            departmentRemarks || selectedComplaint.department_remarks,
        })
        .eq("id", selectedComplaint.id);

      if (updateError) throw updateError;

      const statusLabels = {
        verified: "Pending",
        in_progress: "In Progress",
        backlog: "Backlog",
        resolved: "Resolved",
        closed: "Closed",
        disputed: "Disputed",
      };

      // Insert audit trail entry
      await supabase.from("audit_trail").insert({
        complaint_id: selectedComplaint.id,
        action: `Status Changed to ${statusLabels[newStatus] || newStatus}`,
        performed_by: user.id,
        details: `Department changed status from ${
          statusLabels[selectedComplaint.status] || selectedComplaint.status
        } to ${statusLabels[newStatus] || newStatus}${
          departmentRemarks ? `. Remarks: ${departmentRemarks}` : ""
        }`,
      });

      // Send email notification if user provided email
      if (selectedComplaint.email) {
        try {
          await sendTicketStatusChangedEmail({
            to: selectedComplaint.email,
            referenceNumber: selectedComplaint.reference_number,
            oldStatus:
              statusLabels[selectedComplaint.status] ||
              selectedComplaint.status,
            newStatus: statusLabels[newStatus] || newStatus,
            remarks: departmentRemarks,
          });
        } catch (emailErr) {
          console.error("Error sending email:", emailErr);
        }
      }

      setShowModal(false);
      setSelectedComplaint(null);
      setDepartmentRemarks("");
      setNewStatus("");
      setShowStatusChangeSection(false);
      fetchComplaints();
    } catch (err) {
      console.error("Error changing status:", err);
      alert("Failed to change status");
    } finally {
      setActionLoading(false);
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

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "academic", label: "Academic" },
    { value: "facilities", label: "Facilities" },
    { value: "finance", label: "Finance" },
    { value: "staff", label: "Staff" },
    { value: "security", label: "Security" },
    { value: "other", label: "Other" },
  ];

  const dateRanges = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  const isWithinDateRange = (dateString) => {
    if (filterDateRange === "all") return true;
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filterDateRange === "today") {
      return date >= today;
    } else if (filterDateRange === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    } else if (filterDateRange === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return date >= monthAgo;
    }
    return true;
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      !searchQuery ||
      complaint.reference_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      complaint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      filterCategory === "all" || complaint.category === filterCategory;
    const matchesDate = isWithinDateRange(complaint.created_at);

    return matchesSearch && matchesCategory && matchesDate;
  });

  // Sort complaints
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  // Pagination
  const totalPages = Math.ceil(sortedComplaints.length / itemsPerPage);
  const paginatedComplaints = paginationEnabled
    ? sortedComplaints.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : sortedComplaints;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterStatus,
    filterCategory,
    filterDateRange,
    searchQuery,
    sortOrder,
    itemsPerPage,
  ]);

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "verified").length,
    inProgress: complaints.filter((c) => c.status === "in_progress").length,
    backlog: complaints.filter((c) => c.status === "backlog").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    closed: complaints.filter((c) => c.status === "closed").length,
    disputed: complaints.filter((c) => c.status === "disputed").length,
    rejected: complaints.filter((c) => c.status === "rejected").length,
  };

  return (
    <div className="min-h-[calc(100vh-200px)] py-8 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-maroon-800 rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-gold-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Department Dashboard
              </h1>
              <p className="text-gray-600">{getDepartmentName()}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gold-100 shadow-sm">
            <p className="text-sm text-gold-600">Pending</p>
            <p className="text-2xl font-bold text-gold-700">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
            <p className="text-sm text-orange-600">In Progress</p>
            <p className="text-2xl font-bold text-orange-700">
              {stats.inProgress}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
            <p className="text-sm text-purple-600">Backlog</p>
            <p className="text-2xl font-bold text-purple-700">
              {stats.backlog}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
            <p className="text-sm text-green-600">Resolved</p>
            <p className="text-2xl font-bold text-green-700">
              {stats.resolved}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-600">Closed</p>
            <p className="text-2xl font-bold text-gray-700">{stats.closed}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
            <p className="text-sm text-amber-600">Disputed</p>
            <p className="text-2xl font-bold text-amber-700">
              {stats.disputed}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <p className="text-sm text-red-600">Rejected</p>
            <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
          </div>
        </div>

        {/* Complaints Trend Area Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-8">
          <div className="p-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Complaints Overview
              </h3>
              <p className="text-sm text-gray-500">
                Showing feedback statistics by status
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { value: "1d", label: "1D" },
                { value: "7d", label: "7D" },
                { value: "1m", label: "1M" },
                { value: "3m", label: "3M" },
                { value: "6m", label: "6M" },
                { value: "1y", label: "1Y" },
                { value: "all", label: "All" },
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setChartTimeRange(range.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    chartTimeRange === range.value
                      ? "bg-maroon-800 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={(() => {
                    // Filter complaints by time range
                    const now = new Date();
                    let filteredComplaints = complaints;

                    if (chartTimeRange !== "all") {
                      const ranges = {
                        "1d": 1,
                        "7d": 7,
                        "1m": 30,
                        "3m": 90,
                        "6m": 180,
                        "1y": 365,
                      };
                      const daysAgo = ranges[chartTimeRange] || 365;
                      const cutoffDate = new Date(
                        now.getTime() - daysAgo * 24 * 60 * 60 * 1000
                      );
                      filteredComplaints = complaints.filter(
                        (c) => new Date(c.created_at) >= cutoffDate
                      );
                    }

                    // Calculate stats for filtered data
                    return [
                      {
                        name: "Pending",
                        count: filteredComplaints.filter(
                          (c) => c.status === "verified"
                        ).length,
                        fill: "#D4AF37",
                      },
                      {
                        name: "In Progress",
                        count: filteredComplaints.filter(
                          (c) => c.status === "in_progress"
                        ).length,
                        fill: "#F97316",
                      },
                      {
                        name: "Backlog",
                        count: filteredComplaints.filter(
                          (c) => c.status === "backlog"
                        ).length,
                        fill: "#8B5CF6",
                      },
                      {
                        name: "Resolved",
                        count: filteredComplaints.filter(
                          (c) => c.status === "resolved"
                        ).length,
                        fill: "#22C55E",
                      },
                      {
                        name: "Closed",
                        count: filteredComplaints.filter(
                          (c) => c.status === "closed"
                        ).length,
                        fill: "#6B7280",
                      },
                      {
                        name: "Disputed",
                        count: filteredComplaints.filter(
                          (c) => c.status === "disputed"
                        ).length,
                        fill: "#F59E0B",
                      },
                      {
                        name: "Rejected",
                        count: filteredComplaints.filter(
                          (c) => c.status === "rejected"
                        ).length,
                        fill: "#EF4444",
                      },
                    ];
                  })()}
                  margin={{ left: -20, right: 12, top: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickCount={5}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value, name) => [value, "Count"]}
                  />
                  <Area
                    dataKey="count"
                    type="monotone"
                    fill="#7C2D2D"
                    fillOpacity={0.4}
                    stroke="#7C2D2D"
                    strokeWidth={2}
                    name="Complaints"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="px-6 pb-6 pt-2 border-t border-gray-100">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
              <span className="font-medium text-gray-700">
                Total:{" "}
                {(() => {
                  const now = new Date();
                  let filteredComplaints = complaints;
                  if (chartTimeRange !== "all") {
                    const ranges = {
                      "1d": 1,
                      "7d": 7,
                      "1m": 30,
                      "3m": 90,
                      "6m": 180,
                      "1y": 365,
                    };
                    const daysAgo = ranges[chartTimeRange] || 365;
                    const cutoffDate = new Date(
                      now.getTime() - daysAgo * 24 * 60 * 60 * 1000
                    );
                    filteredComplaints = complaints.filter(
                      (c) => new Date(c.created_at) >= cutoffDate
                    );
                  }
                  return filteredComplaints.length;
                })()}{" "}
                complaints
              </span>
              <span className="text-gold-600">
                {(() => {
                  const now = new Date();
                  let filteredComplaints = complaints;
                  if (chartTimeRange !== "all") {
                    const ranges = {
                      "1d": 1,
                      "7d": 7,
                      "1m": 30,
                      "3m": 90,
                      "6m": 180,
                      "1y": 365,
                    };
                    const daysAgo = ranges[chartTimeRange] || 365;
                    const cutoffDate = new Date(
                      now.getTime() - daysAgo * 24 * 60 * 60 * 1000
                    );
                    filteredComplaints = complaints.filter(
                      (c) => new Date(c.created_at) >= cutoffDate
                    );
                  }
                  return filteredComplaints.filter((c) => c.status === "verified").length;
                })()}{" "}
                pending
              </span>
              <span className="text-orange-600">
                {(() => {
                  const now = new Date();
                  let filteredComplaints = complaints;
                  if (chartTimeRange !== "all") {
                    const ranges = {
                      "1d": 1,
                      "7d": 7,
                      "1m": 30,
                      "3m": 90,
                      "6m": 180,
                      "1y": 365,
                    };
                    const daysAgo = ranges[chartTimeRange] || 365;
                    const cutoffDate = new Date(
                      now.getTime() - daysAgo * 24 * 60 * 60 * 1000
                    );
                    filteredComplaints = complaints.filter(
                      (c) => new Date(c.created_at) >= cutoffDate
                    );
                  }
                  return filteredComplaints.filter((c) => c.status === "in_progress").length;
                })()}{" "}
                in progress
              </span>
              <span className="text-purple-600">
                {(() => {
                  const now = new Date();
                  let filteredComplaints = complaints;
                  if (chartTimeRange !== "all") {
                    const ranges = {
                      "1d": 1,
                      "7d": 7,
                      "1m": 30,
                      "3m": 90,
                      "6m": 180,
                      "1y": 365,
                    };
                    const daysAgo = ranges[chartTimeRange] || 365;
                    const cutoffDate = new Date(
                      now.getTime() - daysAgo * 24 * 60 * 60 * 1000
                    );
                    filteredComplaints = complaints.filter(
                      (c) => new Date(c.created_at) >= cutoffDate
                    );
                  }
                  return filteredComplaints.filter((c) => c.status === "backlog").length;
                })()}{" "}
                backlog
              </span>
              <span className="text-green-600">
                {(() => {
                  const now = new Date();
                  let filteredComplaints = complaints;
                  if (chartTimeRange !== "all") {
                    const ranges = {
                      "1d": 1,
                      "7d": 7,
                      "1m": 30,
                      "3m": 90,
                      "6m": 180,
                      "1y": 365,
                    };
                    const daysAgo = ranges[chartTimeRange] || 365;
                    const cutoffDate = new Date(
                      now.getTime() - daysAgo * 24 * 60 * 60 * 1000
                    );
                    filteredComplaints = complaints.filter(
                      (c) => new Date(c.created_at) >= cutoffDate
                    );
                  }
                  return filteredComplaints.filter((c) => c.status === "resolved").length;
                })()}{" "}
                resolved
              </span>
              <span className="text-gray-600">
                {(() => {
                  const now = new Date();
                  let filteredComplaints = complaints;
                  if (chartTimeRange !== "all") {
                    const ranges = {
                      "1d": 1,
                      "7d": 7,
                      "1m": 30,
                      "3m": 90,
                      "6m": 180,
                      "1y": 365,
                    };
                    const daysAgo = ranges[chartTimeRange] || 365;
                    const cutoffDate = new Date(
                      now.getTime() - daysAgo * 24 * 60 * 60 * 1000
                    );
                    filteredComplaints = complaints.filter(
                      (c) => new Date(c.created_at) >= cutoffDate
                    );
                  }
                  return filteredComplaints.filter((c) => c.status === "closed").length;
                })()}{" "}
                closed
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6">
          <div className="flex flex-col gap-4">
            {/* Search Row */}
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by reference, name, category, description..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
              />
            </div>
            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <Filter size={18} className="text-gray-400" />
                <span className="text-sm text-gray-500">Filters:</span>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="verified">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="backlog">Backlog</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="disputed">Disputed</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white text-sm"
              >
                {dateRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchComplaints}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Layout & Sort Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
              {/* List / Kanban View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setListLayout("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    listLayout === "list"
                      ? "bg-white shadow-sm text-maroon-800"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  title="List View"
                >
                  <LayoutList size={15} />
                  <span>List</span>
                </button>
                <button
                  onClick={() => setListLayout("kanban")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    listLayout === "kanban"
                      ? "bg-white shadow-sm text-maroon-800"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  title="Kanban Board"
                >
                  <Kanban size={15} />
                  <span>Kanban</span>
                </button>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-2">
                <ArrowUpDown size={16} className="text-gray-400" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white text-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* View Mode Toggle (only in list layout) */}
              {listLayout === "list" && (
                <button
                  onClick={() =>
                    setViewMode(viewMode === "expanded" ? "compact" : "expanded")
                  }
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium transition-colors hover:bg-gray-200"
                  title={
                    viewMode === "expanded"
                      ? "Switch to Compact View"
                      : "Switch to Expanded View"
                  }
                >
                  {viewMode === "expanded" ? (
                    <>
                      <Minimize2 size={16} className="text-gray-600" />
                      <span className="text-gray-700">Minimize</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 size={16} className="text-maroon-800" />
                      <span className="text-maroon-800">Expand</span>
                    </>
                  )}
                </button>
              )}

              {/* Column Count Selector (only in list layout) */}
              {listLayout === "list" && (
                <div className="flex items-center gap-2">
                  <Columns size={16} className="text-gray-400" />
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    {[1, 2, 3, 4].map((cols) => (
                      <button
                        key={cols}
                        onClick={() => setColumnCount(cols)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          columnCount === cols
                            ? "bg-white shadow-sm text-maroon-800"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {cols}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pagination Toggle (only in list layout) */}
              {listLayout === "list" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPaginationEnabled(!paginationEnabled)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      paginationEnabled
                        ? "bg-maroon-100 text-maroon-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <LayoutGrid size={16} />
                    <span>Pagination {paginationEnabled ? "On" : "Off"}</span>
                  </button>
                </div>
              )}

              {/* Items Per Page - only show when pagination is enabled and in list layout */}
              {listLayout === "list" && paginationEnabled && (
                <div className="flex items-center gap-2">
                  <LayoutList size={16} className="text-gray-400" />
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white text-sm"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              )}

              <span className="text-sm text-gray-500 ml-auto">
                {listLayout === "list" && paginationEnabled
                  ? `Showing ${paginatedComplaints.length} of ${filteredComplaints.length}`
                  : `${filteredComplaints.length}`}{" "}
                concern{filteredComplaints.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Kanban Board View */}
        {listLayout === "kanban" && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {[
                { key: "verified", label: "Pending", color: "border-t-yellow-400", headerBg: "bg-yellow-50", headerText: "text-yellow-800", dot: "bg-yellow-400" },
                { key: "in_progress", label: "In Progress", color: "border-t-orange-400", headerBg: "bg-orange-50", headerText: "text-orange-800", dot: "bg-orange-400" },
                { key: "backlog", label: "Backlog", color: "border-t-purple-400", headerBg: "bg-purple-50", headerText: "text-purple-800", dot: "bg-purple-400" },
                { key: "resolved", label: "Resolved", color: "border-t-green-400", headerBg: "bg-green-50", headerText: "text-green-800", dot: "bg-green-400" },
                { key: "closed", label: "Closed", color: "border-t-gray-400", headerBg: "bg-gray-50", headerText: "text-gray-700", dot: "bg-gray-400" },
                { key: "disputed", label: "Disputed", color: "border-t-amber-400", headerBg: "bg-amber-50", headerText: "text-amber-800", dot: "bg-amber-400" },
              ].map((col) => {
                const colComplaints = sortedComplaints.filter((c) => c.status === col.key);
                return (
                  <div
                    key={col.key}
                    className={`w-72 flex-shrink-0 bg-white rounded-xl border border-gray-100 border-t-4 ${col.color} shadow-sm flex flex-col`}
                  >
                    {/* Column Header */}
                    <div className={`px-4 py-3 ${col.headerBg} rounded-t-lg flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></div>
                        <span className={`font-semibold text-sm ${col.headerText}`}>{col.label}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 ${col.headerText}`}>
                        {colComplaints.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-3 p-3 overflow-y-auto" style={{ maxHeight: "65vh" }}>
                      {colComplaints.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                          <FileText size={32} className="mb-2" />
                          <p className="text-xs">No tickets</p>
                        </div>
                      ) : (
                        colComplaints.map((complaint) => (
                          <div
                            key={complaint.id}
                            className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-maroon-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
                            onClick={() => { setSelectedComplaint(complaint); setShowModal(true); }}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="font-mono text-xs text-maroon-800 bg-maroon-50 px-2 py-0.5 rounded border border-maroon-100">
                                {complaint.reference_number}
                              </span>
                              <span className="text-xs text-gray-400 shrink-0">
                                {new Date(complaint.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2 group-hover:text-maroon-800 transition-colors">
                              {complaint.name}
                            </p>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                              {complaint.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white border border-gray-200 rounded-full capitalize text-gray-600">
                                <Tag size={10} />
                                {complaint.category}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/ticket/${complaint.reference_number}`); }}
                                className="p-1.5 text-gray-400 hover:text-maroon-700 hover:bg-maroon-50 rounded-lg transition-colors"
                                title="View Discussion"
                              >
                                <MessageSquare size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Complaints List/Grid View */}
        {listLayout === "list" && <div
          className={`${
            columnCount === 1
              ? "space-y-4"
              : `grid gap-4 ${
                  columnCount === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : columnCount === 3
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                }`
          }`}
        >
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-maroon-800 border-t-transparent mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading complaints...</p>
            </div>
          ) : paginatedComplaints.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
              <FileText size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                No complaints assigned to your department
              </p>
            </div>
          ) : (
            paginatedComplaints.map((complaint) => {
              const status = statusConfig[complaint.status];
              const StatusIcon = status?.icon || FileText;

              if (viewMode === "compact") {
                return (
                  <div
                    key={complaint.id}
                    className="bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-3"
                  >
                    {columnCount === 1 ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${status?.color}`}
                          >
                            <StatusIcon size={12} />
                            <span>{status?.label}</span>
                          </span>
                          <span className="font-mono text-xs text-maroon-800 bg-maroon-50 px-2 py-1 rounded">
                            {complaint.reference_number}
                          </span>
                          <span className="text-sm text-gray-900 truncate font-medium">
                            {complaint.name}
                          </span>
                          <span className="text-xs text-gray-500 capitalize hidden sm:inline">
                            {complaint.category}
                          </span>
                          <span className="text-xs text-gray-400 hidden md:inline">
                            {formatDate(complaint.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              navigate(`/ticket/${complaint.reference_number}`)
                            }
                            className="p-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                            title="View Activity"
                          >
                            <MessageSquare size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setShowModal(true);
                            }}
                            className="p-2 bg-maroon-800 text-white rounded-lg hover:bg-maroon-700 transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${status?.color}`}
                          >
                            <StatusIcon size={12} />
                            <span>{status?.label}</span>
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(complaint.created_at)}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-maroon-800 bg-maroon-50 px-2 py-1 rounded inline-block mb-2 w-fit">
                          {complaint.reference_number}
                        </span>
                        <p className="text-sm text-gray-900 font-medium truncate mb-1">
                          {complaint.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize mb-3">
                          {complaint.category}
                        </p>
                        <div className="flex items-center gap-2 mt-auto">
                          <button
                            onClick={() =>
                              navigate(`/ticket/${complaint.reference_number}`)
                            }
                            className="flex-1 p-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-xs flex items-center justify-center gap-1"
                            title="View Activity"
                          >
                            <MessageSquare size={14} />
                            <span className={columnCount >= 3 ? "hidden" : ""}>
                              Activity
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setShowModal(true);
                            }}
                            className="flex-1 p-2 bg-maroon-800 text-white rounded-lg hover:bg-maroon-700 transition-colors text-xs flex items-center justify-center gap-1"
                            title="View Details"
                          >
                            <Eye size={14} />
                            <span className={columnCount >= 3 ? "hidden" : ""}>
                              Details
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              const isMultiColumn = columnCount >= 2;
              const isNarrowColumn = columnCount >= 3;

              return (
                <div
                  key={complaint.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                >
                  {/* Card Header */}
                  <div
                    className={`${
                      isNarrowColumn ? "px-3 py-3" : "px-4 sm:px-6 py-4"
                    } border-b border-gray-100 flex ${
                      isMultiColumn
                        ? "flex-col gap-2"
                        : "flex-col sm:flex-row sm:items-center justify-between gap-3"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {!isNarrowColumn && (
                        <div className="w-10 h-10 bg-maroon-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={20} className="text-maroon-800" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-semibold text-gray-900 truncate ${
                            isNarrowColumn ? "text-sm" : ""
                          }`}
                        >
                          {complaint.name}
                        </p>
                        {!isNarrowColumn && (
                          <p className="text-sm text-gray-500 truncate">
                            {complaint.email || "No email provided"}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium self-start ${status?.color}`}
                    >
                      <StatusIcon size={12} />
                      <span>{status?.label}</span>
                    </span>
                  </div>

                  {/* Card Body */}
                  <div
                    className={`${
                      isNarrowColumn ? "px-3 py-3" : "px-4 sm:px-6 py-4"
                    } flex-1`}
                  >
                    {/* Reference & Category */}
                    <div
                      className={`flex flex-wrap items-center gap-2 ${
                        isNarrowColumn ? "mb-2" : "mb-3"
                      }`}
                    >
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-1 bg-maroon-50 text-maroon-800 rounded text-xs font-mono font-medium ${
                          isNarrowColumn ? "text-[10px]" : ""
                        }`}
                      >
                        <FileText size={isNarrowColumn ? 10 : 12} />
                        <span className="truncate max-w-[100px]">
                          {complaint.reference_number}
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize ${
                          isNarrowColumn ? "text-[10px]" : ""
                        }`}
                      >
                        <Tag size={isNarrowColumn ? 10 : 12} />
                        <span>{complaint.category}</span>
                      </span>
                    </div>

                    {/* Date */}
                    <div
                      className={`flex items-center space-x-1 text-xs text-gray-500 ${
                        isNarrowColumn ? "mb-2" : "mb-3"
                      }`}
                    >
                      <Calendar size={isNarrowColumn ? 10 : 12} />
                      <span>{formatDate(complaint.created_at)}</span>
                    </div>

                    {/* Description Preview */}
                    <div className={isNarrowColumn ? "mb-2" : "mb-4"}>
                      <p
                        className={`text-gray-700 line-clamp-2 ${
                          isNarrowColumn ? "text-xs" : "text-sm sm:text-base"
                        }`}
                      >
                        {complaint.description}
                      </p>
                    </div>

                    {/* Attachment indicator */}
                    {complaint.attachment_url && !isNarrowColumn && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                        <Image size={16} />
                        <span>Has attachment</span>
                      </div>
                    )}

                    {/* Admin Remarks (if any) */}
                    {complaint.admin_remarks && !isNarrowColumn && (
                      <div className="flex items-center space-x-2 text-sm text-gold-700 bg-gold-50 px-3 py-2 rounded-lg mb-4">
                        <MessageSquare size={16} />
                        <span className="truncate">
                          Admin: {complaint.admin_remarks}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div
                    className={`${
                      isNarrowColumn ? "px-3 py-2" : "px-4 sm:px-6 py-3"
                    } bg-gray-50 border-t border-gray-100 flex ${
                      isMultiColumn
                        ? "flex-col gap-2"
                        : "flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    }`}
                  >
                    {!isNarrowColumn && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <MessageSquare size={16} />
                        <span>Complaint #{complaint.id}</span>
                      </div>
                    )}
                    <div
                      className={`flex gap-2 ${
                        isMultiColumn ? "w-full" : "w-full sm:w-auto"
                      }`}
                    >
                      <button
                        onClick={() =>
                          navigate(`/ticket/${complaint.reference_number}`)
                        }
                        className={`inline-flex items-center justify-center space-x-1 px-3 py-2 border border-maroon-800 text-maroon-800 rounded-lg hover:bg-maroon-50 transition-colors font-medium ${
                          isMultiColumn ? "flex-1 text-xs" : "text-sm"
                        }`}
                      >
                        <MessageSquare size={isNarrowColumn ? 14 : 16} />
                        {!isNarrowColumn && <span>View Activity</span>}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setShowModal(true);
                        }}
                        className={`inline-flex items-center justify-center space-x-1 px-3 py-2 bg-maroon-800 text-white rounded-lg hover:bg-maroon-700 transition-colors font-medium ${
                          isMultiColumn ? "flex-1 text-xs" : "text-sm"
                        }`}
                      >
                        <Eye size={isNarrowColumn ? 14 : 16} />
                        {!isNarrowColumn && <span>View Details</span>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>}

        {/* Pagination Controls */}
        {listLayout === "list" && paginationEnabled && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? "bg-maroon-800 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && selectedComplaint && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Feedback Details
                  </h2>
                  <p className="text-sm text-gray-500 font-mono">
                    {selectedComplaint.reference_number}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedComplaint(null);
                    setResolutionDetails("");
                    setDepartmentRemarks("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

                {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Status with Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">Current Status</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        statusConfig[selectedComplaint.status]?.color
                      }`}
                    >
                      {statusConfig[selectedComplaint.status]?.label}
                    </span>
                    <select
                      value={newStatus}
                      onChange={(e) => {
                        setNewStatus(e.target.value);
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white"
                    >
                      <option value="">Select Action...</option>
                      {selectedComplaint.status === "verified" && (
                        <>
                          <option value="in_progress">Start Progress</option>
                          <option value="backlog">Move to Backlog</option>
                        </>
                      )}
                      {selectedComplaint.status === "in_progress" && (
                        <>
                          <option value="resolved">Mark Resolved</option>
                          <option value="backlog">Move to Backlog</option>
                          <option value="verified">Back to Pending</option>
                        </>
                      )}
                      {selectedComplaint.status === "backlog" && (
                        <>
                          <option value="in_progress">Start Progress</option>
                          <option value="verified">Back to Pending</option>
                        </>
                      )}
                      {selectedComplaint.status === "resolved" && (
                        <>
                          <option value="in_progress">Reopen</option>
                          <option value="closed">Close Ticket</option>
                        </>
                      )}
                      {selectedComplaint.status === "disputed" && (
                        <option value="in_progress">Reopen for Review</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Complainant</p>
                    <p className="font-medium text-gray-900">
                      {selectedComplaint.name}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className="font-medium text-gray-900">
                      {selectedComplaint.email || "Not provided"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Category</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {selectedComplaint.category}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">
                      Student/Employee ID
                    </p>
                    <p className="font-medium text-gray-900">
                      {selectedComplaint.student_id || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </p>
                  </div>
                </div>

                {/* Admin Remarks */}
                {selectedComplaint.admin_remarks && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Admin Remarks</p>
                    <div className="bg-gold-50 border border-gold-200 rounded-xl p-4">
                      <p className="text-gold-900">
                        {selectedComplaint.admin_remarks}
                      </p>
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedComplaint.attachment_url && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">
                      Attachments
                    </p>
                    <div className="space-y-2">
                      {selectedComplaint.attachment_url.split(',').map((url, i) => {
                        const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i);
                        return (
                          <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col space-y-3 h-full">
                            {isImage && (
                              <img
                                src={url}
                                alt={`Attachment ${i + 1}`}
                                className="max-h-64 object-contain rounded-lg border border-gray-200"
                              />
                            )}
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-auto flex items-center justify-center space-x-2 w-full py-2.5 bg-white border-2 border-maroon-800 text-maroon-800 rounded-lg hover:bg-maroon-800 hover:text-white transition-colors font-medium text-sm shadow-sm"
                            >
                              {isImage ? <Image size={18} /> : <FileText size={18} />}
                              <span>View {isImage ? 'Full Image' : 'Document'}</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Section Wrapper */}
                {(() => {
                  const actionToTake = newStatus || (
                    selectedComplaint.status === "verified" ? "in_progress" :
                    selectedComplaint.status === "in_progress" ? "resolved" :
                    ""
                  );

                  return (
                    <>
                      {/* Action Section - For in_progress (start progress) */}
                      {actionToTake === "in_progress" && (
                        <div className="border-t border-gray-100 pt-6">
                          <h3 className="font-semibold text-gray-900 mb-4">
                            Take Action
                          </h3>

                          {/* Assign to Staff Member */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Assign to Staff Member{" "}
                              <span className="text-gray-400">(optional)</span>
                            </label>
                            <div className="relative">
                              <User
                                size={20}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                              />
                              <select
                                value={selectedStaff}
                                onChange={(e) => setSelectedStaff(e.target.value)}
                                disabled={staffLoading}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">
                                  {staffLoading
                                    ? "Loading staff..."
                                    : "Select a staff member (or keep for yourself)"}
                                </option>
                                {departmentStaff.map((staff) => (
                                  <option key={staff.value} value={staff.value}>
                                    {staff.label} ({staff.role})
                                  </option>
                                ))}
                              </select>
                            </div>
                            {departmentStaff.length === 0 && !staffLoading && (
                              <p className="text-sm text-amber-600 mt-2">
                                No other staff members found in this department.
                              </p>
                            )}
                          </div>

                          {/* Remarks */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Remarks{" "}
                              <span className="text-gray-400">(optional)</span>
                            </label>
                            <textarea
                              value={departmentRemarks}
                              onChange={(e) => setDepartmentRemarks(e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none"
                              placeholder="Add any initial remarks..."
                            />
                          </div>

                          <button
                            onClick={handleStartProgress}
                            disabled={actionLoading}
                            className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            ) : (
                              <>
                                <PlayCircle size={20} />
                                <span>Start Working on This</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Action Section - For resolved (resolve) */}
                      {actionToTake === "resolved" && (
                        <div className="border-t border-gray-100 pt-6">
                          <h3 className="font-semibold text-gray-900 mb-4">
                            Resolve Feedback
                          </h3>

                          {/* Resolution Details */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Resolution Details{" "}
                              <span className="text-gray-400">(optional)</span>
                            </label>
                            <textarea
                              value={resolutionDetails}
                              onChange={(e) => setResolutionDetails(e.target.value)}
                              rows={4}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none"
                              placeholder="Describe how the feedback was resolved..."
                            />
                          </div>

                          {/* Resolution Image Upload - Required */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Resolution Proof Image{" "}
                              <span className="text-gray-400">(optional)</span>
                            </label>
                            {imageError && (
                              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{imageError}</p>
                              </div>
                            )}
                            <div className="relative">
                              <input
                                type="file"
                                onChange={handleResolutionImageChange}
                                accept="image/*"
                                className="hidden"
                                id="resolutionImage"
                              />
                              <label
                                htmlFor="resolutionImage"
                                className={`flex items-center justify-center space-x-2 w-full py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                                  resolutionImage
                                    ? "border-green-400 bg-green-50"
                                    : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
                                }`}
                              >
                                <Upload
                                  size={20}
                                  className={
                                    resolutionImage
                                      ? "text-green-500"
                                      : "text-gray-400"
                                  }
                                />
                                <span
                                  className={
                                    resolutionImage
                                      ? "text-green-700"
                                      : "text-gray-600"
                                  }
                                >
                                  {resolutionImage
                                    ? resolutionImage.name
                                    : "Upload proof of resolution (optional)"}
                                </span>
                              </label>
                            </div>
                            {resolutionImage && (
                              <div className="mt-3">
                                <img
                                  src={URL.createObjectURL(resolutionImage)}
                                  alt="Resolution Preview"
                                  className="max-h-40 rounded-lg border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => setResolutionImage(null)}
                                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                                >
                                  Remove image
                                </button>
                              </div>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                              Upload an image showing the resolved issue (JPG, PNG,
                              GIF - max 5MB)
                            </p>
                          </div>

                          {/* Additional Remarks */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Additional Remarks{" "}
                              <span className="text-gray-400">(optional)</span>
                            </label>
                            <textarea
                              value={departmentRemarks}
                              onChange={(e) => setDepartmentRemarks(e.target.value)}
                              rows={2}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none"
                              placeholder="Any additional notes..."
                            />
                          </div>

                          <button
                            onClick={handleResolve}
                            disabled={
                              actionLoading || !resolutionDetails || !resolutionImage
                            }
                            className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            ) : (
                              <>
                                <CheckCircle size={20} />
                                <span>Mark as Resolved</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Action Section - For generic status change */}
                      {actionToTake && actionToTake !== "in_progress" && actionToTake !== "resolved" && (
                        <div className="border-t border-gray-100 pt-6">
                          <h3 className="font-semibold text-gray-900 mb-4">
                            Change Status to {statusConfig[actionToTake]?.label || actionToTake}
                          </h3>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Remarks <span className="text-gray-400">(optional)</span>
                            </label>
                            <textarea
                              value={departmentRemarks}
                              onChange={(e) => setDepartmentRemarks(e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none"
                              placeholder="Add remarks for this status change..."
                            />
                          </div>
                          <button
                            onClick={handleStatusChange}
                            disabled={actionLoading}
                            className="w-full bg-maroon-800 text-white py-3 px-4 rounded-xl font-semibold hover:bg-maroon-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            ) : (
                              <>
                                <CheckCircle size={20} />
                                <span>Apply Status Change</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Show resolution for resolved complaints */}
                {selectedComplaint.status === "resolved" && (
                  <div className="border-t border-gray-100 pt-6 space-y-4">
                    {selectedComplaint.resolution_details && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-sm text-green-700 mb-1">
                          Resolution Details
                        </p>
                        <p className="text-green-900">
                          {selectedComplaint.resolution_details}
                        </p>
                      </div>
                    )}
                    {selectedComplaint.resolution_image_url && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">
                          Resolution Proof
                        </p>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <img
                            src={selectedComplaint.resolution_image_url}
                            alt="Resolution Proof"
                            className="max-h-64 rounded-lg border border-gray-200 mb-2"
                          />
                          <a
                            href={selectedComplaint.resolution_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 text-green-700 hover:text-green-600 text-sm"
                          >
                            <Eye size={16} />
                            <span>View Full Image</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentDashboard;
