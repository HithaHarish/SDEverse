const asyncHandler = require("express-async-handler");
const User = require("../models/user.model");
const OTP = require("../models/otp.model");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../config/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");

// Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ---------------- Validation Helpers ----------------
const validateEmail = (email) => {
  if (typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 100;
};

const validateUsername = (username) => {
  if (typeof username !== "string") return false;
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username.trim());
};

const validatePassword = (password) => {
  if (typeof password !== "string") return false;
  return (
    password.length >= 6 &&
    password.length <= 128 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
};

const sanitizeInput = (input) => {
  if (typeof input !== "string") return "";
  return input.trim().replace(/^\$/, "");
};

// ---------------- Google OAuth ----------------
const googleAuth = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: name,
        email,
        password: "",
        profilePic: picture,
      });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ success: true, token: jwtToken, user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: "Google login failed" });
  }
});

// ---------------- Register ----------------
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const sanitizedUsername = sanitizeInput(username);
  const sanitizedEmail = sanitizeInput(email);

  if (!validateUsername(sanitizedUsername))
    throw new Error("Invalid username format");

  if (!validateEmail(sanitizedEmail))
    throw new Error("Invalid email address");

  if (!validatePassword(password))
    throw new Error("Weak password");

  const [emailExists, usernameExists] = await Promise.all([
    User.findOne({ email: sanitizedEmail.toLowerCase() }),
    User.findOne({ username: sanitizedUsername }),
  ]);

  if (emailExists) throw new Error("Email already registered");
  if (usernameExists) throw new Error("Username already taken");

  const user = await User.create({
    username: sanitizedUsername,
    email: sanitizedEmail.toLowerCase(),
    password,
  });

  const userObj = user.toObject();
  delete userObj.password;

  res.status(201).json({
    ...userObj,
    token: generateToken(user._id),
  });
});

// ---------------- Login ----------------
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new Error("Please provide email and password");

  const sanitizedEmail = sanitizeInput(email);

  if (!validateEmail(sanitizedEmail))
    throw new Error("Invalid email address");

  const user = await User.findOne({ email: sanitizedEmail.toLowerCase() });

  if (user && (await user.matchPassword(password))) {
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ ...userObj, token: generateToken(user._id) });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// ---------------- Get Current User ----------------
const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const user = req.user.toObject();
  delete user.password;

  res.status(200).json(user);
});

// ---------------- Forgot Password ----------------
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new Error("Please provide an email");

  const sanitizedEmail = sanitizeInput(email);

  if (!validateEmail(sanitizedEmail))
    throw new Error("Invalid email address");

  const user = await User.findOne({ email: sanitizedEmail.toLowerCase() });

  if (!user) {
    res.status(200).json({ message: "If account exists, OTP sent", success: true });
    return;
  }

  const otpCode = Math.floor(100000 + Math.random() * 999999);
  await OTP.create({ email: sanitizedEmail.toLowerCase(), code: otpCode });

  await sendEmail(
    sanitizedEmail,
    "Password Reset OTP",
    `Your OTP code is ${otpCode}. Valid for 5 minutes.`
  );

  res.status(200).json({ message: "OTP sent", success: true });
});

// ---------------- Validate OTP ----------------
const validateOTP = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const sanitizedEmail = sanitizeInput(email);
  const otpRecord = await OTP.findOne({ email: sanitizedEmail, code: Number(code) });

  if (!otpRecord || Date.now() > otpRecord.createdAt.getTime() + 5 * 60 * 1000)
    throw new Error("Invalid or expired OTP");

  res.status(200).json({ message: "OTP validated", success: true });
});

// ---------------- Reset Password ----------------
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword)
    throw new Error("Provide both passwords");

  const sanitizedEmail = sanitizeInput(email);
  const otpRecord = await OTP.findOne({ email: sanitizedEmail, code: Number(code) });

  if (!otpRecord || Date.now() > otpRecord.createdAt.getTime() + 5 * 60 * 1000)
    throw new Error("Invalid or expired OTP");

  if (newPassword !== confirmPassword)
    throw new Error("Passwords do not match");

  if (!validatePassword(newPassword))
    throw new Error("Weak password");

  const user = await User.findOne({ email: sanitizedEmail.toLowerCase() });
  if (!user) throw new Error("User not found");

  user.password = newPassword;
  await user.save();

  res.status(200).json({ message: "Password reset successfully", success: true });
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  validateOTP,
  resetPassword,
  googleAuth,
};
