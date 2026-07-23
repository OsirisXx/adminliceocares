import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { notifyTicketOpened } from "../lib/notificationEvents";
import { useAuth } from "../contexts/AuthContext";
import {
  sendTicketVerifiedEmail,
  sendTicketRejectedEmail,
  sendTicketStatusChangedEmail,
} from "../lib/resend";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Search,
  Filter,
  Eye,
  X,
  AlertCircle,
  Building2,
  RefreshCw,
  ChevronDown,
  Calendar,
  Tag,
  User,
  Image,
  MessageSquare,
  Edit3,
  Lock,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  Minimize2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Columns,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [activityCounts, setActivityCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [departmentStaff, setDepartmentStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const viewMode = "compact";
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const paginationEnabled = true;
  const columnCount = 1;
  const [departments, setDepartments] = useState([]);
  const [chartTimeRange, setChartTimeRange] = useState("all");

  useEffect(() => {
    if (!location.hash) return undefined;

    const timer = window.setTimeout(() => {
      document
        .getElementById(location.hash.slice(1))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

  // Fetch departments from database
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from("departments")
          .select("id, name, code")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;

        const formattedDepts = (data || []).map((dept) => ({
          value: dept.code,
          label: dept.name,
        }));
        setDepartments(formattedDepts);
      } catch (err) {
        console.error("Error fetching departments:", err);
        // Fallback to empty array
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, []);

  // Fetch staff when department is selected
  useEffect(() => {
    const fetchDepartmentStaff = async () => {
      if (!selectedDepartment) {
        setDepartmentStaff([]);
        setSelectedStaff("");
        return;
      }

      setStaffLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, email, role")
          .eq("department", selectedDepartment)
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
  }, [selectedDepartment]);

  const statusConfig = {
    submitted: {
      label: "Submitted",
      color: "bg-blue-100 text-blue-800",
      icon: FileText,
    },
    verified: {
      label: "Verified",
      color: "bg-gold-100 text-gold-800",
      icon: CheckCircle,
    },
    rejected: {
      label: "Rejected",
      color: "bg-red-100 text-red-800",
      icon: XCircle,
    },
    in_progress: {
      label: "In Progress",
      color: "bg-orange-100 text-orange-800",
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
      icon: Lock,
    },
    disputed: {
      label: "Disputed",
      color: "bg-amber-100 text-amber-800",
      icon: AlertCircle,
    },
    backlog: {
      label: "Backlog",
      color: "bg-purple-100 text-purple-800",
      icon: Clock,
    },
  };

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setActivityCounts({});
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const loadedComplaints = data || [];
      setComplaints(loadedComplaints);

      const complaintIds = loadedComplaints.map(({ id }) => id);
      if (!complaintIds.length) return;

      const { data: unreadNotifications, error: notificationError } = await supabase
        .from("system_notifications")
        .select("reference_id")
        .eq("is_read", false)
        .in("reference_id", complaintIds);

      if (notificationError) throw notificationError;

      const counts = {};
      (unreadNotifications || []).forEach(({ reference_id: complaintId }) => {
        counts[complaintId] = (counts[complaintId] || 0) + 1;
      });
      setActivityCounts(counts);
    } catch (err) {
      console.error("Error fetching concerns:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleApprove = async () => {
    if (!selectedDepartment) {
      alert("Please select a department");
      return;
    }

    if (!selectedStaff) {
      alert("Please select a staff member to assign");
      return;
    }

    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("complaints")
        .update({
          status: "verified",
          assigned_department: selectedDepartment,
          assigned_to: selectedStaff,
          admin_remarks: remarks,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", selectedComplaint.id);

      if (updateError) throw updateError;

      const staffName =
        departmentStaff.find((s) => s.value === selectedStaff)?.label ||
        "Staff";

      await supabase.from("audit_trail").insert({
        complaint_id: selectedComplaint.id,
        action: "Feedback Verified",
        performed_by: user.id,
        details: `Assigned to ${
          departments.find((d) => d.value === selectedDepartment)?.label
        } - ${staffName}. ${remarks ? `Remarks: ${remarks}` : ""}`,
      });

      // Send email notification if user provided email
      if (selectedComplaint.email) {
        const departmentLabel =
          departments.find((d) => d.value === selectedDepartment)?.label ||
          selectedDepartment;
        await sendTicketVerifiedEmail({
          to: selectedComplaint.email,
          referenceNumber: selectedComplaint.reference_number,
          department: departmentLabel,
          adminRemarks: remarks,
        });
      }

      setShowModal(false);
      setSelectedComplaint(null);
      setSelectedDepartment("");
      setSelectedStaff("");
      setRemarks("");
      fetchComplaints();
    } catch (err) {
      console.error("Error approving concern:", err);
      alert("Failed to approve feedback");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("complaints")
        .update({
          status: "rejected",
          admin_remarks: remarks,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", selectedComplaint.id);

      if (updateError) throw updateError;

      await supabase.from("audit_trail").insert({
        complaint_id: selectedComplaint.id,
        action: "Feedback Rejected",
        performed_by: user.id,
        details: `Reason: ${remarks}`,
      });

      // Send email notification if user provided email
      if (selectedComplaint.email) {
        await sendTicketRejectedEmail({
          to: selectedComplaint.email,
          referenceNumber: selectedComplaint.reference_number,
          reason: remarks,
        });
      }

      setShowModal(false);
      setSelectedComplaint(null);
      setRemarks("");
      fetchComplaints();
    } catch (err) {
      console.error("Error rejecting concern:", err);
      alert("Failed to reject feedback");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) {
      alert("Please select a new status");
      return;
    }

    setActionLoading(true);
    try {
      const updateData = {
        status: newStatus,
        admin_remarks: remarks || selectedComplaint.admin_remarks,
      };

      // If changing to verified, require department
      if (
        newStatus === "verified" &&
        !selectedComplaint.assigned_department &&
        !selectedDepartment
      ) {
        alert("Please select a department for verified status");
        setActionLoading(false);
        return;
      }

      if (newStatus === "verified" && selectedDepartment) {
        updateData.assigned_department = selectedDepartment;
      }

      const { error: updateError } = await supabase
        .from("complaints")
        .update(updateData)
        .eq("id", selectedComplaint.id);

      if (updateError) throw updateError;

      const statusLabels = {
        submitted: "Submitted",
        verified: "Verified",
        rejected: "Rejected",
        in_progress: "In Progress",
        backlog: "Backlog",
        resolved: "Resolved",
        closed: "Closed",
        disputed: "Disputed",
      };

      // Insert audit trail entry
      const { error: auditError } = await supabase.from("audit_trail").insert({
        complaint_id: selectedComplaint.id,
        action: `Status Changed to ${statusLabels[newStatus] || newStatus}`,
        performed_by: user.id,
        details: `Admin changed status from ${
          statusLabels[selectedComplaint.status] || selectedComplaint.status
        } to ${statusLabels[newStatus] || newStatus}${
          remarks ? `. Remarks: ${remarks}` : ""
        }`,
      });

      if (auditError) {
        console.error("Error inserting audit trail:", auditError);
      }

      // Send email notification if user provided email
      if (selectedComplaint.email) {
        try {
          const emailResult = await sendTicketStatusChangedEmail({
            to: selectedComplaint.email,
            referenceNumber: selectedComplaint.reference_number,
            oldStatus:
              statusLabels[selectedComplaint.status] ||
              selectedComplaint.status,
            newStatus: statusLabels[newStatus] || newStatus,
            remarks: remarks,
          });
          console.log("Email sent result:", emailResult);
        } catch (emailErr) {
          console.error("Error sending email:", emailErr);
        }
      }

      setShowModal(false);
      setSelectedComplaint(null);
      setSelectedDepartment("");
      setRemarks("");
      setNewStatus("");
      fetchComplaints();
    } catch (err) {
      console.error("Error changing status:", err);
      alert("Failed to change status");
    } finally {
      setActionLoading(false);
    }
  };

  const openTicket = (complaint) => {
    setActivityCounts((previous) => {
      if (!previous[complaint.id]) return previous;
      const next = { ...previous };
      delete next[complaint.id];
      return next;
    });
    notifyTicketOpened(complaint);
    navigate(`/ticket/${complaint.reference_number}`);
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

  const filteredComplaints = complaints
    .filter((complaint) => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const searchableFields = [
        complaint.reference_number,
        complaint.name,
        complaint.category,
        complaint.description,
      ];
      const matchesSearch =
        !normalizedSearch ||
        searchableFields.some((value) =>
          String(value || "").toLowerCase().includes(normalizedSearch)
        );
      const matchesStatus =
        filterStatus === "all" || complaint.status === filterStatus;
      const matchesCategory =
        filterCategory === "all" || complaint.category === filterCategory;
      const matchesDate = isWithinDateRange(complaint.created_at);

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = paginationEnabled
    ? filteredComplaints.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : filteredComplaints;

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
    submitted: complaints.filter((c) => c.status === "submitted").length,
    verified: complaints.filter((c) => c.status === "verified").length,
    inProgress: complaints.filter((c) => c.status === "in_progress").length,
    backlog: complaints.filter((c) => c.status === "backlog").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    closed: complaints.filter((c) => c.status === "closed").length,
    disputed: complaints.filter((c) => c.status === "disputed").length,
    rejected: complaints.filter((c) => c.status === "rejected").length,
  };

  const statCards = [
    {
      label: "Needs review",
      value: stats.submitted,
      helper: "New submissions awaiting triage",
      accent: "bg-blue-500",
      valueClass: "text-gray-950",
    },
    {
      label: "Active cases",
      value: stats.verified + stats.inProgress + stats.backlog,
      helper: "Verified, in progress, or backlog",
      accent: "bg-gold-600",
      valueClass: "text-gray-950",
    },
    {
      label: "Completed",
      value: stats.resolved + stats.closed,
      helper: "Resolved or formally closed",
      accent: "bg-green-500",
      valueClass: "text-gray-950",
    },
    {
      label: "Total received",
      value: stats.total,
      helper: "All feedback items in the system",
      accent: "bg-maroon-800",
      valueClass: "text-gray-950",
    },
  ];

  const statusSummary = [
    { label: "Submitted", value: stats.submitted, dot: "bg-blue-500" },
    { label: "Verified", value: stats.verified, dot: "bg-gold-600" },
    { label: "In progress", value: stats.inProgress, dot: "bg-orange-500" },
    { label: "Backlog", value: stats.backlog, dot: "bg-purple-500" },
    { label: "Resolved", value: stats.resolved, dot: "bg-green-500" },
    { label: "Closed", value: stats.closed, dot: "bg-gray-400" },
    { label: "Disputed", value: stats.disputed, dot: "bg-amber-500" },
    { label: "Rejected", value: stats.rejected, dot: "bg-red-500" },
  ];

  const chartRangeDays = {
    "1d": 1,
    "7d": 7,
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
  };
  const chartRangeLabels = {
    "1d": "the last 24 hours",
    "7d": "the last 7 days",
    "1m": "the last 30 days",
    "3m": "the last 3 months",
    "6m": "the last 6 months",
    "1y": "the last year",
    all: "all time",
  };
  const chartCutoff = chartRangeDays[chartTimeRange]
    ? new Date(Date.now() - chartRangeDays[chartTimeRange] * 24 * 60 * 60 * 1000)
    : null;
  const chartComplaints = complaints.filter((complaint) => {
    const createdAt = new Date(complaint.created_at);
    return !Number.isNaN(createdAt.getTime()) && (!chartCutoff || createdAt >= chartCutoff);
  });
  const chartTotal = chartComplaints.length;
  const isHourlyChart = chartTimeRange === "1d";
  const isMonthlyChart = ["3m", "6m", "1y", "all"].includes(chartTimeRange);
  const chartDateLabelOptions = isHourlyChart
    ? { hour: "numeric", minute: "2-digit" }
    : isMonthlyChart
      ? { month: "short", year: "numeric" }
      : { month: "short", day: "numeric" };
  const chartBuckets = new Map();

  chartComplaints.forEach((complaint) => {
    const bucketDate = new Date(complaint.created_at);

    if (isHourlyChart) {
      bucketDate.setMinutes(0, 0, 0);
    } else if (isMonthlyChart) {
      bucketDate.setDate(1);
      bucketDate.setHours(0, 0, 0, 0);
    } else {
      bucketDate.setHours(0, 0, 0, 0);
    }

    const timestamp = bucketDate.getTime();
    const bucket = chartBuckets.get(timestamp) || {
      date: bucketDate.toLocaleDateString("en-US", chartDateLabelOptions),
      timestamp,
      count: 0,
    };
    bucket.count += 1;
    chartBuckets.set(timestamp, bucket);
  });

  const chartData = [...chartBuckets.values()].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div id="overview" className="min-h-screen scroll-mt-20 bg-[#f8f8f7] px-4 py-6 sm:px-6 lg:px-8 lg:scroll-mt-8">
      <div className="mx-auto max-w-[1480px]">
        {/* Workspace header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
              <span>Liceo Cares</span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-gray-700">Administration</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-[28px]">Overview</h1>
            <p className="mt-1 text-sm text-gray-500">Monitor intake, review new feedback, and keep cases moving.</p>
          </div>
          <button
            type="button"
            onClick={fetchComplaints}
            className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2 sm:self-auto"
          >
            <RefreshCw size={15} />
            Refresh data
          </button>
        </header>

        {/* Operational summary */}
        <section aria-label="Feedback operations summary" className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="grid divide-y divide-gray-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
            {statCards.map(({ label, value, helper, accent, valueClass }) => (
              <div key={label} className="relative px-5 py-4 sm:px-6">
                <span className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} aria-hidden="true" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <p className={`mt-1 text-3xl font-semibold tracking-tight ${valueClass}`}>{value}</p>
                  </div>
                  <span className={`mt-1 h-2 w-2 rounded-full ${accent}`} aria-hidden="true" />
                </div>
                <p className="mt-2 text-xs text-gray-500">{helper}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Complaint volume trend */}
          <section
            id="analytics"
            aria-labelledby="complaint-volume-title"
            className="scroll-mt-20 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:scroll-mt-8"
          >
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 id="complaint-volume-title" className="text-lg font-semibold text-gray-900">
                Feedback over time
              </h3>
              <p className="text-sm text-gray-500">
                New feedback received by date. Current status totals are shown above.
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
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
                  type="button"
                  aria-pressed={chartTimeRange === range.value}
                  onClick={() => setChartTimeRange(range.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    chartTimeRange === range.value
                      ? "bg-maroon-800 text-white shadow-sm"
                      : "text-gray-600 hover:bg-white hover:text-gray-900"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 pt-0">
            <div className="h-72" role="img" aria-label="New feedback received over time">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -20, right: 12, top: 10, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={28}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickCount={5}
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      labelFormatter={(label) => `Received: ${label}`}
                      formatter={(value) => [
                        `${value} ${value === 1 ? "feedback item" : "feedback items"}`,
                        "New feedback",
                      ]}
                    />
                    <Area
                      dataKey="count"
                      type="monotone"
                      fill="#7C2D2D"
                      fillOpacity={0.4}
                      stroke="#7C2D2D"
                      strokeWidth={2}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      name="New feedback"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">No feedback received</p>
                    <p className="mt-1 text-xs text-gray-500">There is no feedback from {chartRangeLabels[chartTimeRange]}.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-gray-100 px-6 pb-6 pt-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-gray-900">
              {chartTotal} {chartTotal === 1 ? "feedback item" : "feedback items"} received {chartRangeLabels[chartTimeRange]}
            </span>
            <span>Hover a point to see the exact date and total.</span>
          </div>
          </section>

          <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="status-summary-title">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 id="status-summary-title" className="text-sm font-semibold text-gray-900">Queue by status</h2>
              <p className="mt-1 text-xs text-gray-500">Current distribution across the full queue.</p>
            </div>
            <div className="divide-y divide-gray-100 px-5">
              {statusSummary.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${item.dot}`} aria-hidden="true" />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="tabular-nums text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section id="concerns" className="mb-4 scroll-mt-20 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:scroll-mt-8">
          <div className="flex flex-col gap-1 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Feedback queue</h2>
              <p className="mt-0.5 text-xs text-gray-500">Search, review, and route submitted feedback.</p>
            </div>
            <span className="mt-2 text-xs font-medium text-gray-500 sm:mt-0">
              {filteredComplaints.length} result{filteredComplaints.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reference, person, category, or description"
                aria-label="Search feedback"
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-maroon-700 focus:outline-none focus:ring-2 focus:ring-maroon-700/20"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 flex items-center gap-1.5">
                <Filter size={15} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">Filter</span>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="submitted">Pending</option>
                <option value="verified">Verified</option>
                <option value="in_progress">In Progress</option>
                <option value="backlog">Backlog</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="disputed">Disputed</option>
                <option value="rejected">Rejected</option>
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
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                  setFilterCategory("all");
                  setFilterDateRange("all");
                }}
                className="h-9 rounded-md px-3 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                Clear filters
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown size={15} className="text-gray-400" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  aria-label="Sort feedback"
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-maroon-700 focus:outline-none focus:ring-2 focus:ring-maroon-700/20"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                aria-label="Feedback items per page"
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-maroon-700 focus:outline-none focus:ring-2 focus:ring-maroon-700/20"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <span className="ml-auto text-xs text-gray-500">
                Showing {paginatedComplaints.length} of {filteredComplaints.length}{" "}
                {filteredComplaints.length === 1 ? "feedback item" : "feedback items"}
              </span>
            </div>
          </div>
        </section>

        {/* Complaints Newsfeed */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_180px_88px] items-center gap-4 border-b border-gray-200 bg-gray-50/80 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 lg:grid">
            <span>Concern</span>
            <span>Status</span>
            <span>Received</span>
            <span className="text-right">Actions</span>
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-maroon-800 border-t-transparent"></div>
              <p className="mt-3 text-sm text-gray-500">Loading concerns...</p>
            </div>
          ) : paginatedComplaints.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <FileText size={19} className="text-gray-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700">No concerns found</p>
              <p className="mt-1 text-xs text-gray-500">Try changing or clearing the current filters.</p>
            </div>
          ) : (
            paginatedComplaints.map((complaint) => {
              const status = statusConfig[complaint.status];
              const StatusIcon = status?.icon || FileText;

              if (viewMode === "compact") {
                return (
                  <div
                    key={complaint.id}
                    className="border-b border-gray-100 bg-white px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-50/80 sm:px-5"
                  >
                    {columnCount === 1 ? (
                      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_120px_180px_88px] lg:items-center lg:gap-4">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-medium text-maroon-800">
                              {complaint.reference_number}
                            </span>
                            <span className="text-[11px] capitalize text-gray-500">{complaint.category}</span>
                            {complaint.attachment_url && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                                <Image size={11} /> Attachment
                              </span>
                            )}
                          </div>
                          <p className="truncate text-sm font-medium text-gray-900">{complaint.name}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{complaint.description}</p>
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${status?.color}`}
                          >
                            <StatusIcon size={12} />
                            <span>{status?.label}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={13} className="shrink-0 text-gray-400" />
                          <span>{formatDate(complaint.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => openTicket(complaint)}
                            className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700"
                            title={`View activity${activityCounts[complaint.id] ? ` (${activityCounts[complaint.id]})` : ""}`}
                            aria-label={`View activity for ${complaint.reference_number}${activityCounts[complaint.id] ? `, ${activityCounts[complaint.id]} unread notifications` : ""}`}
                          >
                            <MessageSquare size={15} />
                            {activityCounts[complaint.id] > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-maroon-800 px-1 text-[10px] font-semibold leading-none text-white">
                                {activityCounts[complaint.id] > 99 ? "99+" : activityCounts[complaint.id]}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setShowModal(true);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-maroon-800 text-white hover:bg-maroon-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-1"
                            title="Review concern"
                            aria-label={`Review ${complaint.reference_number}`}
                          >
                            <Eye size={15} />
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
                            onClick={() => openTicket(complaint)}
                            className="relative flex-1 p-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-xs flex items-center justify-center gap-1"
                            title="View Activity"
                          >
                            <span className="relative inline-flex">
                              <MessageSquare size={14} />
                              {activityCounts[complaint.id] > 0 && (
                                <span className="absolute -top-2 -right-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-maroon-800 px-1 text-[9px] font-semibold leading-none text-white">
                                  {activityCounts[complaint.id] > 99 ? "99+" : activityCounts[complaint.id]}
                                </span>
                              )}
                            </span>
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
                      <span className={isNarrowColumn ? "text-[10px]" : ""}>
                        {formatDate(complaint.created_at)}
                      </span>
                    </div>

                    {/* Description Preview */}
                    <div className={isNarrowColumn ? "mb-2" : "mb-4"}>
                      <p
                        className={`text-gray-700 ${
                          isNarrowColumn
                            ? "line-clamp-2 text-xs"
                            : isMultiColumn
                            ? "line-clamp-2 text-sm"
                            : "line-clamp-2 text-sm sm:text-base"
                        }`}
                      >
                        {complaint.description}
                      </p>
                    </div>

                    {/* Attachment indicator */}
                    {complaint.attachment_url && !isNarrowColumn && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
                        <Image size={14} />
                        <span className="text-xs">Has attachment</span>
                      </div>
                    )}

                    {/* Assigned Department (if verified) */}
                    {complaint.assigned_department && (
                      <div
                        className={`flex items-center space-x-2 text-gold-700 bg-gold-50 px-2 py-1.5 rounded-lg ${
                          isNarrowColumn ? "text-[10px]" : "text-xs"
                        }`}
                      >
                        <Building2 size={isNarrowColumn ? 12 : 14} />
                        <span className="truncate">
                          {isNarrowColumn ? (
                            complaint.assigned_department.replace("_", " ")
                          ) : (
                            <>
                              Assigned:{" "}
                              <strong className="capitalize">
                                {complaint.assigned_department.replace(
                                  "_",
                                  " "
                                )}
                              </strong>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div
                    className={`${
                      isNarrowColumn ? "px-3 py-2" : "px-4 sm:px-6 py-3"
                    } bg-gray-50 border-t border-gray-100 mt-auto`}
                  >
                    <div
                      className={`flex ${
                        isMultiColumn
                          ? "flex-col"
                          : "flex-col sm:flex-row items-start sm:items-center justify-between"
                      } gap-2`}
                    >
                      {!isNarrowColumn && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <MessageSquare size={14} />
                          <span>Concern #{complaint.id?.slice(0, 8)}</span>
                        </div>
                      )}
                      <div
                        className={`flex gap-2 ${
                          isMultiColumn ? "w-full" : "w-full sm:w-auto"
                        }`}
                      >
                        <button
                          onClick={() => openTicket(complaint)}
                          className={`relative flex-1 inline-flex items-center justify-center space-x-1 ${
                            isNarrowColumn ? "p-2" : "px-3 py-2"
                          } border border-maroon-800 text-maroon-800 rounded-lg hover:bg-maroon-50 transition-colors text-xs font-medium`}
                          title="View Activity"
                        >
                          <span className="relative inline-flex">
                            <MessageSquare size={isNarrowColumn ? 14 : 16} />
                            {activityCounts[complaint.id] > 0 && (
                              <span className="absolute -top-2 -right-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-maroon-800 px-1 text-[9px] font-semibold leading-none text-white">
                                {activityCounts[complaint.id] > 99 ? "99+" : activityCounts[complaint.id]}
                              </span>
                            )}
                          </span>
                          {!isNarrowColumn && <span>Activity</span>}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            setShowModal(true);
                          }}
                          className={`flex-1 inline-flex items-center justify-center space-x-1 ${
                            isNarrowColumn ? "p-2" : "px-3 py-2"
                          } bg-maroon-800 text-white rounded-lg hover:bg-maroon-700 transition-colors text-xs font-medium`}
                          title="View Details"
                        >
                          <Eye size={isNarrowColumn ? 14 : 16} />
                          {!isNarrowColumn && <span>Details</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {paginationEnabled && totalPages > 1 && (
          <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Concern queue pagination">
            <p className="hidden text-xs text-gray-500 sm:block">Page {currentPage} of {totalPages}</p>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                let pageNumber;
                if (totalPages <= 5) pageNumber = index + 1;
                else if (currentPage <= 3) pageNumber = index + 1;
                else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + index;
                else pageNumber = currentPage - 2 + index;

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    aria-current={currentPage === pageNumber ? "page" : undefined}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium ${
                      currentPage === pageNumber
                        ? "bg-maroon-800 text-white"
                        : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        )}

        {/* Modal */}
        {showModal && selectedComplaint && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-gray-950/45 backdrop-blur-[1px]"
            onClick={() => {
              setShowModal(false);
              setSelectedComplaint(null);
              setSelectedDepartment("");
              setSelectedStaff("");
              setRemarks("");
              setNewStatus("");
            }}
            role="presentation"
          >
            <div
              className="flex h-full w-full max-w-5xl flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="concern-drawer-title"
            >
              <div className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${statusConfig[selectedComplaint.status]?.color}`}>
                      {statusConfig[selectedComplaint.status]?.label || selectedComplaint.status}
                    </span>
                    <span className="font-mono text-xs text-gray-500">{selectedComplaint.reference_number}</span>
                  </div>
                  <h2 id="concern-drawer-title" className="text-lg font-semibold tracking-tight text-gray-950">Review concern</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedComplaint(null);
                    setSelectedDepartment("");
                    setRemarks("");
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700"
                  aria-label="Close concern details"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              {/* Modal Body - 2 Columns */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Column: Information */}
                  <div className="flex-1 space-y-6">
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
                        <p className="font-medium text-gray-900 break-all">
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

                    {/* Attachments */}
                    {selectedComplaint.attachment_url && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Attachments</p>
                        <div className="grid sm:grid-cols-2 gap-4">
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
                  </div>

                  {/* Right Column: Actions */}
                  <div className="lg:w-80 flex-shrink-0 space-y-6">
                    {/* Status Update Block */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
                      <div className="space-y-4">
                        <select
                          value={newStatus || selectedComplaint.status}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white font-medium ${
                            statusConfig[newStatus || selectedComplaint.status]?.color
                          }`}
                        >
                          <option value="submitted">Submitted</option>
                          <option value="verified">Verified</option>
                          <option value="in_progress">In Progress</option>
                          <option value="backlog">Backlog</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                          <option value="disputed">Disputed</option>
                          <option value="rejected">Rejected</option>
                        </select>

                        {/* Show department selection if changing to verified and no department assigned */}
                        {newStatus === "verified" &&
                          !selectedComplaint.assigned_department && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assign Department
                              </label>
                              <select
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none bg-white"
                              >
                                <option value="">Select a department...</option>
                                {departments.map((dept) => (
                                  <option key={dept.value} value={dept.value}>
                                    {dept.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                        {newStatus && newStatus !== selectedComplaint.status && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Remarks <span className="text-gray-400">(optional)</span>
                            </label>
                            <textarea
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              rows={2}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none"
                              placeholder="Add remarks..."
                            />
                            <button
                              onClick={handleStatusChange}
                              disabled={
                                actionLoading ||
                                (newStatus === "verified" &&
                                  !selectedComplaint.assigned_department &&
                                  !selectedDepartment)
                              }
                              className="w-full mt-3 px-4 py-2.5 bg-maroon-800 text-white rounded-xl font-medium hover:bg-maroon-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              ) : (
                                <>
                                  <CheckCircle size={16} />
                                  <span>Update</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Section - Only for submitted complaints */}
                    {selectedComplaint.status === "submitted" && (
                      <div className="bg-maroon-50 rounded-xl p-4 border border-maroon-100">
                        <h3 className="font-semibold text-maroon-900 mb-4">
                          Assign & Forward
                        </h3>

                        {/* Department Selection */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-maroon-800 mb-2">
                            Department
                          </label>
                          <div className="relative">
                            <Building2
                              size={20}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <select
                              value={selectedDepartment}
                              onChange={(e) => {
                                setSelectedDepartment(e.target.value);
                                setSelectedStaff("");
                              }}
                              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none appearance-none bg-white"
                            >
                              <option value="">Select department...</option>
                              {departments.map((dept) => (
                                <option key={dept.value} value={dept.value}>
                                  {dept.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={20}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            />
                          </div>
                        </div>

                        {/* Staff Selection */}
                        {selectedDepartment && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-maroon-800 mb-2">
                              Staff Member
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
                                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none appearance-none bg-white disabled:opacity-50"
                              >
                                <option value="">
                                  {staffLoading ? "Loading..." : "Select staff..."}
                                </option>
                                {departmentStaff.map((staff) => (
                                  <option key={staff.value} value={staff.value}>
                                    {staff.label} ({staff.role})
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                size={20}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                              />
                            </div>
                            {departmentStaff.length === 0 && !staffLoading && (
                              <p className="text-sm text-amber-600 mt-2">
                                No staff found.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Remarks */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-maroon-800 mb-2">
                            Remarks <span className="text-maroon-600/60">(optional)</span>
                          </label>
                          <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none"
                            placeholder="Add notes..."
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-3">
                          <button
                            onClick={handleApprove}
                            disabled={
                              actionLoading ||
                              !selectedDepartment ||
                              !selectedStaff
                            }
                            className="w-full px-4 py-3 bg-maroon-800 text-white rounded-xl font-medium hover:bg-maroon-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            ) : (
                              <>
                                <CheckCircle size={20} />
                                <span>Approve & Assign</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleReject}
                            disabled={actionLoading}
                            className="w-full px-4 py-3 bg-white border-2 border-red-500 text-red-500 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                          >
                            <XCircle size={20} />
                            <span>Reject Complaint</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Show assigned department for verified complaints */}
                {selectedComplaint.assigned_department && (
                  <div className="border-t border-gray-100 pt-6">
                    <div className="bg-gold-50 border border-gold-200 rounded-xl p-4">
                      <p className="text-sm text-gold-700 mb-1">
                        Assigned Department
                      </p>
                      <p className="font-semibold text-gold-900 capitalize">
                        {departments.find(
                          (d) =>
                            d.value === selectedComplaint.assigned_department
                        )?.label || selectedComplaint.assigned_department}
                      </p>
                    </div>
                  </div>
                )}

                {/* Show dispute reason for disputed complaints */}
                {selectedComplaint.status === "disputed" &&
                  selectedComplaint.dispute_reason && (
                    <div className="border-t border-gray-100 pt-6">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm text-amber-700 mb-1 font-medium">
                          Dispute Reason
                        </p>
                        <p className="text-amber-900">
                          {selectedComplaint.dispute_reason}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Show resolution for resolved complaints */}
                {(selectedComplaint.resolution_details ||
                  selectedComplaint.resolution_image_url) && (
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
                        <div className="bg-green-50 rounded-xl p-4">
                          <img
                            src={selectedComplaint.resolution_image_url}
                            alt="Resolution Proof"
                            className="max-h-64 rounded-lg border border-green-200 mb-2"
                          />
                          <a
                            href={selectedComplaint.resolution_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 text-green-700 hover:text-green-600 text-sm"
                          >
                            <Eye size={18} />
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

export default AdminDashboard;
