import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  User,
  Tag,
  Calendar,
  Building2,
  MessageSquare,
  Loader2,
  Lock
} from 'lucide-react'

const TrackComplaint = () => {
  const { user, userRole, userDepartment } = useAuth()
  const [referenceNumber, setReferenceNumber] = useState('')
  const [complaint, setComplaint] = useState(null)
  const [auditTrail, setAuditTrail] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const statusConfig = {
    submitted: { 
      label: 'Submitted', 
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: FileText,
      description: 'Your feedback has been received and is awaiting verification.'
    },
    verified: { 
      label: 'Verified', 
      color: 'bg-gold-100 text-gold-800 border-gold-200',
      icon: CheckCircle,
      description: 'Your feedback has been verified and assigned to a department.'
    },
    rejected: { 
      label: 'Rejected', 
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
      description: 'Your feedback was not approved. See remarks for details.'
    },
    in_progress: { 
      label: 'In Progress', 
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: Clock,
      description: 'The department is actively working on resolving your feedback.'
    },
    resolved: { 
      label: 'Resolved', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      description: 'Your feedback has been resolved. Thank you for your feedback.'
    },
    closed: {
      label: 'Closed',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: Lock,
      description: 'This feedback has been closed. Thank you for your feedback.'
    },
    disputed: {
      label: 'Disputed',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: AlertCircle,
      description: 'The resolution has been disputed and is under review.'
    },
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    setError('')
    setComplaint(null)
    setAuditTrail([])
    setLoading(true)
    setSearched(true)

    try {
      const normalizedReference = referenceNumber.trim().toUpperCase()
      const isDepartmentStaff = ['department', 'faculty', 'employee'].includes(userRole)

      if (isDepartmentStaff) {
        const [assignedToResult, departmentResult] = await Promise.all([
          supabase
            .from('complaints')
            .select('*')
            .eq('reference_number', normalizedReference)
            .eq('assigned_to', user.id)
            .maybeSingle(),
          supabase
            .from('complaints')
            .select('*')
            .eq('reference_number', normalizedReference)
            .eq('assigned_department', userDepartment)
            .maybeSingle(),
        ])

        const queryErrors = [assignedToResult.error, departmentResult.error].filter(Boolean)
        if (queryErrors.length === 2) throw queryErrors[0]
        const staffComplaint = assignedToResult.data || departmentResult.data

        if (!staffComplaint) {
          setError('No feedback found in your department with this reference number.')
          return
        }

        const { data: staffAuditTrail, error: auditError } = await supabase
          .from('audit_trail')
          .select('*')
          .eq('complaint_id', staffComplaint.id)
          .order('created_at', { ascending: true })

        if (auditError) throw auditError
        setComplaint(staffComplaint)
        setAuditTrail(staffAuditTrail || [])
        return
      }

      const { data, error: fetchError } = await supabase.rpc('get_public_ticket', {
        tracking_reference: normalizedReference,
      })

      if (fetchError) throw fetchError
      if (!data?.complaint) {
        setError('No feedback found with this reference number.')
        return
      }

      setComplaint(data.complaint)
      setAuditTrail(data.auditTrail || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || statusConfig.submitted
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${config.color}`}>
        <Icon size={16} />
        <span>{config.label}</span>
      </span>
    )
  }

  return (
    <div className="min-h-[calc(100vh-200px)] py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-maroon-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={32} className="text-gold-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Track Your Feedback</h1>
          <p className="text-gray-600 mt-2">Enter your reference number to check the status</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Tag size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 transition-all duration-200 outline-none font-mono uppercase"
                placeholder="Enter reference number (e.g., LDCU-XXXXX-XXXX)"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-maroon-800 text-white px-8 py-3 rounded-xl font-semibold hover:bg-maroon-700 focus:ring-4 focus:ring-maroon-200 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Search size={20} />
                  <span>Track</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Complaint Details */}
        {complaint && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Reference Number</p>
                  <p className="text-xl font-bold text-maroon-800 font-mono">{complaint.reference_number}</p>
                </div>
                <StatusBadge status={complaint.status} />
              </div>

              <div className={`p-4 rounded-xl border ${statusConfig[complaint.status]?.color || 'bg-gray-100'}`}>
                <p className="text-sm">{statusConfig[complaint.status]?.description}</p>
              </div>
            </div>

            {/* Complaint Info */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback Details</h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start space-x-3">
                  <User size={20} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Submitted By</p>
                    <p className="font-medium text-gray-900">{complaint.name}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Tag size={20} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium text-gray-900 capitalize">{complaint.category}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Calendar size={20} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date Submitted</p>
                    <p className="font-medium text-gray-900">{formatDate(complaint.created_at)}</p>
                  </div>
                </div>
                {complaint.assigned_department && (
                  <div className="flex items-start space-x-3">
                    <Building2 size={20} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Assigned Department</p>
                      <p className="font-medium text-gray-900 capitalize">{complaint.assigned_department}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-start space-x-3">
                  <MessageSquare size={20} className="text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Description</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{complaint.description}</p>
                  </div>
                </div>
              </div>

              {complaint.resolution_details && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle size={20} className="text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Resolution</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{complaint.resolution_details}</p>
                    </div>
                  </div>
                </div>
              )}

              {complaint.admin_remarks && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle size={20} className="text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Admin Remarks</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{complaint.admin_remarks}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Audit Trail */}
            {auditTrail.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                <div className="space-y-4">
                  {auditTrail.map((entry, index) => (
                    <div key={entry.id} className="flex space-x-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === auditTrail.length - 1 ? 'bg-maroon-800' : 'bg-gray-300'}`}></div>
                        {index < auditTrail.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1"></div>}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-gray-900">{entry.action}</p>
                        <p className="text-sm text-gray-500">{formatDate(entry.created_at)}</p>
                        {entry.details && <p className="text-sm text-gray-600 mt-1">{entry.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {searched && !loading && !complaint && !error && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600">Please check your reference number and try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackComplaint
