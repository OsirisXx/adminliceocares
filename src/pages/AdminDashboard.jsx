import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
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
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
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
  const [showStatusChangeSection, setShowStatusChangeSection] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [viewMode, setViewMode] = useState("expanded");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [columnCount, setColumnCount] = useState(1);
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

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComplaints(data || []);
    } catch (err) {
      console.error("Error fetching concerns:", err);
    } finally {
      setLoading(false);
    }
  };

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
        action: "Concern Verified",
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
      alert("Failed to approve concern");
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
        action: "Concern Rejected",
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
      alert("Failed to reject concern");
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

      // Also send to additional email if provided
      if (
        selectedComplaint.additional_email &&
        selectedComplaint.additional_email !== selectedComplaint.email
      ) {
        try {
          const emailResult = await sendTicketStatusChangedEmail({
            to: selectedComplaint.additional_email,
            referenceNumber: selectedComplaint.reference_number,
            oldStatus:
              statusLabels[selectedComplaint.status] ||
              selectedComplaint.status,
            newStatus: statusLabels[newStatus] || newStatus,
            remarks: remarks,
          });
          console.log("Additional email sent result:", emailResult);
        } catch (emailErr) {
          console.error("Error sending additional email:", emailErr);
        }
      }

      setShowModal(false);
      setSelectedComplaint(null);
      setSelectedDepartment("");
      setRemarks("");
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

  const filteredComplaints = complaints
    .filter((complaint) => {
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
    { label: "Total", value: stats.total, accent: "bg-gray-700", valueClass: "text-gray-950" },
    { label: "Pending", value: stats.submitted, accent: "bg-blue-500", valueClass: "text-blue-700" },
    { label: "Verified", value: stats.verified, accent: "bg-gold-500", valueClass: "text-gold-700" },
    { label: "In progress", value: stats.inProgress, accent: "bg-orange-500", valueClass: "text-orange-700" },
    { label: "Backlog", value: stats.backlog, accent: "bg-purple-500", valueClass: "text-purple-700" },
    { label: "Resolved", value: stats.resolved, accent: "bg-green-500", valueClass: "text-green-700" },
    { label: "Closed", value: stats.closed, accent: "bg-gray-400", valueClass: "text-gray-700" },
    { label: "Disputed", value: stats.disputed, accent: "bg-amber-500", valueClass: "text-amber-700" },
    { label: "Rejected", value: stats.rejected, accent: "bg-red-500", valueClass: "text-red-700" },
  ];

  return (
    <div id="overview" className="min-h-[calc(100vh-200px)] scroll-mt-20 bg-[#f7f7f8] px-4 py-8 sm:px-6 lg:px-8 lg:scroll-mt-8">
      <div className="mx-auto max-w-[1440px]">
        {/* Workspace header */}
        <header className="mb-7 flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-maroon-800 shadow-sm">
              <Shield size={21} className="text-gold-400" />
            </div>
            <div>
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-maroon-700">Administration</p>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Review, verify, and route incoming concerns.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Concern queue
            </span>
            <button
              type="button"
              onClick={fetchComplaints}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-maroon-300 hover:bg-maroon-50 hover:text-maroon-800"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </header>

        {/* Queue summary */}
        <section aria-label="Concern status summary" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          {statCards.map(({ label, value, accent, valueClass }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-maroon-200"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
              <p className="truncate pl-1 text-xs font-medium text-gray-500">{label}</p>
              <p className={`pl-1 pt-1 text-2xl font-semibold tracking-tight ${valueClass}`}>{value}</p>
            </div>
          ))}
        </section>

        {/* Complaints Trend Area Chart */}
        <div id="analytics" className="scroll-mt-20 mb-8 rounded-lg border border-gray-200 bg-white shadow-sm lg:scroll-mt-8">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Complaints Overview
              </h3>
              <p className="text-sm text-gray-500">
                Showing feedback statistics by status
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
                        name: "Submitted",
                        count: filteredComplaints.filter(
                          (c) => c.status === "submitted"
                        ).length,
                        fill: "#3B82F6",
                      },
                      {
                        name: "Verified",
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
            <div className="flex w-full items-start gap-2 text-sm">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 leading-none font-medium text-gray-900">
                  Total: {stats.total} complaints{" "}
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-gray-500 flex flex-wrap items-center gap-2 leading-none text-xs">
                  <span className="text-blue-600">
                    {stats.submitted} submitted
                  </span>{" "}
                  •
                  <span className="text-yellow-600">
                    {stats.verified} verified
                  </span>{" "}
                  •
                  <span className="text-orange-600">
                    {stats.inProgress} in progress
                  </span>{" "}
                  •
                  <span className="text-purple-600">
                    {stats.backlog || 0} backlog
                  </span>{" "}
                  •
                  <span className="text-green-600">
                    {stats.resolved} resolved
                  </span>{" "}
                  •<span className="text-gray-600">{stats.closed} closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div id="concerns" className="scroll-mt-20 bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6 lg:scroll-mt-8">
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
                <option value="submitted">Pending</option>
                <option value="verified">Verified</option>
                <option value="in_progress">In Progress</option>
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
                onClick={fetchComplaints}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Layout & Sort Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
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

              {/* View Mode Toggle */}
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

              {/* Column Count Selector */}
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

              {/* Pagination Toggle */}
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

              {/* Items Per Page - only show when pagination is enabled */}
              {paginationEnabled && (
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
                {paginationEnabled
                  ? `Showing ${paginatedComplaints.length} of ${filteredComplaints.length}`
                  : `${filteredComplaints.length}`}{" "}
                concern{filteredComplaints.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Complaints Newsfeed */}
        <div
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
              <p className="text-gray-500 mt-4">Loading concerns...</p>
            </div>
          ) : paginatedComplaints.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
              <FileText size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No concerns found</p>
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
                          onClick={() =>
                            navigate(`/ticket/${complaint.reference_number}`)
                          }
                          className={`flex-1 inline-flex items-center justify-center space-x-1 ${
                            isNarrowColumn ? "p-2" : "px-3 py-2"
                          } border border-maroon-800 text-maroon-800 rounded-lg hover:bg-maroon-50 transition-colors text-xs font-medium`}
                          title="View Activity"
                        >
                          <MessageSquare size={isNarrowColumn ? 14 : 16} />
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
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      currentPage === pageNum
                        ? "bg-maroon-800 text-white"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
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
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Concern Details
                  </h2>
                  <p className="text-sm text-gray-500 font-mono">
                    {selectedComplaint.reference_number}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedComplaint(null);
                    setSelectedDepartment("");
                    setRemarks("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                              (!selectedDepartment && !selectedStaff)
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
