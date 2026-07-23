import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  FileText,
  User,
  Mail,
  Tag,
  MessageSquare,
  Paperclip,
  Send,
  CheckCircle,
  AlertCircle,
  Copy,
  EyeOff,
} from "lucide-react";

const SubmitComplaint = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialComplaint = location.state?.complaint || "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    studentId: "",
    category: "",
    description: initialComplaint,
    isAnonymous: false,
  });
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [copied, setCopied] = useState(false);

  const categories = [
    {
      value: "academic",
      label: "Academic",
      description: "Grades, curriculum, professors, classes",
    },
    {
      value: "facilities",
      label: "Facilities",
      description: "Buildings, equipment, maintenance",
    },
    {
      value: "finance",
      label: "Finance",
      description: "Tuition, fees, payments, scholarships",
    },
    {
      value: "staff",
      label: "Staff",
      description: "Administrative staff, services",
    },
    {
      value: "security",
      label: "Security",
      description: "Safety feedback and incident reports",
    },
    { value: "other", label: "Other", description: "General feedback" },
  ];

  const generateReferenceNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("").toUpperCase();
    return `LDCU-${timestamp}-${random}`;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      e.target.value = "";
      return;
    }

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, GIF, etc.)");
      e.target.value = "";
      return;
    }

    setError("");
    setAttachment(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate attachment is provided
    if (!attachment) {
      setError("Please upload an image as evidence for your feedback");
      setLoading(false);
      return;
    }

    try {
      const refNumber = generateReferenceNumber();
      let attachmentUrl = null;

      if (attachment) {
        const fileExt = attachment.name.split(".").pop();
        const fileName = `${refNumber}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(fileName, attachment);

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("attachments").getPublicUrl(fileName);
          attachmentUrl = publicUrl;
        }
      }

      const complaintId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from("complaints")
        .insert({
          id: complaintId,
          reference_number: refNumber,
          name: formData.isAnonymous ? "Anonymous" : formData.name,
          email: formData.email,
          student_id: formData.studentId,
          category: formData.category,
          description: formData.description,
          is_anonymous: formData.isAnonymous,
          attachment_url: attachmentUrl,
          status: "submitted",
        });

      if (insertError) throw insertError;

      setReferenceNumber(refNumber);
      setSuccess(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Feedback Submitted!
            </h2>
            <p className="text-gray-600 mb-6">
              Your feedback has been successfully submitted. Please save your
              reference number to track the status.
            </p>

            <div className="bg-maroon-50 border border-maroon-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-maroon-600 mb-2">Reference Number</p>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl font-bold text-maroon-800 font-mono">
                  {referenceNumber}
                </span>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-maroon-100 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy
                    size={20}
                    className={copied ? "text-green-600" : "text-maroon-600"}
                  />
                </button>
              </div>
              {copied && (
                <p className="text-sm text-green-600 mt-2">
                  Copied to clipboard!
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/track")}
                className="block w-full bg-maroon-800 text-white py-3 px-4 rounded-xl font-semibold hover:bg-maroon-700 transition-all duration-200"
              >
                Track Your Feedback
              </button>
              <button
                onClick={() => navigate("/")}
                className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-maroon-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-gold-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Submit Feedback
          </h1>
          <p className="text-gray-600 mt-2">
            Fill out the form below to submit your feedback
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
              <AlertCircle
                size={20}
                className="text-red-500 flex-shrink-0 mt-0.5"
              />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Anonymous Toggle */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="isAnonymous"
                  checked={formData.isAnonymous}
                  onChange={handleChange}
                  className="w-5 h-5 text-maroon-800 border-gray-300 rounded focus:ring-maroon-500"
                />
                <div className="ml-3 flex items-center space-x-2">
                  <EyeOff size={18} className="text-gray-500" />
                  <span className="font-medium text-gray-700">
                    Submit Anonymously
                  </span>
                </div>
              </label>
              <p className="text-sm text-gray-500 mt-2 ml-8">
                Your name will be hidden from the feedback if checked
              </p>
            </div>

            {/* Name */}
            {!formData.isAnonymous && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={20} className="text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required={!formData.isAnonymous}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 transition-all duration-200 outline-none"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address{" "}
                <span className="text-gray-400">(for updates)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={20} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 transition-all duration-200 outline-none"
                  placeholder="Enter your email (optional)"
                />
              </div>
            </div>

            {/* Student ID */}
            <div>
              <label
                htmlFor="studentId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Student/Employee ID{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Tag size={20} className="text-gray-400" />
                </div>
                <input
                  id="studentId"
                  name="studentId"
                  type="text"
                  value={formData.studentId}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 transition-all duration-200 outline-none"
                  placeholder="Enter your ID number"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <label
                    key={cat.value}
                    className={`relative flex flex-col p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                      formData.category === cat.value
                        ? "border-maroon-500 bg-maroon-50 ring-2 ring-maroon-500"
                        : "border-gray-200 hover:border-maroon-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={formData.category === cat.value}
                      onChange={handleChange}
                      required
                      className="sr-only"
                    />
                    <span
                      className={`font-medium ${
                        formData.category === cat.value
                          ? "text-maroon-800"
                          : "text-gray-700"
                      }`}
                    >
                      {cat.label}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {cat.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute top-3 left-4 pointer-events-none">
                  <MessageSquare size={20} className="text-gray-400" />
                </div>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 transition-all duration-200 outline-none resize-none"
                  placeholder="Please describe your feedback in detail..."
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </p>
            </div>

            {/* Attachment - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence Image <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  id="attachment"
                  required
                />
                <label
                  htmlFor="attachment"
                  className={`flex items-center justify-center space-x-2 w-full py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                    attachment
                      ? "border-green-400 bg-green-50"
                      : "border-gray-300 hover:border-maroon-400 hover:bg-gray-50"
                  }`}
                >
                  <Paperclip
                    size={20}
                    className={attachment ? "text-green-500" : "text-gray-400"}
                  />
                  <span
                    className={attachment ? "text-green-700" : "text-gray-600"}
                  >
                    {attachment
                      ? attachment.name
                      : "Click to upload an image (required, max 5MB)"}
                  </span>
                </label>
              </div>
              {attachment && (
                <div className="mt-3">
                  <img
                    src={URL.createObjectURL(attachment)}
                    alt="Preview"
                    className="max-h-40 rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove image
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Upload an image as evidence (JPG, PNG, GIF - max 5MB)
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-maroon-800 text-white py-4 px-4 rounded-xl font-semibold hover:bg-maroon-700 focus:ring-4 focus:ring-maroon-200 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Send size={20} />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitComplaint;
