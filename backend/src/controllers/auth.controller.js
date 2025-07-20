import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import sendEmail from "../lib/sendEmail.js";
import generatedOtp from "../lib/generatedOtp.js";
import forgotPasswordTemplate from "../lib/forgotPasswordTemplate.js";
import bcrypt from "bcryptjs";

export async function signup(req, res) {
  const { email, password, fullName } = req.body;

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists, please use a diffrent one" });
    }

    const idx = Math.floor(Math.random() * 100) + 1; // generate a num between 1-100
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    const newUser = await User.create({
      email,
      fullName,
      password,
      profilePic: randomAvatar,
    });

    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: newUser.fullName,
        ...(newUser.profilePic && !newUser.profilePic.startsWith('data:') && { image: newUser.profilePic }),
      });
      console.log(`Stream user created for ${newUser.fullName}`);
    } catch (error) {
      console.log("Error creating Stream user:", error);
    }

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true, // prevent XSS attacks,
      sameSite: "strict", // prevent CSRF attacks
      secure: process.env.NODE_ENV === "production",
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.log("Error in signup controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true, // prevent XSS attacks,
      sameSite: "strict", // prevent CSRF attacks
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  res.clearCookie("jwt");
  res.status(200).json({ success: true, message: "Logout successful" });
}

export async function onboard(req, res) {
  try {
    const userId = req.user._id;

    const { fullName, bio, location } = req.body;

    if (!fullName || !bio || !location) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !location && "location",
        ].filter(Boolean),
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...req.body,
        isOnboarded: true,
      },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        ...(updatedUser.profilePic && !updatedUser.profilePic.startsWith('data:') && { image: updatedUser.profilePic }),
      });
      console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
    } catch (streamError) {
      console.log("Error updating Stream user during onboarding:", streamError.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email not found", error: true, success: false });
    }
    const otp = generatedOtp().toString();
    const expireTime = Date.now() + 60 * 60 * 1000; // 1 hour
    user.resetPasswordOtp = otp;
    user.resetPasswordExpiry = new Date(expireTime);
    await user.save();
    let emailError = null;
    try {
      await sendEmail({
        sendTo: email,
        subject: "Streamify Password Reset OTP",
        html: forgotPasswordTemplate({ name: user.fullName, otp }),
      });
    } catch (err) {
      emailError = err.message || err;
    }
    return res.json({
      message: emailError ? "OTP generated, but email not sent (see popup)" : "Check your email for the OTP.",
      error: !!emailError,
      success: true,
      otp: otp // for dev/testing only
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false });
  }
}

export async function verifyResetOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Provide email and otp.", error: true, success: false });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email not found", error: true, success: false });
    }
    const now = new Date();
    if (!user.resetPasswordOtp || !user.resetPasswordExpiry || user.resetPasswordExpiry < now) {
      return res.status(400).json({ message: "OTP is expired or not set.", error: true, success: false });
    }
    if (otp !== user.resetPasswordOtp) {
      return res.status(400).json({ message: "Invalid OTP.", error: true, success: false });
    }
    user.resetPasswordOtp = null;
    user.resetPasswordExpiry = null;
    await user.save();
    return res.json({ message: "OTP verified successfully.", error: false, success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Provide email, newPassword, and confirmPassword.", error: true, success: false });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email not found", error: true, success: false });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match.", error: true, success: false });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return res.json({ message: "Password updated successfully.", error: false, success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false });
  }
}
