import { useState } from "react";
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  FileText,
  X,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  LayoutGrid,
  List,
} from "lucide-react";

const statusConfig = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800" },
  verified: { label: "Verified", color: "bg-gold-100 text-gold-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  in_progress: { label: "In Progress", color: "bg-orange-100 text-orange-800" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800" },
};

const DepartmentsSection = ({
  departments,
  complaints,
  loading,
  searchQuery,
  setSearchQuery,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment,
  onViewComplaint,
}) => {
  const [selectedDept, setSelectedDept] = useState(null);
  const [complaintSearch, setComplaintSearch] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "grid" or "list"

  const getDeptComplaints = (deptCode) => {
    if (!complaints) return [];
    return complaints.filter(
      (c) => c.assigned_department === deptCode || c.category === deptCode
    );
  };

  const filteredComplaints = selectedDept
    ? getDeptComplaints(selectedDept.code).filter(
        (c) =>
          c.reference_number?.toLowerCase().includes(complaintSearch.toLowerCase()) ||
          c.description?.toLowerCase().includes(complaintSearch.toLowerCase())
      )
    : [];
  const filteredDepartments = departments.filter((dept) =>
    dept.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 mt-1">Manage organizational departments</p>
        </div>
        <button
          onClick={onAddDepartment}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-maroon-800 text-white rounded-lg hover:bg-maroon-900 transition-colors font-medium"
        >
          <Plus size={18} />
          Add Department
        </button>
      </div>

      {/* Search and View Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-maroon-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white text-maroon-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Departments Grid/List */}
      {viewMode === "grid" ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.length > 0 ? (
          filteredDepartments.map((dept) => {
            const deptComplaints = getDeptComplaints(dept.code);
            return (
              <div
                key={dept.id}
                onClick={() => setSelectedDept(dept)}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-maroon-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-maroon-100 to-maroon-200 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-maroon-700" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditDepartment(dept); }}
                      className="p-2 text-gray-500 hover:text-maroon-800 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit department"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteDepartment(dept); }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete department"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{dept.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{dept.code || "No code"}</p>
                <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users size={14} />
                    <span>{dept.staff_count || 0} staff</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-maroon-700 font-medium">
                    <FileText size={14} />
                    <span>{deptComplaints.length} complaints</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No departments found</p>
          </div>
        )}
        </div>
      ) : (
        /* List View */
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Staff</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Complaints</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredDepartments.length > 0 ? (
              filteredDepartments.map((dept) => {
                const deptComplaints = getDeptComplaints(dept.code);
                return (
                  <tr
                    key={dept.id}
                    onClick={() => setSelectedDept(dept)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-maroon-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-maroon-700" />
                        </div>
                        <span className="font-medium text-gray-900">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 font-mono">{dept.code || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{dept.staff_count || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-maroon-100 text-maroon-700">
                        {deptComplaints.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditDepartment(dept); }}
                          className="p-2 text-gray-500 hover:text-maroon-800 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteDepartment(dept); }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No departments found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Department Complaints Modal */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDept(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-maroon-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-maroon-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedDept.name}</h2>
                  <p className="text-sm text-gray-500">{getDeptComplaints(selectedDept.code).length} complaints</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDept(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search complaints..."
                  value={complaintSearch}
                  onChange={(e) => setComplaintSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
                />
              </div>
            </div>

            {/* Complaints Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredComplaints.length > 0 ? (
                    filteredComplaints.map((feedback) => (
                      <tr key={complaint.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-maroon-700">
                            {complaint.reference_number}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 capitalize">{complaint.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 truncate max-w-xs" title={complaint.description}>
                            {complaint.description}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[complaint.status]?.color || "bg-gray-100 text-gray-800"}`}>
                            {statusConfig[complaint.status]?.label || complaint.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {complaint.created_at ? new Date(complaint.created_at).toLocaleDateString() : "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No complaints found for this department</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsSection;
