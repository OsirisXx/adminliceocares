import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  FileText,
  Search,
  Shield,
  CheckCircle,
  Clock,
  Users,
  Send,
  ImagePlus,
  X,
  Copy,
  User,
  Mail,
  Tag,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

const Home = () => {
  const [complaint, setComplaint] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPersonalDetails, setShowPersonalDetails] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [personalDetails, setPersonalDetails] = useState({
    name: "",
    email: "",
    studentId: "",
    isAnonymous: false,
  });

  const categories = [
    { value: "academic", label: "Academic" },
    { value: "facilities", label: "Facilities" },
    { value: "finance", label: "Finance" },
    { value: "staff", label: "Staff" },
    { value: "security", label: "Security" },
    { value: "other", label: "Other" },
  ];

  const generateReferenceNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LDCU-${timestamp}-${random}`;
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validImages = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Each file must be less than 5MB");
        continue;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please upload only image files");
        continue;
      }
      validImages.push(file);
    }

    setImages((prev) => [...prev, ...validImages]);
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePersonalDetailsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPersonalDetails((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setComplaint("");
    setCategory("");
    setImages([]);
    setReferenceNumber("");
    setShowPersonalDetails(false);
    setShowPopup(false);
    setPersonalDetails({
      name: "",
      email: "",
      studentId: "",
      isAnonymous: false,
    });
  };

  const closePopup = () => {
    setShowPopup(false);
    resetForm();
  };

  const getClientIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  };

  const checkIPRateLimit = async (ipAddress) => {
    if (!ipAddress) return { allowed: true };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("complaint_submissions")
      .select("id")
      .eq("ip_address", ipAddress)
      .gte("created_at", today.toISOString())
      .limit(1);

    if (error) {
      console.error("Rate limit check error:", error);
      return { allowed: true };
    }

    return { allowed: data.length === 0 };
  };

  const recordSubmission = async (ipAddress, complaintId) => {
    if (!ipAddress) return;

    try {
      await supabase.from("complaint_submissions").insert({
        ip_address: ipAddress,
        complaint_id: complaintId,
        user_agent: navigator.userAgent,
      });
    } catch (err) {
      console.error("Error recording submission:", err);
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    setError("");

    if (!complaint.trim()) {
      setError("Please enter your feedback");
      return;
    }
    if (!category) {
      setError("Please select a category");
      return;
    }
    setLoading(true);

    try {
      const ipAddress = await getClientIP();
      const { allowed } = await checkIPRateLimit(ipAddress);

      if (!allowed) {
        setError(
          "You have already submitted a feedback today. Please try again tomorrow."
        );
        setLoading(false);
        return;
      }

      const refNumber = generateReferenceNumber();
      const uploadedUrls = [];

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${refNumber}-${i + 1}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(fileName, file);

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("attachments").getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        }
      }

      const { data: complaintData, error: insertError } = await supabase
        .from("complaints")
        .insert({
          reference_number: refNumber,
          name: personalDetails.isAnonymous
            ? "Anonymous"
            : personalDetails.name || "Anonymous",
          email: personalDetails.email || null,
          student_id: personalDetails.studentId || null,
          category: category,
          description: complaint,
          is_anonymous: personalDetails.isAnonymous || !personalDetails.name,
          attachment_url: uploadedUrls[0] || null,
          status: "submitted",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      await recordSubmission(ipAddress, complaintData?.id);

      setReferenceNumber(refNumber);
      setShowPopup(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: FileText,
      title: "Submit Complaints",
      description:
        "Easily submit your concerns through our streamlined feedback form. Anonymous submissions are welcome.",
      color: "bg-maroon-800",
    },
    {
      icon: Shield,
      title: "Verified Process",
      description:
        "All complaints are verified by the VP Admin to ensure legitimacy before being forwarded to departments.",
      color: "bg-gold-600",
    },
    {
      icon: Clock,
      title: "Track Progress",
      description:
        "Monitor your feedback status in real-time using your unique reference number.",
      color: "bg-maroon-800",
    },
    {
      icon: CheckCircle,
      title: "Resolution Focused",
      description:
        "Dedicated department officers work to resolve your concerns efficiently and effectively.",
      color: "bg-gold-600",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Submit",
      description: "Fill out the feedback form with your concerns",
    },
    {
      number: "02",
      title: "Verify",
      description: "Admin reviews and verifies your feedback",
    },
    {
      number: "03",
      title: "Assign",
      description: "Feedback is forwarded to the relevant department",
    },
    {
      number: "04",
      title: "Resolve",
      description: "Department works on resolution and updates status",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-maroon-800 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold-500 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold-500 rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-maroon-700 px-4 py-2 rounded-full mb-6">
              <Users size={18} className="text-gold-400" />
              <span className="text-sm text-gold-300">
                Liceo Community Portal
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Your Voice <span className="text-gold-400">Matters</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              Liceo Cares is your dedicated platform for submitting and tracking
              feedback. We ensure every concern is heard, verified, and
              resolved efficiently.
            </p>

            {/* Chat-style complaint form */}
            {
              <form
                onSubmit={handleSubmitComplaint}
                className="max-w-2xl mx-auto"
              >
                {/* Error message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-400 rounded-xl text-red-100 text-sm">
                    {error}
                  </div>
                )}

                {/* Complaint textarea */}
                <div
                  className={`backdrop-blur-sm border-2 rounded-2xl p-4 mb-4 transition-all duration-300 ${
                    isFocused
                      ? "bg-white/20 border-gold-400 shadow-lg shadow-gold-500/20"
                      : "bg-white/10 border-white/30"
                  }`}
                >
                  <textarea
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Type your feedback here... What concern would you like to share?"
                    rows={3}
                    className="w-full bg-transparent text-white placeholder-gray-300 focus:outline-none resize-none"
                  />

                  {/* Image previews */}
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/20">
                      {images.map((img, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(img)}
                            alt={`Upload ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                          >
                            <X size={12} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-3 pt-3 border-t border-white/20">
                    <div className="flex items-center justify-between sm:justify-start gap-2 flex-1">
                      {/* Image upload button */}
                      <label className="cursor-pointer p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2">
                        <ImagePlus size={20} className="text-gold-400" />
                        <span className="text-xs text-gray-400">
                          {images.length > 0
                            ? `${images.length} image(s)`
                            : "Add images (optional)"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Category selector */}
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-400 flex-1 sm:flex-none"
                      >
                        <option value="" className="text-gray-900">
                          Category
                        </option>
                        {categories.map((cat) => (
                          <option
                            key={cat.value}
                            value={cat.value}
                            className="text-gray-900"
                          >
                            {cat.label}
                          </option>
                        ))}
                      </select>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={loading || !complaint.trim() || !category}
                        className={`p-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                          complaint.trim() && category
                            ? "bg-gold-400 text-maroon-900 hover:bg-gold-300 shadow-lg shadow-gold-500/30"
                            : "bg-gold-500 text-maroon-900 hover:bg-gold-400"
                        }`}
                      >
                        {loading ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Send size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mt-3">
                  Select a category and click send to submit (images are
                  optional)
                </p>
              </form>
            }

            {/* Track complaint link */}
            <div className="mt-6">
              <Link
                to="/track"
                className="inline-flex items-center space-x-2 text-gold-300 hover:text-gold-400 transition-colors"
              >
                <Search size={18} />
                <span>Already submitted? Track your feedback</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Success Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Close button */}
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Feedback Submitted!
              </h2>
              <p className="text-gray-600 mb-6">
                Your feedback has been received. Save your tracking number
                below.
              </p>

              <div className="bg-maroon-50 border border-maroon-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-maroon-600 mb-2">
                  Your Tracking Number
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg sm:text-2xl font-bold text-maroon-800 font-mono break-all">
                    {referenceNumber}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-maroon-100 rounded-lg transition-colors flex-shrink-0"
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

              {/* Optional personal details section in popup */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden mb-6">
                <button
                  type="button"
                  onClick={() => setShowPersonalDetails(!showPersonalDetails)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm text-gray-700 font-medium">
                    Add additional details (optional)
                  </span>
                  {showPersonalDetails ? (
                    <ChevronUp size={18} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-500" />
                  )}
                </button>

                {showPersonalDetails && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Anonymous toggle */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isAnonymous"
                        checked={personalDetails.isAnonymous}
                        onChange={handlePersonalDetailsChange}
                        className="w-4 h-4 text-maroon-800 border-gray-300 rounded focus:ring-maroon-500"
                      />
                      <EyeOff size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-700">
                        Submit Anonymously
                      </span>
                    </label>

                    {!personalDetails.isAnonymous && (
                      <div className="relative">
                        <User
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          name="name"
                          value={personalDetails.name}
                          onChange={handlePersonalDetailsChange}
                          placeholder="Full Name"
                          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500"
                        />
                      </div>
                    )}

                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="email"
                        name="email"
                        value={personalDetails.email}
                        onChange={handlePersonalDetailsChange}
                        placeholder="Email (for updates)"
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500"
                      />
                    </div>

                    <div className="relative">
                      <Tag
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        name="studentId"
                        value={personalDetails.studentId}
                        onChange={handlePersonalDetailsChange}
                        placeholder="Student/Employee ID"
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  to="/track"
                  className="inline-flex items-center justify-center space-x-2 bg-maroon-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-maroon-700 transition-all"
                >
                  <Search size={18} />
                  <span>Track Your Feedback</span>
                </Link>
                <button
                  onClick={closePopup}
                  className="inline-flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Use <span className="text-maroon-800">Liceo Cares</span>?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our feedback management system is designed to provide a
              transparent and efficient way to address your concerns.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gold-300"
              >
                <div
                  className={`${feature.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}
                >
                  <feature.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It <span className="text-gold-600">Works</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A simple four-step process to get your concerns addressed
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                  <span className="text-5xl font-bold text-maroon-100">
                    {step.number}
                  </span>
                  <h3 className="text-xl font-semibold text-maroon-800 mt-2 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gold-400"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-maroon-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Need to Track Your Feedback?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Already submitted a feedback? Use your tracking number to check the
            status and get updates on your concern.
          </p>
          <Link
            to="/track"
            className="inline-flex items-center space-x-2 bg-gold-500 text-maroon-900 px-8 py-4 rounded-xl font-semibold hover:bg-gold-400 transition-all duration-200 shadow-lg"
          >
            <Search size={20} />
            <span>Track Your Feedback</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
