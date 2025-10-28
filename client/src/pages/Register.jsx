import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser, setUser } from "../features/auth/authSlice";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, ArrowLeft, Check, X } from "lucide-react";
import SDEverse from "../assets/sdeverse.png";
import { toast } from "react-toastify";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordCriteria, setPasswordCriteria] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (e.target.name === "password") {
      const pwd = e.target.value;
      setPasswordCriteria({
        minLength: pwd.length >= 6,
        hasLetter: /[a-zA-Z]/.test(pwd),
        hasNumber: /[0-9]/.test(pwd),
      });
    }

    if (validationErrors[e.target.name]) {
      setValidationErrors({ ...validationErrors, [e.target.name]: "" });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters long";
    } else if (formData.username.length > 20) {
      errors.username = "Username must be less than 20 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = "Username can only contain letters, numbers, and underscores";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(formData.password)) {
      errors.password = "Password must contain at least one letter and one number";
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    dispatch(registerUser(formData));
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/google", {
        token: credentialResponse.credential,
      });

      dispatch(setUser(res.data.user));
      localStorage.setItem("token", res.data.token);
      toast.success("Signed up with Google!");
      navigate("/");
    } catch (err) {
      console.error("Google login error:", err);
      toast.error("Google sign-in failed");
    }
  };

  useEffect(() => {
    if (user) {
      toast.success("Successfully Registered");
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error("Error, please try again");
    }
  }, [error]);

  const formatErrorMessage = (error) => {
    if (!error) return "";
    const errorString = error.message || error.toString();
    if (errorString.includes("E11000") && errorString.includes("username")) {
      return "This username is already taken.";
    }
    if (errorString.includes("E11000") && errorString.includes("email")) {
      return "This email is already registered.";
    }
    return errorString;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-10 max-w-md w-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/30"
      >
        <Link
          to="/"
          className="p-1 rounded-sm border w-6 text-indigo-700 flex items-center hover:bg-indigo-700 hover:text-white "
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="text-center mb-8">
          <motion.div whileHover={{ scale: 1.05 }} className="mx-auto mb-4">
            <img src={SDEverse} alt="SDEverse Logo" className="w-20 h-20 mx-auto object-contain" />
          </motion.div>
          <h2 className="text-3xl font-bold text-indigo-700 mb-2">Create your SDEverse account</h2>
          <p className="text-gray-600">Start your coding journey today</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2"
          >
            <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{formatErrorMessage(error)}</span>
          </motion.div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* username, email, password same as before */}
          {/* (keep your fields code unchanged here) */}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-indigo-200/50 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </motion.button>
        </form>

        {/* 👇 Google Login Button */}
        <div className="my-6 text-center text-gray-500">or</div>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error("Google sign-in failed")}
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </a>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Register;
